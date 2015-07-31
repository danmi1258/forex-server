var mongoose = require('mongoose');
var BaseSchema = require('./base');
extend = require('mongoose-schema-extend');
var logger = require('../utils/logger');
/**
 * @class Order
 * @extends Default
 * @description

 */
var Order = BaseSchema.extend({
	// аналог ID для терминала. Так как в терминале это единственный уникальный параметр для ордера.
	ticket: Number,
    // ID of the native terminal (Client)
    client: {type: String, required: true},
    // type of order's direct: buy, sell
    type: {type: Number, required: true},
    // currency pare example: EUR/USD
    symbol: {type: String, required: true},
    // volume
    lots: {type: Number, required: true},
    // status: 11-opening, 12-opened, 21-closing, 22-closed
    state: {type: Number, default: 0},
    /* History of the trading. Hash:
    	{profit[number]}
    */
    history: Array,
    // has value then the order opened in the terminal(confirm open order)
    openedOn: Date,
    // has value then the order closed in the terminal (confirm close order)
    closedOn: Date,
    // self unic reference
    reference: String,
    // id of the master (generating) order
    masterOrderId: String
});


/* Найти ордер по уникальному параметру orderTime.
==================================================
Если количество найденных ордеров не равно 1, то будет возвращена ошибка.

@orderTime {Date} - уникальный параметр для ордера
@return {order} - искомый объект ордера.
*/
Order.statics.getByTicket = function(orderTicket, callback) {
	this.model('order').find({ticket: orderTicket}, function(err, res) {
		if (err) {
            callback(err);
            return;
        }

		if (res.length > 1) {
            callback(new Error('500, найдено несколько ордеров по уникальному параметру orderTime'));
            return;
        }
		if (res.length < 1) {
            callback(new Error('404, не найдено ордеров по уникальному параметру orderTime'));
            return;
        }

		callback(null, res[0]);
	})
};

Order.statics.getByReference  = function(ref, callback) {
    this.model('order').findOne({reference: ref}, function(err, res) {
        if (err) {
            return callback(err);
        }

        if (!res) {
            return callback(new Error('404, не найдено ордеров по уникальному параметру "ref"'));
        }

        callback(null, res);
    });
};



module.exports = mongoose.model('order', Order);
