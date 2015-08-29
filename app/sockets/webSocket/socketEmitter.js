import _ from 'underscore';

let socketsStore = {};

export function getSocket(id) {
    return socketsStore.id;
}

export function storeSocket(socket) {
    socketsStore[socket.id] = socket;
}

export function removeSocket (socket) {
    delete socketsStore[socket.id];
}

export function emit(eventName, data) {
    _.each(socketsStore, (v, k) => {
        v.emit(eventName, data);
    });
}


export default function(io) {
    io.on('connection', function (socketIO) {
        storeSocket(socketIO);

        console.log('!!!!!!!!!!, client is connected');
        socketIO.emit('news', { hello: 'world' });
        socketIO.on('my other event', function (data) {
            console.log(data);
        });
        socketIO.on('disconnect', function (socketIO) {
            console.log('user disconnected');
        });
    });
};
