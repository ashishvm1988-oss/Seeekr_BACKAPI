const awards = require('#src/handlers/awards.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} done 
 */
function awards_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', auth_hook)

    fastify.get('/', async (req, rep) => {
        const res = await awards.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.get('/all', async (req, rep) => {
        const res = await awards.get_all(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await awards.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await awards.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await awards.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = awards_router;