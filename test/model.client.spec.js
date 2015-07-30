var db = require('./vendor/db');
var Client = require('../app/models/client');
var async = require('async');
var should = require('should');
var config = require('config');

function getRandom() {
    return Math.floor(Math.random()*1000*1000);
}

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

            new Client({type: 'consumer', name: 'sdf', tid: '123456'}).save(function (err, res) {
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

    
    describe('#addToOrderHistory', function() {
        var client, order;
        
        var values = {
            ticket: 123,
            type: 1,
            symbol: 'eurUsd',
            lots: 0.1,
            comment: 'comment'
        };

        before(function(done) {
            async.waterfall([
                function(next) {
                    Client.create({name: 'provider1', tid: '1', type: 'consumer'}, next);
                },
                function(res, next) {
                    client = res;
                    client.createOrder(values, next);
                },
                function(res, next) {
                    order = res;
                    next();
                }
            ], done);
        });

        it('should add new data to the order history', function(done) {
            var ind = {
                ticket: order.ticket,
                profit: 1,
                take_profit: 2,
                swap: 3
            };

            client.addToOrderHistory(ind.ticket, ind, function(err, order) {
                order.history[0].should.have.properties({
                    profit: 1,
                    takeProfit: 2,
                    swap: 3
                });
                
                should(order.history[0].time).be.ok;
                done();
            });
        });

        it('should not add new data to the order history', function(done) {
            var ind = {
                ticket: 1234,
                profit: 2,
                take_profit: 3,
                swap: 4
            };

            client.addToOrderHistory(ind.ticket, ind, function(err, order) {
                err.message.should.be.equal('[Client #addHistory] error: requested order was not found');
                done();
            });
        });
    });
  



    describe('#checkOnChange', function() {
        var provider, order;

        var messages = [{
                    ticket: 123,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'first'
                },
                {
                    ticket: 456,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'second'
                }];

        before(function(done) {
            var values = {
                name: getRandom(),
                tid: getRandom(),
                 type: 'provider'
            };

            Client.create(values, function(err, res) {
                provider = res;
                done();
            });
        });

        it('#should return new orders', function(done) {
            provider.checkOnChange(messages, function(err, res) {
                res.newOrders.length.should.be.equal(2);
                res.newOrders[0].should.have.properties({
                    ticket: 123,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'first'
                });

                done();
            });
        });

        it('should return one new order', function(done) {
            provider.createOrder(messages[0], {confirm: true}, function(err, _order) {
                order = _order;

                provider.checkOnChange(messages, function(err, res) {
                    res.newOrders.length.should.be.equal(1);
                    
                    res.newOrders[0].should.have.properties({
                        ticket: 456,
                        type: 1,
                        symbol: 'eurUsd',
                        lots: 0.01,
                        comment: 'second'
                    });

                   done();
                });
            });
        });

        it('should return one new order and one closed order', function(done) {
            messages.splice(0,1);
            provider.checkOnChange(messages, function(err,res) {
                res.newOrders.length.should.be.equal(1);
                res.closedOrders.length.should.be.equal(1);
                res.newOrders[0].should.have.properties({
                        ticket: 456,
                        type: 1,
                        symbol: 'eurUsd',
                        lots: 0.01,
                        comment: 'second'
                    });

                res.closedOrders[0].should.have.properties({
                    _title: 'order',
                    client: provider._id.toString()
                });

                done();
            });
        });
    });



    describe('#terminal message handler', function() {
        var provider1, provider2, consumer1, consumer11, consumer2;

        var values = {
            type: 1,
            symbol: 'eurUsd',
            lots: 0.01,
            comment: 'comment'
        };

        

        beforeEach(function(done) {
            async.waterfall([
                function(next) {
                    Client.create({name: 'provider1_' + getRandom(), tid: getRandom(), type: 'provider'}, next);
                },
                function(res, next) {
                    provider1 = res;
                    Client.create({name: 'provider2_' + getRandom(), tid: getRandom(), type: 'provider'}, next);
                },
                function(res, next) {
                    provider2 = res;
                    Client.create({name: 'consumer1_' + getRandom(), tid: getRandom(), type: 'consumer'}, next);
                },
                function(res, next) {
                    consumer1 = res;
                    Client.create({name: 'consumer11_' + getRandom(), tid: getRandom(), type: 'consumer'}, next);
                },
                function(res, next) {
                    consumer11 = res;
                    Client.create({name: 'consumer2_' + + getRandom(), tid: getRandom(), type: 'consumer'}, next);
                },
                function(res, next) {
                    consumer2 = res;

                    async.series([
                        function(_next) {
                            consumer1.subscribe(provider1, _next);
                        },
                        function(_next) {
                            consumer11.subscribe(provider1, _next);
                        },
                        function(_next) {
                            consumer2.subscribe(provider2, _next);
                        }
                    ], next);
                }
            ], done);
        });
        
        describe('#createOrderAnalitic', function() {
            it('should create new order and responce should have been expanded', function(done) {


                consumer1.createOrderAnalitic(values, function(err, res) {

                    res.should.have.keys('data', 'order');
                    
                    res.data.should.have.properties({
                        type: values.type,
                        symbol: 'eurUsd',
                        comment: 'comment',
                        ticket: null
                     });

                    res.order.should.have.properties({
                        _title: 'order',
                        type: values.type,
                        symbol: values.symbol,
                        lots: values.lots,
                        ticket: null,
                        client: consumer1._id.toString(),
                        state: config.orderStates.CREATING
                    });

                    res.order.history.should.be.an.Array;

                    done();
                });
            });
        });

        describe('#_handleProviderNewOrders', function() {
            it('should create order for both subscribers', function(done) {
                var _order = {
                    ticket: 123,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'comment'
                };

                provider1._handleProviderNewOrders([_order], function(err, res) {
                    res.should.be.an.Array;
                    res.length.should.be.equal(2);
                    res[0].should.have.keys('subscriber', 'tid', 'order', 'action', 'data');
                    res[1].should.have.keys('subscriber', 'tid', 'order', 'action', 'data');

                    done();
                });
            });
        });

        describe('#_handleProviderClosedOrders', function() {
            it('should close order with status CLOSING for all subscriber', function(done) {
                var _order = {
                    ticket: 123,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'comment'
                };

                consumer1.createOrder(_order, function(err, order) {

                    console.log('consumer1_id', consumer1._id.toString());
                    // provider1.getSubscribers(function(err, res) {
                    //     console.log(err, res);
                    //     done()
                    // })
                    provider1._handleProviderClosedOrders([order], function(err, res) {
                        res.length.should.be.equal(1);
                        res[0].order.state.should.be.equal(config.orderStates.CLOSING);
                        done();
                    });
                });
            });
        });


        describe('#handleProviderTerminalMessage', function() {
            it('should create new orders for each subscriber', function(done) {
                var _order = {
                    ticket: 123,
                    type: 1,
                    symbol: 'eurUsd',
                    lots: 0.01,
                    comment: 'comment'
                };

                provider1.handleProviderTerminalMessage([_order], function(err, res) {
                    res.length.should.be.equal(2);
                    res[0].action.should.be.equal('create');
                    res[1].action.should.be.equal('create');
                    done();
                });
            });
        });
    });
});
