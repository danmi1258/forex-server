


/*
    Тест проверки автоматического копирования ордеров.
    ==================================================

    
    Подготовка:
    -----------

    * Создать провайдера pr1
    * Создать подписчика sb1
    * Подписать подписчика на провайдера

    Тест1
    -----
    
    Что делаем:
    
    * Создаем два ордера прямым обращением к провайдеру #createOrder

    Что проверяем:

    * У провайдера должно создаться два ордера со статусом CREATED (12)
    * У подписчика должно создаться два ордера со статусом CREATING (11) с соответствующими лотами
    
    Тест2
    -----

    Что делаем:

    * Отправляем пустой массив на функцию #checkOnChanges

    Что проверяем:

    * У провайдера должны закрыться оба ордера со статусом CLOSED(21)
    * У подписчика должны закрыться оба ордера со статусом CLOSING(21)
    
*/

import db from './vendor/db';
import async from 'async';
import should from 'should';
import Provider from './../app/models/provider';
import Subscriber from './../app/models/subscriber';
import Order from './../app/models/order';

describe('#prepare', function () {

    var provider, subscriber;

    before(done => {

        async.waterfall([
            function (next) {
                db.clear(next);
            },
            function (next) {
                new Provider({name: 'pr1', password: '1', tid: '1'}).save(next);
            },
            function (_provider, n, next) {
                provider = _provider;
                new Subscriber({name: 'sb1', password: '1', tid: '2'}).save(next);
            },
            function(s, n, next) {
                subscriber = s;
                subscriber.subscribe(provider.id, next);
            },
            function(res, next) {
                subscriber.setMatchedLots(provider.id, 0.05, next);
            }
        ], done);
    });

    describe('#openOrder', () => {

        // {type: Args.INT | Args.Required},
            // {lots: Args.FLOAT | Args.Required},
            // {symbol: Args.STRING | Args.Required},
            // {comment: Args.STRING | Args.Optional, _default: "comment"},
            // {ticket:
        
        let order1 = {
            ticket: 12345,
            type: 0,
            lots: 0.01,
            symbol: "EURUSD",
            comment: 'sell',
        }

        let order2 = {
            ticket: 54321,
            type: 0,
            lots: 0.01,
            symbol: "EURUSD",
            comment: 'buy',
        }

        it('should create new order for provider', done => {
            async.series([
                provider.openOrder.bind(provider, order1),    
                provider.openOrder.bind(provider, order2),
                function(next) {
                    setTimeout(() => {
                        Order.find({client: subscriber.id}, next)
                    }, 100);
                }
            ], function(err, res) {
                
                res[0].should.have.properties({
                    ticket: 12345,
                    client: provider.id,
                    state: 12
                })

                res[1].should.have.properties({
                    ticket: 54321,
                    client: provider.id,
                    state: 12
                })

                res[2].should.be.an.Array;
                
                res[2][0].should.have.properties({
                    ticket: null,
                    lots: 0.05,
                    state: 11,
                    client: subscriber.id,
                    masterOrderId: res[0].id
                })

                res[2][1].should.have.properties({
                    ticket: null,
                    lots: 0.05,
                    state: 11,
                    client: subscriber.id,
                    masterOrderId: res[1].id
                })

                done()                
            })
        })
    });

    
    /* check the find difference */
    describe('checkOnChanges', () => {

        it('should has two order for closing', (done) => {
            provider.checkOnChanges([], (err, res) => {

                res.newOrders.length.should.equal(0);
                res.closedOrders.length.should.equal(2);
                done()
            })
        })
    })

    /* check closing orders */
    describe('closeOrders', () => {
        it('should close all orders for provider and subscriber', done => {
            async.waterfall([
                provider.checkOnChanges.bind(provider, []),
                function(res, next) {
                    async.eachSeries(res.closedOrders, provider.closeOrder.bind(provider), next);
                },
                function(next) {
                    setTimeout(() => {
                        Order.find({client: subscriber.id}, next);
                    }, 100)
                },
                function(res, next) {
                    res.should.be.an.Array;
                    res[0].state.should.be.equal(21);
                    res[1].state.should.be.equal(21);
                    next()                    
                }
            ], done);
        })
    })
});
