var mongoose = require('mongoose');
var _ = require('underscore');

/**
 * @class Default
 */
module.exports = mongoose.Schema({
        _createdBy: {type: Object},
        _createdOn: {type: Date, default: new Date().getTime()}
    },
    {
        discriminatorKey : '_title'
    });


//module.exports = entity;