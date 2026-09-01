const { table_names } = require("#src/globals/constants");

/**
 * Two independent additions:
 *  - Forgot/reset password support on `users` (a hashed, expiring token —
 *    never the raw token — so a leaked DB doesn't hand out working reset
 *    links).
 *  - `provider_credentials`: lets a provider list verifiable background
 *    (education, work experience, certifications, past projects) with an
 *    optional uploaded proof file, so customers have a reason to trust a
 *    profile is a real, qualified provider and not someone who just signed
 *    up five minutes ago.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable(table_names.users, (table) => {
    table.string("reset_token_hash");
    table.datetime("reset_token_expires");
  });

  await knex.schema.createTable(table_names.provider_credentials, (table) => {
    table.increments("id").notNullable().primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable(table_names.users)
      .onDelete("CASCADE");
    table
      .enu("type", ["education", "experience", "certification", "project"])
      .notNullable();
    table.string("title").notNullable();
    table.string("organization");
    // Free-text on purpose (e.g. "2018 - 2022", "2023") rather than real
    // date columns — providers describe this in all kinds of shapes and a
    // strict date picker is more friction than the data is worth for an MVP.
    table.string("period");
    table.text("description");
    table.string("proof_url");
    table.integer("sort_order").notNullable().defaultTo(0);
    table.datetime("created").notNullable().defaultTo(knex.fn.now());
    table.index("user_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists(table_names.provider_credentials);
  await knex.schema.alterTable(table_names.users, (table) => {
    table.dropColumn("reset_token_hash");
    table.dropColumn("reset_token_expires");
  });
};
