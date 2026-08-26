const click_analytics = require('#src/handlers/click_analytics.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {*} done 
 */
function click_analytics_router(fastify, opts, done) {
    
    fastify.addHook('onRequest', auth_hook)

    // Add new Click
    fastify.post('/newClick', async (req, rep) => {
        const res = await click_analytics.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Get all Clicks
    fastify.get('/getAllClicks', async (req, rep) => {
        const res = await click_analytics.get_all();
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Get Click Details
    fastify.get('/getClick', async (req, rep) => {
        const res = await click_analytics.get(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Update Click
    fastify.put('/updateClick', async (req, rep) => {
        const res = await click_analytics.update(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Delete Click
    fastify.delete('/deleteClick', async (req, rep) => {
        const res = await click_analytics.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Events related to the profile which has been interacted with
    // Who all clicked, 

    done()
}



module.exports = click_analytics_router;