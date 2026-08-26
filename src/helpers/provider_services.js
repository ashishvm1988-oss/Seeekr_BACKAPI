const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

/**
 * Replaces a provider's full set of offered subcategories with the given
 * list (delete-then-insert inside a transaction, since this is small,
 * infrequent data — a provider editing their listed services, not a
 * high-frequency write path).
 */
async function syncProviderServices(userId, subCategoryIds) {
  const ids = [...new Set(subCategoryIds.map(Number).filter(Number.isFinite))];

  await db.transaction(async trx => {
    await trx(table_names.provider_subcategories).where({ user_id: userId }).del();
    if (ids.length) {
      await trx(table_names.provider_subcategories).insert(
        ids.map(sub_category_id => ({ user_id: userId, sub_category_id }))
      );
    }
  });
}

module.exports = { syncProviderServices };
