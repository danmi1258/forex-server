import moloko from 'moloko';
import config, {messageTypes} from 'config';
import async from 'async';
import _ from 'underscore';
import logger from '../../utils/logger';
import {actions} from '../../integrations/slack';
import * as mh from './handlers';



let sockets = [];

export let server = moloko.server({
    host: config.get('moloko').host,
    port: config.get('moloko').port
});

/* METHODS
 =============================================*/

export function getSocketByTid(tid) {
    return _.findWhere(sockets, {tid: tid});
}

export function storeSocket(socket) {
    let ind = sockets.indexOf(socket);

    if (ind === -1) {
        sockets.push(socket);
    } 
    else {
        sockets[ind] = socket;
        let message = `[storeSocket] Сокет tid=${socket.tid} был обновлен.`;
        logger.warn(message);
        actions.systemMessage(message);
    }
}

export function removeSocket(socket) {
    let index = sockets.indexOf(socket);
    index !== -1 && sockets.splice(index, 1);
}

export function authSocket(socket, tid, token, callback) {

    // временная заглушка
    return callback(null);

    if (!socket.tid) {
        logger.error('[authSocket] Argunets error. Property "socket.tid" required');
        return callback(Error('socket.tid required'));
    }

    dbMethods.getClientByTid(socket.tid, function(err, client) {
        if (err) {
            logger.error('[authSocket] client with tid=%d not found: ', socket.tid, err);
            return callback(err);
        }

        client.token === token ? callback(null) : callback(Error('403. Auth error, bad token.'));
    });
}


/* MESSAGES
 ==============================================*/

export function start() {
    server.on('listening', function() {
        logger.info('Moloko socket start to listening on port', config.get('moloko').port);
    });

    server.on('connection', function() {
        logger.info('New connection is accepted');
    });

    server.on('error', function(err) {
        logger.error('on error server event', err);
    });

    server.on('close', function(socket) {
        removeSocket(socket);
        let message = `Терминал tid=${socket.tid} отключился`;
        logger.info(message);
        actions.systemMessage(message);
    });


    /*
     message hash:
     type: {Integer} operation code
     data: {
     open_orders: {Array} see below ArrayObject
     }

     ArrayObject: {
     lots {Float} - lots amount
     open_price {Float}
     open_time {Integer} - time in unix format
     profit {}
     swap {}
     symbol {String}
     take_profit {Float} current profit
     ticket {Integer} unique order ticket number
     type {}
     }

     */
    server.on('message', function(socket, message) {
        switch(message.type) {
            case messageTypes.BIND_REQ:
                mh.messageBindReqHandler(socket, message);
                break;

            case messageTypes.ORDERS_IND:
                mh.orderIndHandler(socket, message);
                break;

            case messageTypes.ORDER_OPEN_CONF:
                mh.orderOpenConfHandler(socket, message);
                break;

            case messageTypes.ORDER_CLOSE_CONF:
                mh.orderCloseConfHandler(socket, message);
                break;
        }
    });
};

// module.exports.getServer = function() {
//     return server;
// };

// module.exports.getSocketByTid = getSocketByTid;

// module.exports.tests = {
//     getSocketByTid: getSocketByTid,
//     storeSocket: storeSocket,
//     removeSocket: removeSocket,
//     authSocket: authSocket,
//     messageBindReq: messageBindReq,
//     sockets: sockets
// };



