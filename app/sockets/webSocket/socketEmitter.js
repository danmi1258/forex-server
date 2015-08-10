module.exports = function(io) {
    io.on('connection', function (socketIO) {
        console.log('!!!!!!!!!!, client is connected');
        socketIO.emit('news', { hello: 'world' });
        socketIO.on('my other event', function (data) {
            console.log(data);
        });
        socketIO.on('disconnect', function () {
            console.log('user disconnected');
        });
    });
};
