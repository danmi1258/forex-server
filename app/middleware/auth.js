var _ = require('underscore');

module.exports = function(req, res, next) {

    console.log('>>', req.query, req.params);
    next();
};