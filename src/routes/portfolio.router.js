const portfolio = require('#src/handlers/portfolio.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function portfolio_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // Public: viewing a provider's portfolio doesn't require login.
    fastify.get('/', async (req, rep) => {
        const res = await portfolio.list(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Provider-only: uploads their own portfolio image.
    fastify.post('/', async (req, rep) => {
        const res = await portfolio.upload(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message?.startsWith('Only service provider')) {
            rep.code(403).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await portfolio.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = portfolio_router;
