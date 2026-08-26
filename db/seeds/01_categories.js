const { table_names } = require("#src/globals/constants");

// Taxonomy pulled from the Figma wireframes ("Design & Art", "Events &
// Entertainment", "Pet Services" subcategory lists were fully shown; the
// others were top-level only in the designs, so their subcategories below
// are a reasonable starting set — expect to refine with the client once
// real provider signups start). Explicitly includes the four categories
// named as launch priorities: lawyers, accountants, dog walking, music
// teaching.
const TAXONOMY = [
    {
        name: 'Design & Art',
        color: '#6366F1',
        subcategories: ['Graphic Designer', 'Illustrators', 'UI-UX Designers', 'Web Developers', 'App Developers', '3D Modelling', 'Motion Design']
    },
    {
        name: 'Events & Entertainment',
        color: '#22C55E',
        subcategories: ['Party Planners/Event Planner', 'Balloon Decor', 'DJs', 'Bartenders', 'Caterers', 'Emcees', 'Dancers & Choreography', 'Event Photographers', 'Wedding Photographers']
    },
    {
        name: 'Business & Consulting',
        color: '#F59E0B',
        subcategories: ['Lawyers', 'Accountants', 'Business Consultants', 'Financial Advisors', 'Tax Consultants']
    },
    {
        name: 'Health & Wellbeing',
        color: '#EF4444',
        subcategories: ['Physical Therapists', 'Psychologists', 'Nutritionists', 'Yoga Instructors', 'Personal Trainers']
    },
    {
        name: 'Personal Services',
        color: '#EAB308',
        subcategories: ['Hair & Beauty', 'Personal Care', 'Home Cleaning', 'Tailoring']
    },
    {
        name: 'Pet Services',
        color: '#0EA5E9',
        subcategories: ['Dog Walking', 'Pet Grooming', 'Pet Boarding', 'Pet Trainers', 'Veterinary Services']
    },
    {
        name: 'Upcoming Entrepreneurs',
        color: '#8B5CF6',
        subcategories: ['Startup Mentors', 'Business Plan Consultants']
    },
    {
        name: 'Lessons & LifeSkills',
        color: '#EC4899',
        subcategories: ['Music Teaching Classes', 'Dance Teachers', 'Language Tutors', 'Academic Tutors', 'Life Coaches']
    }
];

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
