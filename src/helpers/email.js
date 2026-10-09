// Transactional email (password resets, chat message notifications, and
// booking status changes) goes out through Resend's HTTP API. We send a
// plain POST with the built-in fetch (Node 18+) rather than pulling in a
// client library — it's one endpoint and a bearer token, no SDK needed, and
// it avoids another package.json/package-lock.json pair to keep in sync.
//
// Every setting is read from env so this works without a code change if the
// sending domain or key ever changes, and NONE of these are in .env.example
// (which the app's env loader treats as required-at-boot) — email should be
// a soft dependency. A deploy that hasn't configured it yet should still
// boot and still let people log in, chat, and book slots (the request just
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

// Low-level send, shared by every email below. Never throws — a delivery
// failure here is always treated as "the email just didn't go out" rather
// than an error that should bubble up, since no caller (sending a chat
// message, requesting a booking, responding to one) should ever turn into a
// failed request just because Resend is down or misconfigured.
async function sendRaw({ to, subject, text, html, logLabel }) {
  if (!isEmailConfigured()) {
    console.warn(`email: Resend not configured (RESEND_API_KEY/RESEND_FROM) — skipping ${logLabel} to`, to);
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: [to], subject, text, html }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`email.${logLabel}: Resend responded ${response.status} — ${body}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`email.${logLabel}: `, error);
    return false;
  }
}

// Shared button markup for every HTML email below.
function button(url, label) {
  return (
    `<p><a href="${url}" style="display:inline-block;padding:10px 20px;` +
    `background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none;` +
    `font-weight:600;">${label}</a></p>`
  );
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

  return sendRaw({
    to: toEmail,
    subject: 'Reset your Seeekr password',
    text:
      `We received a request to reset your Seeekr password.\n\n` +
      `Reset it here (this link expires in 30 minutes):\n${resetUrl}\n\n` +
      `If you requested this more than once, only the link in the most recent email will work — earlier links stop working as soon as a new one is requested.\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>We received a request to reset your Seeekr password.</p>` +
      button(resetUrl, 'Reset password') +
      `<p>Or paste this link into your browser (expires in 30 minutes):<br>` +
      `<a href="${resetUrl}">${resetUrl}</a></p>` +
      `<p style="color:#6b6f80;font-size:13px;">If you requested this more than once, only the link in the ` +
      `most recent email will work — earlier links stop working as soon as a new one is requested.</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
    logLabel: 'sendPasswordResetEmail',
  });
}

/**
 * "You have a new message" — sent at most once per unread streak (the
 * caller, messages.create, only calls this for the first message in a
 * conversation the receiver hasn't already been notified about), so a
 * back-and-forth burst of messages while the receiver is away produces one
 * email, not one per message.
 */
async function sendNewMessageEmail(toEmail, { senderName, preview, chatUrl }) {
  return sendRaw({
    to: toEmail,
    subject: `New message from ${senderName} on Seeekr`,
    text:
      `${senderName} sent you a message on Seeekr:\n\n` +
      `"${preview}"\n\n` +
      `Reply here: ${chatUrl}\n\n` +
      `You're getting this because you have an unread message — once you open the conversation, you won't get another email until a new one arrives after that.`,
    html:
      `<p><strong>${senderName}</strong> sent you a message on Seeekr:</p>` +
      `<p style="padding:12px 16px;background:#f4f5fa;border-radius:10px;color:#14172b;">${preview}</p>` +
      button(chatUrl, 'Reply') +
      `<p style="color:#6b6f80;font-size:13px;">You're getting this because you have an unread message — once you open the conversation, you won't get another email until a new one arrives after that.</p>`,
    logLabel: 'sendNewMessageEmail',
  });
}

/** "A customer requested a booking" — sent to the provider. */
async function sendBookingRequestEmail(toEmail, { customerName, dateLabel, timeLabel, accountUrl }) {
  return sendRaw({
    to: toEmail,
    subject: 'New booking request on Seeekr',
    text:
      `${customerName} requested a booking with you on Seeekr for ${dateLabel} at ${timeLabel}.\n\n` +
      `Accept or decline it here: ${accountUrl}`,
    html:
      `<p><strong>${customerName}</strong> requested a booking with you on Seeekr for ` +
      `<strong>${dateLabel} at ${timeLabel}</strong>.</p>` +
      button(accountUrl, 'Review request'),
    logLabel: 'sendBookingRequestEmail',
  });
}

/** "Your booking was confirmed/declined" — sent to the customer. */
async function sendBookingResponseEmail(toEmail, { providerName, dateLabel, timeLabel, status, accountUrl }) {
  const confirmed = status === 'confirmed';
  return sendRaw({
    to: toEmail,
    subject: confirmed ? 'Your Seeekr booking is confirmed' : 'Your Seeekr booking request was declined',
    text: confirmed
      ? `${providerName} confirmed your booking for ${dateLabel} at ${timeLabel}.\n\nView it here: ${accountUrl}`
      : `${providerName} wasn't able to accept your booking request for ${dateLabel} at ${timeLabel}. You can pick another slot here: ${accountUrl}`,
    html: confirmed
      ? `<p><strong>${providerName}</strong> confirmed your booking for <strong>${dateLabel} at ${timeLabel}</strong>.</p>${button(accountUrl, 'View booking')}`
      : `<p><strong>${providerName}</strong> wasn't able to accept your booking request for <strong>${dateLabel} at ${timeLabel}</strong>.</p>${button(accountUrl, 'Pick another slot')}`,
    logLabel: 'sendBookingResponseEmail',
  });
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendNewMessageEmail,
  sendBookingRequestEmail,
  sendBookingResponseEmail,
};
