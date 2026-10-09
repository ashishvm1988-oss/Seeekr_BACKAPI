const { table_names } = require("#src/globals/constants");

// Same deploy-ordering race as the prior cleanup migration
// (20261007100000_cleanup-stray-old-categories.js): the migration commit and
// the seed-file commit landed as two separate Railway deploys, so the
// in-between deploy ran the OLD seed content (previous 10 categories) right
// after the new migration had just replaced the table. That re-inserted the
// 5 previous-taxonomy categories that aren't in the new final 10. Deleting a
// category cascades (ON DELETE CASCADE) to its sub_category rows and any
// provider_subcategories under them.
const STRAY_NAMES = [
    'Nannies & Babysitters',
    'Movers & Packers',
    'Salon & Grooming at Home',
    'Mental Health Counsellors',
    'Financial Advisors',
];

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
    await knex(table_names.categories).whereIn('name', STRAY_NAMES).del();
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function () {
    // Not reversible — these were stray duplicate rows, not meaningful data.
};
