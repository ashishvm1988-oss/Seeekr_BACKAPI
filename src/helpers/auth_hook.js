const token = require('#src/helpers/token');
const user = require('#src/handlers/user.handler')
const admin = require('#src/handlers/admin_user.handler')

// Routes (and methods) reachable without a valid token. Browsing categories
// shouldn't require login; everything else defaults to auth-required.
// NOTE: fastify's routeOptions.url is the full path including prefix, so the
// "/all" sub-routes need their own entries — matching just '/category' does
// NOT also cover '/category/all' (this was a bug: the Home screen's category
// grid call would have 401'd for a logged-out user).
const public_routes = {
    '/category': ['GET'],
    '/category/all': ['GET'],
    '/sub-category': ['GET'],
    '/sub-category/all': ['GET'],
    '/auth/login': ['POST'],
    '/users': ['POST'],
    '/portfolio': ['GET'],
    '/credentials': ['GET'],
    '/providers': ['GET'],
}

const auth_hook = async (req, rep) => {
    try {
        const isPublic = !!public_routes[req.routeOptions?.url]?.includes(req.routeOptions?.method)
        if (isPublic) return;

        const adminVerify = token.verifyToken(req.headers.authorization, process.env.ADMIN_KEY)
        const userVerify = token.verifyToken(req.headers.authorization, process.env.SIGNKEY)

        if (!adminVerify && !userVerify) {
            rep.code(401).send({ error: 'Unauthorized' })
            return
        }

        const KEY = adminVerify ? process.env.ADMIN_KEY : process.env.SIGNKEY
        const userData = token.getTokenData(req.headers.authorization, KEY)

        if (adminVerify) {
            const dbUserData = await admin.get({ query: { id: userData.id } })
            const adminRow = dbUserData.data?.[0] || dbUserData?.data
            if (!adminRow) {
                rep.code(401).send({ error: 'Unauthorized, unable to find admin user' })
                return
            }
            if (adminRow.deleted) {
                rep.code(401).send({ error: 'Unauthorized, user has been deleted' })
                return
            }
            req.user = adminRow
            req.userType = 'admin'
        } else {
            const dbUserData = await user.get({ query: { id: userData.id } })
            const userRow = dbUserData.data?.[0] || dbUserData?.data
            if (!userRow) {
                rep.code(401).send({ error: 'Unauthorized, unable to find user' })
                return
            }
            if (userRow.deleted) {
                rep.code(401).send({ error: 'Unauthorized, user has been deleted' })
                return
            }
            req.user = userRow
            req.userType = 'user'
        }
    } catch (err) {
        console.error('auth_hook.error: ', err.message)
        rep.code(401).send({ error: 'Unauthorized' })
    }
}

module.exports = auth_hook;
