const nodemailer = require('nodemailer');

// Transactional email (currently just password resets) goes out over SMTP —
// Zoho Mail by default, since that's already hosted on the domain. Every
// setting is read from env so this works with any SMTP provider without a
// code change, and NONE of these are in .env.example / required-at-boot:
// email should be a soft dependency. A store that hasn't configured it yet
// should still boot and still let people log in and reset passwords (the
// request just won't actually deliver an email) rather than crash.
//
// Required env vars once you're ready to send real emails:
//   SMTP_HOST   e.g. smtp.zoho.in (or smtp.zoho.com outside India)
//   SMTP_PORT   465 for implicit TLS (recommended), 587 for STARTTLS
//   SMTP_USER   the mailbox to send from, e.g. no-reply@seeekr.com
//   SMTP_PASS   an app-specific password generated in Zoho Mail's security
//               settings for this mailbox — NOT the mailbox's normal login
//               password.
//   SMTP_FROM   optional "Display Name <address>" to show as the sender;
//               falls back to SMTP_USER.

let cachedTransporter = null;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) !== 587, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

/**
 * Sends the "reset your password" email. Never throws — a delivery failure
 * here shouldn't turn into a 500 for the user, since the forgot-password
 * endpoint always responds with the same generic message either way (see
 * auth.handler.js). Returns true/false so the caller can log the outcome.
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('email: SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — skipping send to', toEmail);
    // Local/dev convenience only: with no SMTP configured there's no other
    // way to get the reset link, so print it so the flow is still testable.
    if (process.env.NODE_ENV === 'dev') {
      console.log(`email: (dev) reset link for ${toEmail}: ${resetUrl}`);
    }
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
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
    });
    return true;
  } catch (error) {
    console.error('email.sendPasswordResetEmail: ', error);
    return false;
  }
}

module.exports = { isEmailConfigured, sendPasswordResetEmail };
