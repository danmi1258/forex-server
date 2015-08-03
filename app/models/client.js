var mongoose = require('mongoose');
var BaseSchema = require('./base');
require('mongoose-schema-extend');

/**
    @class Client
    @extends Default
 */
module.exports = BaseSchema.extend({
    name: {
        type: String,
        required: true,
        unique: true
    },

    /* the terminal access code */
    token: String,

    /* terminal id */
    tid: {
        type: Number,
        required: true,
        unique: true
    }
});
