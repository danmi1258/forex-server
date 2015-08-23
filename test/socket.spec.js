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
});
