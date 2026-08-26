const user = require('#src/handlers/user.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {} opts
 * @param {*} done
 */
function user_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    fastify.get('/', async (req, rep) => {
        const res = await user.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Signup. Listed in auth_hook's public_routes — this must stay reachable
    // without a token, since you can't have a token before you have an
    // account.
    fastify.post('/', async (req, rep) => {
        const res = await user.create(req);
        if(res.error){
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await user.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await user.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = user_router;
