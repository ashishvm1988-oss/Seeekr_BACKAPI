const { table_names, subscription_status } = require('#src/globals/constants');
const db = require('#src/helpers/db');

const TRIAL_MONTHS = 6;

/**
 * Starts a provider's 6-months-free trial. No payment gateway is wired up —
 * this only records when the trial ends so a later job (or the profile
 * screen) can tell a provider "your free period ends on <date>" and, once a
 * gateway is connected, know who's due to start being billed.
 */
async function startTrialSubscription(userId) {
  const trialEndsAt = new Date();
  trialEndsAt.setMonth(trialEndsAt.getMonth() + TRIAL_MONTHS);

  const existing = await db(table_names.subscriptions).where({ user_id: userId }).first();
  if (existing) return existing;

  const [id] = await db(table_names.subscriptions).insert({
    user_id: userId,
    status: subscription_status.trial,
    trial_ends_at: trialEndsAt,
    amount_inr: 1000,
    created: new Date()
  });
  return db(table_names.subscriptions).where({ id }).first();
}

module.exports = { startTrialSubscription, TRIAL_MONTHS };
