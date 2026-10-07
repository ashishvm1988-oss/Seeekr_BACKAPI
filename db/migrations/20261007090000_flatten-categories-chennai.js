const { table_names } = require("#src/globals/constants");

// Replaces the original broad "Design & Art" / "Business & Consulting"-style
// taxonomy with 10 flat, specific-profession categories for the Chennai
// co-working launch. There is no longer a meaningful category -> subcategory
// drill-down on the site: clicking a category now goes straight to its
// provider list. We keep the existing categories/sub_category/
// provider_subcategories schema rather than introducing a new one — each
// category gets exactly one subcategory with the same name, so search
// filtering (category_id / sub_category_id), the "services" chips on
// provider cards, and the signup services tag-picker all keep working
// completely unmodified.
const NEW_CATEGORIES = [
    { name: 'Personal Trainers', color: '#F97316' },
    { name: 'Physiotherapists', color: '#14B8A6' },
    { name: 'Yoga Instructors', color: '#8B5CF6' },
    { name: 'Nannies & Babysitters', color: '#EC4899' },
    { name: 'Movers & Packers', color: '#F59E0B' },
    { name: 'Interior Designers', color: '#6366F1' },
    { name: 'Event Planners', color: '#22C55E' },
    { name: 'Salon & Grooming at Home', color: '#EF4444' },
    { name: 'Mental Health Counsellors', color: '#0EA5E9' },
    { name: 'Financial Advisors', color: '#EAB308' },
];

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
    // Deleting categories cascades (ON DELETE CASCADE) to sub_category, which
    // cascades to provider_subcategories — any provider's service tags under
    // the old taxonomy are cleared. This is expected: the old categories
    // (Design & Art, Graphic Designer, Financial Advisors under Business &
    // Consulting, etc.) are being fully replaced ahead of the real 40-50
    // provider onboarding for Chennai, so there's no data worth preserving.
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
    // Best-effort only — does not restore the original 8-category taxonomy
    // or any provider associations that existed under it.
    await knex(table_names.categories).del();
};
