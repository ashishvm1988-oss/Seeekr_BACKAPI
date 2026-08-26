const messages = require('#src/handlers/mesages.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function messages_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // GET /messages/conversations — the Chat tab's conversation list.
    fastify.get('/conversations', async (req, rep) => {
        const res = await messages.list_conversations(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // GET /messages?other_user_id=5 — a single thread.
    fastify.get('/', async (req, rep) => {
        const res = await messages.thread(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/', async (req, rep) => {
        const res = await messages.create(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.delete('/', async (req, rep) => {
        const res = await messages.delete(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = messages_router;
