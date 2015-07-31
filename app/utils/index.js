
var _ = require('underscore');
var logger = require('../utils/logger');

module.exports.createUniqueKey = function() {
    return Math.random().toString(36).substr(2, 9);
};

module.exports.print = function(object) {
    if (!_.isObject(object)) {
        throw new Error('argument type Object expected');
    }

    switch(object._title) {
        case 'client':
            return '[name=' + object.name + ', id=' + object._id.toString() + ']';
        default:
            return '[id=' + object._id.toString() + ']';
    }
};
