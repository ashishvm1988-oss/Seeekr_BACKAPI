const schedule = require('#src/handlers/schedule.handler');
const admin_hook = require('#src/helpers/admin_hook');

/**
 * Admin-only: aggregate booking numbers to show investors. Separate router
 * (rather than a route inside schedule_router) because admin_hook is
 * applied per-router via onRequest, and this is the only schedule endpoint
 * that should require an admin login rather than a regular user login.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function schedule_stats_router(fastify, opts, done) {

    fastify.addHook('onRequest', admin_hook)

    fastify.get('/', async (req, rep) => {
        const res = await schedule.stats(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = schedule_stats_router;
