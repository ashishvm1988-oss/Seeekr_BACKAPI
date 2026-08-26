const admin_user = require('#src/handlers/admin_user.handler');
const auth = require('#src/handlers/auth.handler');
const admin_hook = require('#src/helpers/admin_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {any} opts 
 * @param {*} done 
 */
function admin_user_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', admin_hook)

    fastify.get('/', async (req, rep) => {
        const res = await admin_user.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await admin_user.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/login', async (req, rep) => {
        const res = await auth.authLogin(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await admin_user.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await admin_user.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = admin_user_router;