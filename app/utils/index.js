
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
        case 'provider':
            return '{provider: {name:' + object.name + ', tid:' + object.tid + '}}';

        case 'subscriber':
            return '{subscriber: {name:' + object.name + ', tid:' + object.tid + '}}';
        
        case 'order':
            return `{order: {ticket: ${object.ticket}, id: ${object._id} }}`;

        default:
            return '[id=' + object.id + ']';
    }
};

module.exports.printError = function(err) {
    if (err) {
        logger.error(err);
    }
}

module.exports.logPrefix = function(logPrefixName) {
    return '<' + Math.floor(Math.random() * 100000) + '>[' + logPrefixName + ']:';
};
