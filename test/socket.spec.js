var db = require('./vendor/db');
var async = require('async');
var should = require('should');
var Client = require('../app/models/client');
var socketMethods = require('../app/socket').tests;



describe('#clear db', function() {

    before(function(done) {
        db.clear(done);
    });

    var socket1 = {tid: 123};
    var socket2 = {tid: 456};

    describe('#storeSocket', function() {
        it('should store socket', function() {
            socketMethods.storeSocket(socket1);
            socketMethods.sockets.length.should.be.equal(1);
        });

        it('should store another socket', function() {
            socketMethods.storeSocket(socket2);
            socketMethods.sockets.length.should.be.equal(2);
        });

        it('should not store socket again', function() {
            socketMethods.storeSocket(socket2);
            socketMethods.sockets.length.should.be.equal(2);
        });
    });


    describe('#removeocket', function() {
        it('should remove socket from store', function() {
            socketMethods.removeSocket(socket2);
            socketMethods.sockets.length.should.be.equal(1);
            socketMethods.sockets[0].tid.should.be.equal(123);
        });
    });

    describe('123', function() {
        before(function(done) {
            console.log(123123);
            done();
        });
    });
});

describe('socket #messageOrderInd asdf', function() {
    var provider, consumer1;

    before(function(done) {
        async.waterfall([
            function(next) {
                Client.create({name: 'provider', tid: '123', type: 'provider'}, next);
            },
            function(client, next) {
                next = Array.prototype.slice.call(arguments).pop();
                provider = client;
                Client.create({name: 'consumer1', tid: '12345', type: 'consumer'}, next);
            },
            function(client, next) {
                next = Array.prototype.slice.call(arguments).pop();
                consumer1 = client;
                consumer1.subscribe(provider, next);
            },
            function(next) {
                next = Array.prototype.slice.call(arguments).pop();
                // @param type {Integer}
                // @param symbol {String}
                // @param lots {Double}
                // @param comment {String}
                provider.createOrder({
                    type: 0,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: toString(provider.tid)
                }, next);
            }
        ], done);
    });

    describe('#messageOrderInd', function() {
        it('123', function(done) {
            // socketMethods.messageOrderInd(provider, )
            console.log(12, consumer1);
            provider.getOrders(function(err, res) {
                console.log(err, res);
                done()
            });
        });
    });

});
