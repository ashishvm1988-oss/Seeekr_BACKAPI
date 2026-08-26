const { table_names } = require("#src/globals/constants");

/**
 * Adds the pieces the original "yellow pages" schema never had: a
 * customer/provider role split, a portfolio (Media tab in the designs),
 * location for search, and a subscription-tracking scaffold for the
 * 6-months-free-then-₹1000/month provider billing model.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.alterTable(table_names.users, table => {
        table.enu('role', ['customer', 'provider']).notNullable().defaultTo('customer');
        table.string('city');
        // The base migration left `deleted` with no default, so existing rows
        // (and every insert that doesn't set it) leave it NULL. Give it a
        // real default and backfill so `.where({ deleted: false })`-style
        // checks behave predictably everywhere.
        table.boolean('deleted').notNullable().defaultTo(false).alter();
    });
    await knex(table_names.users).whereNull('deleted').update({ deleted: false });

    await knex.schema.alterTable(table_names.messages, table => {
        table.datetime('read_at');
    });

    await knex.schema.alterTable(table_names.categories, table => {
        table.string('icon_url');
    });

    await knex.schema.alterTable(table_names.sub_category, table => {
        table.string('icon_url');
    });

    await knex.schema.createTable(table_names.portfolio_images, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.string('image_url').notNullable();
        table.string('caption');
        table.integer('sort_order').notNullable().defaultTo(0);
        table.datetime('created').notNullable().defaultTo(knex.fn.now());
        table.index('user_id');
    });

    // A provider can offer more than one service (e.g. a photographer who
    // also does event planning), so this is many-to-many rather than a
    // single subcategory_id column on users.
    await knex.schema.createTable(table_names.provider_subcategories, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.integer('sub_category_id').unsigned().notNullable()
            .references('id').inTable(table_names.sub_category).onDelete('CASCADE');
        table.unique(['user_id', 'sub_category_id']);
        table.index('sub_category_id');
    });

    await knex.schema.createTable(table_names.subscriptions, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().notNullable().unique()
            .references('id').inTable(table_names.users).onDelete('CASCADE');
        table.enu('status', ['trial', 'active', 'past_due', 'cancelled']).notNullable().defaultTo('trial');
        table.datetime('trial_ends_at').notNullable();
        table.datetime('next_billing_at');
        table.integer('amount_inr').notNullable().defaultTo(1000);
        table.datetime('created').notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists(table_names.subscriptions);
    await knex.schema.dropTableIfExists(table_names.provider_subcategories);
    await knex.schema.dropTableIfExists(table_names.portfolio_images);
    await knex.schema.alterTable(table_names.sub_category, table => {
        table.dropColumn('icon_url');
    });
    await knex.schema.alterTable(table_names.categories, table => {
        table.dropColumn('icon_url');
    });
    await knex.schema.alterTable(table_names.messages, table => {
        table.dropColumn('read_at');
    });
    await knex.schema.alterTable(table_names.users, table => {
        table.dropColumn('role');
        table.dropColumn('city');
    });
};
