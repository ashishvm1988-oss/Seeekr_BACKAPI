'use strict'

require('#src/helpers/env')();

const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT } = process.env;

const connection = {
    host: DB_HOST,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
}

const config = {
    client: 'mysql2',
    connection,
    migrations: {
        tablename: 'knex_migrations',
        directory: `${__dirname}/db/migrations`
    },
    seeds: {
        directory: `${__dirname}/db/seeds`
    }
}

const environments = {
    local: config,
    development: config,
    production: {
        ...config,
        pool: { min: 2, max: 10 },
    },
};

// knex CLI (migrate/seed) needs one config, keyed by NODE_ENV.
// db/helpers/db.js builds its own connection straight from process.env for
// the running app, so this file is only consumed by the knex CLI.
module.exports = environments[process.env.NODE_ENV] || environments.local;