const { table_names } = require("#src/globals/constants");

// Final flat, specific-profession taxonomy for the Chennai co-working
// launch (see migration 20261009090000_final-chennai-categories.js). Each
// category has exactly one subcategory with the same name — there's no
// broad-category drill-down any more, so a fresh/local DB seeded from
// scratch should match what the migration leaves production in.
const TAXONOMY = [
    { name: 'Accountants', color: '#EAB308' },
    { name: 'Legal Advisors', color: '#334155' },
    { name: 'Interior Designers', color: '#6366F1' },
    { name: 'Tutors', color: '#3B82F6' },
    { name: 'Personal Trainers', color: '#F97316' },
    { name: 'Event Planners', color: '#22C55E' },
    { name: 'Yoga Instructors', color: '#8B5CF6' },
    { name: 'Physiotherapists', color: '#14B8A6' },
    { name: 'Nutritionists', color: '#84CC16' },
    { name: 'Wellness Counsellors', color: '#EC4899' },
].map(cat => ({ ...cat, subcategories: [cat.name] }));

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function(knex) {
    // Idempotent: safe to re-run. Skips instead of duplicating if a category
    // with the same name already exists.
    for (const cat of TAXONOMY) {
        let category = await knex(table_names.categories).where({ name: cat.name }).first();
        if (!category) {
            const [id] = await knex(table_names.categories).insert({
                name: cat.name,
                color: cat.color,
                created: knex.fn.now()
            });
            category = { id };
        }

        for (const subName of cat.subcategories) {
            const existingSub = await knex(table_names.sub_category)
                .where({ name: subName, category_id: category.id }).first();
            if (!existingSub) {
                await knex(table_names.sub_category).insert({
                    name: subName,
                    category_id: category.id
                });
            }
        }
    }
};
