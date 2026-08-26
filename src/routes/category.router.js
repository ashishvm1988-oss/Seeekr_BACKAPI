const category = require('#src/handlers/category.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} done 
 */
function category_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', auth_hook)

    fastify.get('/', async (req, rep) => {
        const res = await category.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.get('/all', async (req, rep) => {
        const res = await category.get_all();
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await category.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.put('/', async (req, rep) => {
        const res = await category.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await category.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}



module.exports = category_router;