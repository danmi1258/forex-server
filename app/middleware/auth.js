var UnauthorizedError = require('../routes/httpErrors').Unauthorized;

module.exports.auth = function(req, res, next) {
    req.isAuthenticated() || req.originalUrl === '/api/login' ?
        next() :
        res.json(new UnauthorizedError());
};
