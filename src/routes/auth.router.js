const auth = require('#src/handlers/auth.handler');

// Social login (Google/Facebook/Instagram) is deferred past the MVP — the
// original scaffold had unconfigured Facebook/Instagram OAuth stubs here
// (empty/placeholder client credentials) wired to a plugin that's no longer
// registered in app.js. Removed rather than left as dead code that would
// throw at request time. Re-add via @fastify/oauth2 when there are real
// OAuth app credentials to configure.

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {} opts
 * @param {*} done
 */
function auth_router(fastify, opts, done) {

    fastify.post('/login', async (req, rep) => {
        const res = await auth.login(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (!res.data) {
            rep.code(401).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.post('/admin/login', async (req, rep) => {
        const res = await auth.authLogin(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (!res.data) {
            rep.code(401).send(res)
        } else {
            rep.send(res)
        }
    })
    done()
}



module.exports = auth_router;
