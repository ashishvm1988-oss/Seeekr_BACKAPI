'use strict';

const { table_names } = require('#src/globals/constants');

/**
 * Adds a nullable avatar_url column to users, storing the public path to a
 * profile photo (e.g. /public/avatar/icon/<uuid>.<ext>) written by
 * writeIconImage — same pattern as portfolio/credential photos, just a new
 * `type` bucket and a single column on the user's own row instead of a
 * separate table.
 */
exports.up = function(knex) {
  return knex.schema.alterTable(table_names.users, table => {
    table.string('avatar_url').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable(table_names.users, table => {
    table.dropColumn('avatar_url');
  });
};
