const knex = require('knex').knex
const path = require('path');

require('dotenv-safe').config();

const options = {
    client: 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: 'utf8'
    },
    // Lets app.js call db.migrate.latest() on boot (see app.js) — there's no
    // separate deploy step to run `knex migrate:latest` on Railway, so the
    // app applies any pending migrations itself before it starts accepting
    // requests. Same directory the knex CLI uses (see knexfile.js).
    migrations: {
        tableName: 'knex_migrations',
        directory: path.join(__dirname, '..', '..', 'db', 'migrations'),
    },
}

module.exports = knex(options);