var mongoose = require('mongoose');
var BaseSchema = require('./base');
extend = require('mongoose-schema-extend');

/**
 * @class Order
 * @extends Default
 */
var Order = BaseSchema.extend({
    provider: String
});




module.exports = mongoose.model('order', Order);