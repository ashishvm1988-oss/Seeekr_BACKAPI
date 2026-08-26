const review = require('#src/handlers/review.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} done 
 */
function review_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', auth_hook)

    fastify.get('/', async (req, rep) => {
        const res = await review.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.get('/all', async (req, rep) => {
        const res = await review.get_all();
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await review.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await review.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await review.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = review_router;