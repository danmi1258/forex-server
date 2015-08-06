var passport = require('../utils/passport');



module.exports.login = function(req, res) {
    passport.authenticate('local'), function(err, user) {
        if (err) {
            return res.json(err);
        }
        passport.serializeUser(function(err, cb) {
            if (err) {
                console.error(123, err);
                return cb(err);
            }

        res.json(user);
        })
    })(req, res);
};
