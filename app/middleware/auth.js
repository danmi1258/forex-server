var UnauthorizedError = require('../routes/httpErrors').Unauthorized;
var LOGIN_PATH = '/api/login';

module.exports.auth = function(req, res, next) {
    req.isAuthenticated() || req.originalUrl === LOGIN_PATH ?
        next() :
        next(new UnauthorizedError());
};
