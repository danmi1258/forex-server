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
                if (err) {
                    console.error(err);
                    done(err);
                    return;
                }

                res.type.should.be.equal('provider');
                provider = res;

                done();
            });
        });

        it('should create new client type of consumer', function (done) {

            new Client({type: 'consumer', name: 'sdf'}).save(function (err, res) {
                if(err) {
                    console.error(err);
                    return;
                }
                res.type.should.be.equal('consumer');
                consumer = res;
                done();
            });
        });

    });

    describe('#subsribe', function() {
        it('should add provider to consumer subscription list', function(done) {
            consumer.subscribe(provider, function (err, res) {
                if (err) {
                    console.error(err);
                    done();
                    return;
                }
                res.subscriptions.indexOf(provider._id).should.not.be.equal(-1);
                done();
            });
        });

        it('не должен подписывать на клиентов у которых type != provider', function(done) {
            consumer.subscribe(consumer, function(err, res) {
                err.should.not.be.equal(null);
                done();
            });
        });
    });

    describe('#unsubscribe', function() {
        it('#unsubcribe.  should remove provider from consumer`s subscription list', function(done) {
            consumer.unsubscribe(provider, function(err, res) {
                res.subscriptions.indexOf(provider._id).should.be.equal(-1);
                done();
            })
        })
    });

    describe('#getSubscribtions', function() {
        it('Должен получить список подписок', function(done) {
            consumer.subscribe(provider, function(err, res) {
                if (err) {
                    console.error(err);
                    done(err);
                }

                // console.log(provider._id);
                // console.log('>>s',consumer);

                consumer.getSubscribtions(function(err, res) {
                    if (err) {
                        console.error(err);
                        done(err);
                    }

                    res[0]._id.toString.should.be.equal(provider._id.toString);
                    done();
                });
            });
        });
    });

    describe('static #getByTid', function() {
        it('should return client object', function(done) {
            Client.getByTid(consumer.tid, function(err, res) {
                if (err) {
                    console.error(err);
                    done(err);
                }
                
                res._title.should.be.equal('client');
                done();
            });
        });
    });

    describe('#_authSocket', function() {
        
        // it('1123', function(done) {
        //     var socket = require('../app/middleware/socket');
        //     socket._authSocket({tid: 313976131}, '313976131', function(err, data) {
        //         console.err(err);
        //         console.log(123);
        //     })
        // })
    });

    describe('#createOrder', function() {

        var providerOrder, consumerOrder, _provider, _consumer;

        var values = {
                type: 1,
                symbol: 'eurUsd',
                lots: 0.1,
                comment: 'comment'
            };

        before(function(done) {
            async.waterfall([
                // crate order for provider
                function(next) {
                    provider.createOrder(values, {confirm: true}, next);
                },
                // update provider
                function(_order, next) {
                    providerOrder = _order;
                    Client.getByTid(provider.tid, next);
                },
                // create order for consumer
                function(res, next) {
                    _provider = res;
                    provider.createOrder(values, next);
                },
                function(res, next) {
                    consumerOrder = res;
                    Client.getByTid(consumer.tid, next);
                },
                function(res, next) {
                    _consumer = res;
                    next();
                }
                // update consumer
            ], done);
        });

        it('created order for provider should has correct properties ...', function() {
            providerOrder.should.have.properties({
                type: 1,
                symbol: 'eurUsd',
                lots: 0.1,
                state: 12,
                client: _provider._id.toString()
            });
        });

        it('created order for consumer should has correct properties ...', function() {
            consumerOrder.should.have.properties({
                type: 1,
                symbol: 'eurUsd',
                lots: 0.1,
                state: 11,
                client: _provider._id.toString()
            });
        });

        it('should add new order for provider to open order list', function() {
            provider.openOrders[0].should.be.equal(providerOrder._id);
        });

        it('should not add new order for provier to open order list', function() {
            consumer.openOrders.length.should.be.equal(0);
        });
    });
});
