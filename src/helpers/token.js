const jwt = require('jsonwebtoken');

/**
 * 
 * @param {any} data 
 * @param {boolean} verify 
 * @returns {boolean | string}
 */
module.exports.token = (data, key, verify = false) => {
    if (!verify) return jwt.sign(data, key);
    else {
        try {
            jwt.verify(String(data), key);
            return true;
        } catch (error) {
            console.error('token: ', error)
            return false;
        }
    };
}

module.exports.getTokenData = rawToken => {
    const token = stripBearer(rawToken);
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

module.exports.generateToken = (payload, key) => {
    // jsonwebtoken's expiresIn is in SECONDS (or a duration string), not ms —
    // the previous `* 1000` here meant tokens were actually valid for ~41
    // days in production and ~3.4 days in dev, not 1 hour / 5 minutes.
    return jwt.sign(payload, key, {
        expiresIn: process.env.NODE_ENV === 'dev' ? 5 * 60 : 60 * 60
    });
}

/**
 * 
 * @param {string} token 
 * @returns {boolean}
 */
// Accepts either a raw JWT or a standard "Bearer <token>" Authorization header.
function stripBearer(token) {
    if (!token) return token;
    return token.startsWith('Bearer ') ? token.slice('Bearer '.length) : token;
}
module.exports.stripBearer = stripBearer;

module.exports.verifyToken = (rawToken, key) => {
    const token = stripBearer(rawToken);
    if (!token) return false;

    try {
        return !!jwt.verify(token, key);
    } catch (error) {
        // Expired/invalid tokens are routine, not an error worth logging at
        // error level — this fires on every stale session.
        return false;
    }
}