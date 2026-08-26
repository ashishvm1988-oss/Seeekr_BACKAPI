const education = require('#src/handlers/education.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} done 
 */
function education_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', auth_hook)

    fastify.get('/', async (req, rep) => {
        const res = await education.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.get('/all', async (req, rep) => {
        const res = await education.get_all(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await education.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await education.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await education.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = education_router;