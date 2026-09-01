const credential = require('#src/handlers/credential.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function credential_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // Public: viewing a provider's credentials doesn't require login —
    // it's part of what a customer checks before trusting a profile.
    fastify.get('/', async (req, rep) => {
        const res = await credential.list(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Provider-only: adds a credential to their own profile, with an
    // optional proof file (image or PDF).
    fastify.post('/', async (req, rep) => {
        const res = await credential.create(req);
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
        const res = await credential.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = credential_router;
