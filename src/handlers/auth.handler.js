const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateToken } = require('#src/helpers/token');
const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { sendPasswordResetEmail } = require('#src/helpers/email');

const SALT_ROUNDS = 12;
// How long a reset link stays valid after it's requested.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
// Always the same wording whether or not the email actually matched an
// account — telling someone "no account with that email" would let anyone
// probe the users table for registered addresses one guess at a time.
const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password.";

class AuthHandler {
    // Generic, timing-safe-ish response for any login failure so we never reveal
    // whether it was the identifier or the password that was wrong.
    static invalidCredentials() {
      return { message: 'Invalid email/username or password' };
    }

    static async login(request){
        try {
          const { username, email, password } = request.body || {};

          if(!password || (!username && !email)){
            return { message: 'email/username and password are required' };
          }

          let user;
          if(username){
            user = await db(table_names.users).where({ username }).first();
          } else {
            user = await db(table_names.users).where({ email }).first();
          }

          if(!user || user.deleted){
            return this.invalidCredentials();
          }

          const passwordMatches = await bcrypt.compare(password, user.password);
          if(!passwordMatches){
            return this.invalidCredentials();
          }

          delete user.password;
          // Never let these leave the server — not in the JSON response, and
          // not baked into the JWT payload either (generateToken signs
          // whatever's left on `user`).
          delete user.reset_token_hash;
          delete user.reset_token_expires;
          return {
            data: {
              user,
              token: generateToken(user, process.env.SIGNKEY)
            }
          };
        } catch (error) {
            console.error('login: ', error)
          return { error }
        }
    }

    static async authLogin(request) {
      try {
        const { user_name, password } = request.body || {};

        if(!user_name || !password){
          return { message: 'user_name and password are required' };
        }

        const user = await db(table_names.admin_users).where({ user_name }).first();

        if(!user || user.deleted){
          return this.invalidCredentials();
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if(!passwordMatches){
          return this.invalidCredentials();
        }

        delete user.password;
        return {
          data: {
            user,
            token: generateToken(user, process.env.ADMIN_KEY)
          }
        };
      } catch (error) {
        console.error('authLogin: ', error);
        return { error }
      }
    }

    // Step 1 of the reset flow: given an email, if it belongs to a real
    // account, generate a one-time token, store only its hash (so a DB leak
    // never hands out working reset links), and email the raw token as a
    // link. The response is identical either way — see RESET_REQUESTED_MESSAGE.
    static async requestPasswordReset(request) {
      try {
        const { email } = request.body || {};
        if (!email) {
          return { message: 'email is required' };
        }

        const user = await db(table_names.users).where({ email }).first();

        if (user && !user.deleted) {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

          await db(table_names.users).where({ id: user.id }).update({
            reset_token_hash: tokenHash,
            reset_token_expires: expires,
          });

          const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
          const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

          const sent = await sendPasswordResetEmail(email, resetUrl);
          if (!sent) {
            // Configuration/delivery problem, not a user-facing error — the
            // token is stored either way, and we log this so it's visible
            // in Railway's logs without leaking anything to the client.
            console.error('requestPasswordReset: email not sent for', email);
          }
        }

        return { data: { message: RESET_REQUESTED_MESSAGE } };
      } catch (error) {
        console.error('requestPasswordReset: ', error);
        return { error };
      }
    }

    // Step 2: the raw token from the emailed link, plus a new password.
    static async resetPassword(request) {
      try {
        const { email, token, password } = request.body || {};
        if (!email || !token || !password) {
          return { message: 'email, token and password are required' };
        }
        if (String(password).length < 8) {
          return { message: 'password must be at least 8 characters' };
        }

        const user = await db(table_names.users).where({ email }).first();
        const invalidOrExpired = { message: 'This reset link is invalid or has expired. Please request a new one.' };

        if (!user || user.deleted || !user.reset_token_hash || !user.reset_token_expires) {
          return invalidOrExpired;
        }
        if (new Date(user.reset_token_expires).getTime() < Date.now()) {
          return invalidOrExpired;
        }

        const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
        // Constant-time comparison so a failed attempt can't be timed to
        // learn the correct hash byte-by-byte.
        const providedBuf = Buffer.from(tokenHash);
        const storedBuf = Buffer.from(user.reset_token_hash);
        const matches =
          providedBuf.length === storedBuf.length && crypto.timingSafeEqual(providedBuf, storedBuf);
        if (!matches) {
          return invalidOrExpired;
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        await db(table_names.users).where({ id: user.id }).update({
          password: password_hash,
          reset_token_hash: null,
          reset_token_expires: null,
        });

        return { data: { message: 'Password updated — you can now log in with your new password.' } };
      } catch (error) {
        console.error('resetPassword: ', error);
        return { error };
      }
    }
}

module.exports = AuthHandler