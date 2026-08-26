const { table_names } = require("#src/globals/constants");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
      // Users table
      .createTable(table_names.users, table => {
        table.increments('id').notNullable().primary();
        table.string('username').unique().notNullable();
        table.string('password').notNullable();
        table.string('email').unique().notNullable();
        table.json('current_location');
        table.string('contact');
        table.json('location');
        table.string('country_code');
        table.string('google_id');
        table.string('insta_id');
        table.string('location_data');
        table.text('about');
        table.boolean('deleted')
      })
  
      // Work Experience table
      .createTable(table_names.work_experience, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.date('start_date');
        table.date('end_date');
        table.boolean('current');
        table.string('title');
        table.text('content');
      })
  
      // Education table
      .createTable(table_names.education, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.date('start_date');
        table.date('end_date');
        table.string('title');
        table.text('content');
      })
  
      // Awards table
      .createTable(table_names.awards, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.date('award_date');
        table.string('title');
        table.text('content');
      })
  
      // Messages table
      .createTable(table_names.messages, table => {
        table.increments('id').notNullable().primary();
        table.integer('sender_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.integer('receiver_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.text('message');
        table.datetime('created');
        table.boolean('deleted');
      })
  
      // Review table
      .createTable(table_names.review, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.float('rating');
        table.string('title');
        table.text('content');
        table.datetime('created');
        table.datetime('deleted');
      })
  
      // Categories table
      .createTable(table_names.categories, table => {
        table.increments('id').notNullable().primary();
        table.integer('created_by').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.string('name');
        table.string('color');
        table.datetime('created');
      })
  
      // Search Analytics table
      .createTable(table_names.search_analytics, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.string('search');
        table.date('searched_on');
      })

      // Click Analytics table
      .createTable(table_names.click_analytics, table => {
        table.increments('id').notNullable().primary();
        table.integer('user_id').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.integer('clicked_id'); // The person whom I saw/clicked
        table.date('clicked_at');
        table.enu('click_type', ['view_profile', 'click_profile', 'click_email', 'click_phone']);
      })
  
      // Admin Users table
      .createTable(table_names.admin_users, table => {
        table.increments('id').notNullable().primary();
        table.string('user_name').unique();
        table.string('password');
        table.boolean('deleted')
      })
  
      // Sub Category table
      .createTable(table_names.sub_category, table => {
        table.increments('id').notNullable().primary();
        table.integer('created_by').unsigned().references('id').inTable(table_names.users).onDelete('CASCADE');
        table.string('name');
        table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('CASCADE');
      });
};
  
  

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
      .dropTableIfExists(table_names.sub_category)
      .dropTableIfExists(table_names.admin_users)
      .dropTableIfExists(table_names.search_analytics)
      .dropTableIfExists(table_names.click_analytics)
      .dropTableIfExists(table_names.categories)
      .dropTableIfExists(table_names.review)
      .dropTableIfExists(table_names.messages)
      .dropTableIfExists(table_names.awards)
      .dropTableIfExists(table_names.education)
      .dropTableIfExists(table_names.work_experience)
      .dropTableIfExists(table_names.users)
};
