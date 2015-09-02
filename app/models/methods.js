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
    ], function(err, res) {
        if (err) return callback(err);
        if (res === null) return callback(Error('client not found'));
        callback(err, res);
    });
};
