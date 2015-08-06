var passport = require('../utils/passport');



module.exports.login = function(req, res) {
    passport.authenticate('local', function(err, user) {
        if (err) {
            return res.json(err);
        }
        res.json(user);
    })(req, res);
};
