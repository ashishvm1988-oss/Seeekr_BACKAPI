// Transactional email (currently just password resets) goes out through
// Resend's HTTP API. We send a plain POST with the built-in fetch (Node 18+)
// rather than pulling in a client library — it's one endpoint and a bearer
// token, no SDK needed, and it avoids another package.json/package-lock.json
// pair to keep in sync.
//
// Every setting is read from env so this works without a code change if the
// sending domain or key ever changes, and NONE of these are in .env.example
// (which the app's env loader treats as required-at-boot) — email should be
// a soft dependency. A deploy that hasn't configured it yet should still
// boot and still let people log in and reset passwords (the request just
// won't actually deliver an email) rather than crash.
//
// Required env vars once you're ready to send real emails:
//   RESEND_API_KEY   API key from the Resend dashboard (Settings > API Keys)
//   RESEND_FROM      "Display Name <address>" to send from, e.g.
//                     "Seeekr <contact@seeekr.com>" — the address's domain
//                     must be a verified sending domain in Resend.
//
// Why Resend instead of the Zoho SMTP setup this used to use: Railway blocks
// outbound SMTP ports (25/465/587) on anything below its Pro plan, so SMTP
// delivery from this app was silently failing (ETIMEDOUT at the connection
// stage, before auth even ran). Resend sends over plain HTTPS, so it works
// on every Railway plan.

const RESEND_API_URL = 'https://api.resend.com/emails';

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/**
 * Sends the "reset your password" email. Never throws — a delivery failure
 * here shouldn't turn into a 500 for the user, since the forgot-password
 * endpoint always responds with the same generic message either way (see
 * auth.handler.js). Returns true/false so the caller can log the outcome.
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!isEmailConfigured()) {
    console.warn('email: Resend not configured (RESEND_API_KEY/RESEND_FROM) — skipping send to', toEmail);
    // Local/dev convenience only: with no key configured there's no other
    // way to get the reset link, so print it so the flow is still testable.
    if (process.env.NODE_ENV === 'dev') {
      console.log(`email: (dev) reset link for ${toEmail}: ${resetUrl}`);
    }
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [toEmail],
        subject: 'Reset your Seeekr password',
        text:
          `We received a request to reset your Seeekr password.\n\n` +
          `Reset it here (this link expires in 30 minutes):\n${resetUrl}\n\n` +
          `If you didn't request this, you can safely ignore this email.`,
        html:
          `<p>We received a request to reset your Seeekr password.</p>` +
          `<p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;` +
          `background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;` +
          `font-weight:600;">Reset password</a></p>` +
          `<p>Or paste this link into your browser (expires in 30 minutes):<br>` +
          `<a href="${resetUrl}">${resetUrl}</a></p>` +
          `<p>If you didn't request this, you can safely ignore this email.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`email.sendPasswordResetEmail: Resend responded ${response.status} — ${body}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('email.sendPasswordResetEmail: ', error);
    return false;
  }
}

module.exports = { isEmailConfigured, sendPasswordResetEmail };
