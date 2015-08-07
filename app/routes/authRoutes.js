var passport = require('../utils/passport');



module.exports.login = function(req, res) {
    res.json(req.user);
};

module.exports.logout = function(req, res) {
    req.logout();
    res.json({logout: true});
};
