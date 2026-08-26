const bcrypt = require('bcrypt');
const { generateToken } = require('#src/helpers/token');
const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

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
}

module.exports = AuthHandler