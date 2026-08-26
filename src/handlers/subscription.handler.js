const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

// Backs the Account screen's "your plan" card: 6 months free, then ₹1000/mo.
// Read-only for now — no payment gateway is wired up, so there is nothing to
// create/update here yet. Every provider gets a row at signup via
// startTrialSubscription(); customers never have one.
class SubscriptionHandler {
  static async me(request) {
    try {
      const subscription = await db(table_names.subscriptions)
        .where({ user_id: request.user.id })
        .first();
      return { data: subscription || null };
    } catch (error) {
      console.error('subscription.me: ', error);
      return { error };
    }
  }
}

module.exports = SubscriptionHandler;
