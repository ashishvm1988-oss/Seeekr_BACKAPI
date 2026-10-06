const { table_names } = require("#src/globals/constants");

/**
 * Lets a provider publish a weekly working-hours template (one row per
 * weekday they work) and lets customers request a specific time slot against
 * it, which the provider then accepts or declines — like Practo/restaurant
 * booking sites, not an instant-confirm calendar. There's no payment/escrow
 * here by design — a booking request is a strong "this customer is
 * genuinely interested in this provider" signal, which is exactly the
 * engagement data the business wants to show investors, without building
 * out a full payments flow first.
 *
 * status lifecycle: 'pending' (customer requested, slot held) ->
 * 'confirmed' (provider accepted) or 'declined' (provider rejected, slot
 * reopens) -> 'cancelled' (either side calls it off after confirming).
 *
 * day_of_week follows JS's `Date#getDay()` convention (0 = Sunday ... 6 =
 * Saturday) so the frontend can compute straight off `new Date(...)` without
 * a lookup table.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable(table_names.provider_availability, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.tinyint('day_of_week').unsigned().notNullable();
        table.time('start_time').notNullable();
        table.time('end_time').notNullable();
        table.integer('slot_minutes').unsigned().notNullable().defaultTo(60);
        table.datetime('created').notNullable().defaultTo(knex.fn.now());
        table.datetime('updated').notNullable().defaultTo(knex.fn.now());
        table.unique(['user_id', 'day_of_week']);
    });

    await knex.schema.createTable(table_names.schedule_bookings, table => {
        table.increments('id').notNullable().primary();
        table.integer('provider_id').unsigned().notNullable()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.integer('customer_id').unsigned().notNullable()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.date('booking_date').notNullable();
        table.time('start_time').notNullable();
        table.time('end_time').notNullable();
        table.enu('status', ['pending', 'confirmed', 'declined', 'cancelled']).notNullable().defaultTo('pending');
        table.datetime('created').notNullable().defaultTo(knex.fn.now());
        table.datetime('responded_at');
        table.index(['provider_id', 'booking_date']);
        table.index(['customer_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists(table_names.schedule_bookings);
    await knex.schema.dropTableIfExists(table_names.provider_availability);
};
