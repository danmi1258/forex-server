var moloko = require('moloko');

var server = moloko.server({
    host: 'localhost',
    port: 9000
});


function start() {
    server.on('listening', function() {
        console.log('Server is started listening');
    });

    server.on('connection', function(socket) {
        console.log('New connection is accepted');
        console.log('socket', socket);
        //socket.interval = setInterval(function() {
        //	var data = { message: 'Test Message: ' + Date.now() }
        //	console.log('Send message to client:', data);
        //	server.send(socket, data);
        //}, 2000);

    });

    server.on('error', function(err) {
        console.log('Error occured during server socket creation: ', err);
    });

    server.on('close', function(socket) {
        console.log('Client is disconnected');
        clearInterval(socket.interval);
    });

    server.on('message', function(socket, message) {
        console.log('Message is received from client:', message);

        // We can send echo response
        //server.send(socket, message);
    });
}

module.exports = {
    start: start
};