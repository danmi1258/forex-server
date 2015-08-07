var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var forbiddenError = require('../routes/httpErrors').Forbidden;
var serverError = require('../routes/httpErrors').serverError;

function passportMiddleWare(username, password, callback) {
    User.findOne({username: username}, function (err, user) {
        if (err) {
            return callback(null, serverError('db error'), err);
        }

        if (!user) {
            console.error('user not found');
            return callback(null, forbiddenError('User not found'));
        }

        //if (!user.verifyPassword(password)) {
        //    return callback(null, false);
        //}

        return callback(null, user);
    });
}

passport.use(new LocalStrategy(passportMiddleWare));


passport.serializeUser(function(user, callback) {
    callback(null, user.id);
});


passport.deserializeUser(function(userId, callback) {
    User.findById(userId, callback);
});

//passport.logout = function(req, res, next) {
//    req.logout();
//    res.json({'logout': 'success'});
//};

module.exports = passport;
