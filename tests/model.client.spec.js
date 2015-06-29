var db = require('./vendor/db');
var Client = require('../app/models/client');
var async = require('async');
var should = require('should');


describe('project model', function() {

    before(function(done) {
        db.clear(done);
    });

    var provider, consumer;

    describe('create', function() {

        it("should create new client type of provider", function (done) {

            Client.create({name: 'test', tid: '123', type: 'provider'}, function(err, res) {
                res.type.should.be.equal('provider');
                provider = res;

                done();
            });

            //new Client({type: 'provider'}).save(function (err, res) {
            //    res.type.should.be.equal('provider');
            //    provider = res;
            //    //done()
            //});
        });

        it("should create new client type of consumer", function (done) {

            new Client({type: 'consumer', name: 'sdf'}).save(function (err, res) {
                if (err) console.log(err);
                res.type.should.be.equal('consumer');
                consumer = res;
                done()
            });
        });

    });

    describe('#subsribe', function() {
        it('should add provider to consumer subscription list', function(done) {
            consumer.subscribe(provider, function(err, res) {
                res.subscriptions.indexOf(provider._id).should.not.be.equal(-1);
                done();
            })
        });

        it('не должен подписывать на клиентов у которых type != provider', function(done) {
            consumer.subscribe(consumer, function(err, res) {
                err.should.not.be.equal(null);
                done();
            })
        })
    });

    describe('#unsubscribe', function() {
        it('#unsubcribe.  should remove provider from consumer`s subscription list', function(done) {
            consumer.unsubscribe(provider, function(err, res) {
                console.log(res);
                res.subscriptions.indexOf(provider._id).should.be.equal(-1);
                done();
            })
        })
    });
});