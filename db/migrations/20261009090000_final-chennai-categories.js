const { table_names } = require("#src/globals/constants");

// Ashish's genuinely final 10 categories for the Chennai launch, replacing
// the previous 10 (which were a step on the way there). Same pattern as the
// prior flatten-categories migration: wipe categories (cascades to
// sub_category, which cascades to provider_subcategories) and recreate with
// one subcategory per category, same name, so the rest of the app (search
// filters, provider "services" chips, signup tag-picker) needs no changes.
const NEW_CATEGORIES = [
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
];

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
    await knex(table_names.categories).del();

    for (const cat of NEW_CATEGORIES) {
        const [id] = await knex(table_names.categories).insert({
            name: cat.name,
            color: cat.color,
            created: knex.fn.now(),
        });
        await knex(table_names.sub_category).insert({
            name: cat.name,
            category_id: id,
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
    // Best-effort only — does not restore the previous 10 or any provider
    // associations that existed under them.
    await knex(table_names.categories).del();
};
