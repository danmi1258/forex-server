var passport = require('../utils/passport');
var UnauthorizedError = require('../routes/httpErrors').Unauthorized;


module.exports.login = function(req, res) {
    res.json(req.user);
};

module.exports.isLoggedIn = function(req, res, next) {
    req.isAuthenticated() ? res.json(req.user) : next(new UnauthorizedError());
};

module.exports.logout = function(req, res) {
    req.logout();
    res.json({logout: true});
};
