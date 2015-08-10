var UnauthorizedError = require('../routes/httpErrors').Unauthorized;
var LOGIN_PATH = '/api/login';

module.exports.auth = function(req, res, next) {
    req.isAuthenticated() || req.originalUrl.indexOf(LOGIN_PATH) !== -1 ?
        next() :
        next(new UnauthorizedError());
};
