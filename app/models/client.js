var mongoose = require('mongoose');
var BaseSchema = require('./base');
extend = require('mongoose-schema-extend');

/**
 * @class Client
 * @extends Default
 */
var Client = BaseSchema.extend({
    /* - */
    name: String,
    /* ids of a terminal-providers */
    subscriptions: Array,
    /* ids of an open orders in terminal */
    openOrders: Array,
    /* the terminal access code */
    token: String,
    /* terminal id */
    tid: Number,
    /* terminal type in HEX: provider(0x01010) / consumer (0x1020) */
    type: String
});

Client.statics.getSubscribtionHash = function() {
    return {
        _id: null,
        volume: 0.01
    }
};

/* create new terminal */
Client.statics.create = function(data, callback) {
   var Terminal = this;

   if (!data.name || !data.tid || !data.type) return callback(new Error('data error'));

   var terminal = new Terminal(data);


   terminal.save(callback);
};

Client.methods.alreadySubscribed = function(provider) {
    return this.subscriptions.indexOf(provider._id) != -1;
};

Client.methods.subscribe = function(provider, callback) {
    if (provider.type != 'provider') return callback(401);
    if (this.alreadySubscribed(provider)) return callback(401);

    this.subscriptions.push(provider._id);
    this.save(callback);
};

Client.methods.unsubscribe = function(provider, callback) {
    if (!this.alreadySubscribed(provider)) return callback(401);

    this.subscriptions.splice(this.subscriptions.indexOf(provider._id));
    this.save(callback);
};

Client.methods.changeToken = function(token, callback) {
    if (!!token.closed) return callback(401);

    this.token = token._id;
    this.save(callback);
};


Client.methods.hasOpenOrders = function() {
    return !!this.openOrders.length;
};
/* получить все подписки */
Client.methods.getSubscribtions = function(callback) {
    this.find({subscriptions: {$in: this.subscriptions}}, callback);
};

/* консюмер. подтверждение открытия ордера */
Client.methods.createOrderConfirm = function() {};

/* консюмер. подтверждение закрытия ордера */
Client.methods.closeOrderConfirm = function(orderId) {};

/* юзер, консюмер. получить историю ордеров. */
Client.methods.getAllOrders = function() {};

/* юзер, консюмер. получить закрытые ордера.  */
Client.methods.getClosedOrders = function() {};

/* юзер, консюмер. проверить, ест ли ордера на закрытие. */
Client.methods.hasClosingOrders = function() {};

/* юзер, консюмер. получить список ордеров на закрытие. */
Client.methods.getClosingOrders = function() {};

/* юзер, консюмер. получить список открытых ордеров. */
Client.methods.getOpenOrders = function() {};

/* юзер, консюмер. проверить, есть ли открыте ордера */
Client.methods.hasOpenOrders = function() {};

/* получить список ордеров на открытие */
Client.methods.checkNewOrder = function() {};

/* юзер */
Client.methods.changeVolume = function() {};

/* юзер */
Client.methods.setPause = function() {};

/* провайдер. Установить всем консюмерам открытые ордера. */
Client.methods.setNewOrder = function() {};

/* провайдер. Пометить открытые ордера на закрытие. */
Client.method.markAsClosing = function() {};


module.exports = mongoose.model('client', Client);