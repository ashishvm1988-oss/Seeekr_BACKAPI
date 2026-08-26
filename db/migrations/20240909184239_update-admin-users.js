const { table_names } = require("#src/globals/constants");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    return knex.schema
        .alterTable(table_names.admin_users, table => {
            table.string('email')
            table.string('phone_number')
        })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    return knex.schema
        .alterTable(table_names.admin_users, table => {
            table.dropColumns(['name', 'username', 'phone_number'])
        })
};
