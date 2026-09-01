const fastify = require('fastify');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cors = require('@fastify/cors')

const user_router = require('#src/routes/user.router');
const auth_router = require('#src/routes/auth.router');
const awards_router = require('#src/routes/awards.router');
const admin_user_router = require('#src/routes/admin_user.router');
const review_router = require('#src/routes/review.router');
const click_analytics_router = require('#src/routes/click_analytics.router');
const category_router = require('#src/routes/category.router');
const subcategory_router = require('#src/routes/subcategory.router');
const messages_router = require('#src/routes/messages.router');
const portfolio_router = require('#src/routes/portfolio.router');
const credential_router = require('#src/routes/credential.router');
const provider_search_router = require('#src/routes/provider_search.router');
const subscription_router = require('#src/routes/subscription.router');
const db = require('#src/helpers/db');

// LOADING CONFIGS
require('#src/helpers/env')();

const app = fastify({
    ignoreTrailingSlash: true,
})

const port = process.env.PORT || 8000;

let loadstring = "tiny";

// LOAD DEV CONFIGS
if (process.env.NODE_ENV === "dev") {
    loadstring = ":remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms";
}

app.addHook('onError', (...error) => {
    console.error(error)
})

// CONFIGURE MIDDLEWARE
app.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/public/',
})
app.register(require('@fastify/multipart'), {
    limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 1_000_000, // Max field value size in bytes (e.g. a caption)
        fields: 10,         // Max number of non-file fields
        fileSize: 15728640,  // For multipart forms, the max file size in bytes (15MB)
        files: 1,           // Max number of file fields
        headerPairs: 2000,  // Max number of header key=>value pairs
        parts: 1000         // For multipart forms, the max number of parts (fields + files)
    }
});

// `credentials: true` cannot legally be paired with a wildcard origin (browsers
// reject it, and it would be a bad idea even if they didn't). ALLOWED_ORIGINS
// is a comma-separated list of exact origins (e.g. the web app's URL(s)); with
// nothing configured we fall back to allowing no cross-origin requests rather
// than silently defaulting back to "*".
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

app.register(cors, {
    origin: (origin, cb) => {
        // Same-origin / non-browser requests (curl, server-to-server) send no
        // Origin header at all — allow those through.
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true)
            return
        }
        cb(new Error('Not allowed by CORS'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true, // Allow credentials like cookies
})

app.register(user_router, { prefix: '/users' });
app.register(auth_router, { prefix: '/auth' })
app.register(awards_router, { prefix: '/awards' })
app.register(admin_user_router, { prefix: '/admin_users' })
app.register(review_router, { prefix: '/review' });
app.register(category_router, { prefix: '/category' });
app.register(subcategory_router, { prefix: '/sub-category' });
app.register(click_analytics_router, { prefix: '/click_analytics' });
app.register(messages_router, { prefix: '/messages' });
app.register(portfolio_router, { prefix: '/portfolio' });
app.register(credential_router, { prefix: '/credentials' });
app.register(provider_search_router, { prefix: '/providers' });
app.register(subscription_router, { prefix: '/subscriptions' });

app.register(require('@fastify/express')).then(() => {
    app.use(morgan(loadstring));
    // Helmet's default Cross-Origin-Resource-Policy is "same-origin", which
    // silently blocks the browser from loading anything under /public/
    // (portfolio photos, credential proof files) when the API is on a
    // different origin than the web app (api.seeekr.com vs seeekr.com) —
    // exactly this app's real deployment. These files are meant to be
    // publicly embeddable, so relax it to "cross-origin" rather than
    // disabling the policy check on other routes.
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(compression());

    // No separate deploy step runs `knex migrate:latest` (Railway just does
    // `npm start`), so the app brings the schema up to date itself before
    // it starts accepting traffic. Safe to run on every boot — knex tracks
    // which migrations already ran and this is a no-op when there's
    // nothing pending.
    db.migrate.latest()
        .then(([, migrationsRun]) => {
            if (migrationsRun.length) {
                console.log('Migrations applied:', migrationsRun.map(f => path.basename(f)));
            }
            startServer();
        })
        .catch((err) => {
            console.error('Migration failed — refusing to start:', err);
            process.exit(1);
        });

    function startServer() {
        app.listen({ port, host: '0.0.0.0' }, (err) => {
            if (err) {
                console.error(err)
                process.exit(1)
            }
            const message = [
                ['SERVER IS RUNNING'],
                ['ENV', process.env.NODE_ENV],
                ['PORT', port],
            ]
            console.table(message);
        })
    }
});
