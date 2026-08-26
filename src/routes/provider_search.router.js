const providerSearch = require('#src/handlers/provider_search.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function provider_search_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // GET /providers?category_id=&sub_category_id=&city=&q=&page=&limit=
    fastify.get('/', async (req, rep) => {
        const res = await providerSearch.search(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = provider_search_router;
