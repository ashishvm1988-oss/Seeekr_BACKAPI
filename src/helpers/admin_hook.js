const token = require('#src/helpers/token');

const admin_hook = async (req, rep) => {
    try {
        console.log('admin_hook: ', process.env.ADMIN_KEY)
        if(!token.verifyToken(req.headers.authorization, process.env.ADMIN_KEY)){
            rep.code(401).send({
                error: 'Unauthorized Admin Access'
            })
        } else {
            req.user = token.getTokenData(req.headers.authorization, process.env.ADMIN_KEY)
        }
    } catch (err) {
        console.log('admin.auth_hook.error: ', err)
        rep.send(err)
    }
}

module.exports = admin_hook;