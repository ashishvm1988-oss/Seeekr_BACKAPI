const schedule = require('#src/handlers/schedule.handler');
const auth_hook = require('#src/helpers/auth_hook');

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 * @param {*} done
 */
function schedule_router(fastify, opts, done) {

    fastify.addHook('onRequest', auth_hook)

    // Public: anyone viewing a provider's profile can see their working
    // hours and the slot grid for a date, logged in or not (see
    // auth_hook.js's public_routes — '/schedule/availability' and
    // '/schedule/slots' are listed there).
    fastify.get('/availability', async (req, rep) => {
        const res = await schedule.getAvailability(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    // Provider-only: replace their weekly working-hours template.
    fastify.post('/availability', async (req, rep) => {
        const res = await schedule.setAvailability(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message?.startsWith('Only service provider')) {
            rep.code(403).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    fastify.get('/slots', async (req, rep) => {
        const res = await schedule.getSlots(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    // Any logged-in user: request a slot (creates a 'pending' booking the
    // provider still has to accept — see /respond).
    fastify.post('/book', async (req, rep) => {
        const res = await schedule.book(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    // Provider-only: accept or decline a pending request.
    fastify.post('/respond', async (req, rep) => {
        const res = await schedule.respond(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message?.startsWith('Only service provider')) {
            rep.code(403).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    // Either side of a booking can cancel it.
    fastify.post('/cancel', async (req, rep) => {
        const res = await schedule.cancel(req);
        if(res.error){
            rep.code(500).send(res)
        } else if (res.message) {
            rep.code(400).send(res)
        } else {
            rep.send(res)
        }
    })

    // The logged-in user's own bookings (as customer and, for a provider
    // account, as provider too) — backs the Account page's "My bookings".
    fastify.get('/bookings/mine', async (req, rep) => {
        const res = await schedule.mine(req);
        if(res.error){
            rep.code(500).send(res)
        } else {
            rep.send(res)
        }
    })

    done()
}

module.exports = schedule_router;
