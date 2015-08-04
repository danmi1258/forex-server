//var Provider = require('./provider');
var Subscriber = require('./subscriber');
var Provider = require('./provider');
var async = require('async');

module.exports.getClientByTid = function(tid, callback) {
    async.waterfall([
        function (next) {
            Provider.findOne({tid: tid}, next);
        },
        function(res, next) {
            if (res) {
                callback(null, res);
            } else {
                Subscriber.findOne({tid: tid}, next);
            }
        }
    ], callback);
};
