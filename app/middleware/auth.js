var _ = require('underscore');

module.exports.auth = function(req, res, next) {
    console.log('>>', req.query, req.params);
    next();
};


module.exports.admin = function(req, res, next) {

};

module.exports.consumer = function(req, res, next) {

};

module.exports.provider = function(req, res, next) {

};

