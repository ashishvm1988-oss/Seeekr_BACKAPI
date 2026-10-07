const { table_names } = require("#src/globals/constants");

// A deploy-ordering bug let the OLD seed file (db/seeds/01_categories.js,
// before it was corrected to the 10 flat Chennai categories) re-run and
// re-insert these 8 broad categories after the flatten-categories migration
// had already replaced them. This cleans up that stray duplicate data —
// deleting a category cascades (ON DELETE CASCADE) to its sub_category rows
// and any provider_subcategories under them.
const STRAY_NAMES = [
    'Design & Art',
    'Events & Entertainment',
    'Business & Consulting',
    'Health & Wellbeing',
    'Personal Services',
    'Pet Services',
    'Upcoming Entrepreneurs',
    'Lessons & LifeSkills',
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
