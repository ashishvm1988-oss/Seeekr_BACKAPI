const subscription = require('#src/handlers/subscription.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function subscription_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // GET /subscriptions/me — the logged-in user's own subscription row
    // (providers only; customers get null). Requires auth, so it's not in
    // auth_hook's public_routes.
    fastify.get('/me', async (req, rep) => {
        const res = await subscription.me(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = subscription_router;
