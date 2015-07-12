var db = require('./vendor/db');
var async = require('async');
var should = require('should');
var Client = require('../app/models/client');
var socketMethods = require('../app/socket').tests;
var moloko = require('moloko');
var port = 3010;
var server = moloko.server({
    host: 'localhost',
    port: port
});


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

describe('socket #messageOrderInd', function() {
    var provider, consumer1;

    before(function(done) {
        async.waterfall([
            function(next) {
                Client.create({name: 'test', tid: '123', type: 'provider'}, next);
            },
            function(client, next) {
                provider = client;
                Client.create({name: 'test', tid: '123', type: 'consumer'}, next);
            },
            function(client, next) {
                consumer1 = client;
                consumer1.subscribe(provider, next);
            }
        ], done);
    });

    describe('#messageOrderInd', function() {
        it('123', function() {
            console.log(12, provider);

        })
    });

});
