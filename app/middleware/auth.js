var UnauthorizedError = require('../routes/httpErrors').Unauthorized;
var LOGIN_PATH = 'login';
var slack = require('../integrations/slack').default;

module.exports.auth = function(req, res, next) {
    req.isAuthenticated() || req.originalUrl.indexOf(LOGIN_PATH) !== -1 ?
        next() :
        next(new UnauthorizedError());
};
