import * as mdsoc from './socket';
import * as slack from '../../integrations/slack';
import {messageTypes} from 'config';
import logger from '../../utils/logger';
import async from 'async';
import Args from 'args-js';
import {print as p$} from '../../utils';

/* memo */
let getClientByTid = null;
function _findClientByTid(tid, callback) {
    if (sc && sc.client) {
        callback(null, sc.client);
    } 
    else {
        if (!getClientByTid) getClientByTid = require('../../models/methods').getClientByTid;
        getClientByTid(tid, callback);
    }
}

export function messageBindReqHandler(socket, message) {

    _findClientByTid(message.data.tid, (err, client) => {
        if (err) {
            mdsoc.server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 403
            });

            logger.warn('[messageBindReqHandler] Терминал не смог подключиться', err);
            return;
        }

        /* 
        check terminal tocken there... you code 
        */

        /* set data */
        socket.client = client;
        socket.tid = message.data.tid;
        socket.openOrdersCount = null;

        /* store socket */
        mdsoc.storeSocket(socket);

        /* emmit message */
        mdsoc.server.send(socket, {
            type: messageTypes.BIND_CONF,
            code: 0
        });
        let {name, tid, id} = client
        logger.info(`Терминал установил соединение. ${p$(client)}`);
        slack.actions.terminalConnected(client);
    })
}

export function orderIndHandler(socket, message) {

    /* map message for history data */
                    // var datas = message.data.open_orders.map(function(e) {
                    //     return {
                    //         lots: e.lots,
                    //         profit: e.profit,
                    //         swap: e.swap,
                    //         time: new Date().getTime(),
                    //         ticket: e.ticket
                    //     };
                    // });

                    // /* save history */
                    // datas.forEach(function(e) {
                    //     Order.saveHistory(e.ticket, e);
                    // });

    _findClientByTid(socket.tid, (err, client) => {
        if (err) return logger.error('[orderIndHandler#_findClientByTid]', err);

        let {open_orders} = message.data;

        if (client._title === 'provider' && socket.openOrdersCount !== open_orders.length) {
            
            socket.openOrdersCount = open_orders.length;
            
            client.checkOnChanges(open_orders, (err, res) => {
                if (err) return logger.error('[orderIndHandler#checkOnChanges]', err);

                res.newOrders ? async.eachSeries(res.newOrders, client.openOrder.bind(client)) : 0;
                res.closedOrders ? async.eachSeries(res.closedOrders, client.closeOrder.bind(client)) :  0;
            });
        }
    });
}


export function orderOpenReqHandler(tid, order) {

    let socket = mdsoc.gegSocketByTid(tid);
    if (!socket) return logger.warn(`Запрос на создание ордера не удачный. Терминал tid:${tid} в офлайне`);

    try {
        var args = new Args([
            {reference: Args.STRING | Args.Required},
            {type: Args.INT | Args.Required},
            {symbol: Args.STRING | Args.Required},
            {lots: Args.FLOAT | Args.Required},
            {comment: Args.STRING | Args.Required},
        ], [order]);
    }
    catch(err) {
        return logger.error('[OrderOpenReqHandler]', err);
    }

    let data = {
        type: messageTypes.ORDER_OPEN_REQ,
        reference: order.reference,
        data: {
            type: order.type,
            symbol: order.symbol,
            lots: order.lots,
            comment: order.comment || "default comment"
        }
    };

    socketServer.send(socket, data);
}


export function orderCloseReqHandler(tid, order) {

    let socket = mdsoc.gegSocketByTid(tid);
    if (!socket) return logger.warn(`Терминал tid=${args.client.tid} в офлайне`);

    try {
        var args = new Args([
            {lots: Args.FLOAT | Args.Required},
            {ticket: Args.INT | Args.Required},
            {reference: Args.STRING | Args.Required},
        ], [order]);
    }
    catch(err) {
        return logger.error('[orderCloseReqHandler]', err);
    }

    let data = {
        type: messageTypes.ORDER_CLOSE_REQ,
        reference: order.reference,
        data: {
            lots: order.lots,
            ticket: order.ticket
        }
    }

    socketServer.send(socket, data);
}


/* only for suscribers */
export function orderOpenConfHandler(socket, message) {
    _findClientByTid(socket.tid, (err, client) => {
        if (err) return logger.error('[OrderOpenConfHandler]', err);
        client.confirmOrderCreation(message.reference, message.data.ticket);
        // перенести уведомление в функцию slack.actions.createNewOrder(client, order)

    });
}

/* only for subscribers */
export function orderCloseConfHandler(socket, message) {
    _findClientByTid(socket.tid, (err, client) => {
        if (err) return logger.error('[OrderCloseConfHandler]', err);
        client.confirmOrderClosing(message.data.ticket);
    });
}