var express = require('express');
var http = require('http');
var database = require('./app/database/adapter');
var path = require('path');
var config = require('config').get('server');
var bodyParser = require('body-parser');

//var auth = require('./app/middleware/auth');
//var api = require('./app/routes');

//var errors = require('./errors');
var logger = require('./app/utils/logger');
//var setCurUser = require('./middleware/currentUser');
var apiRoutes = require('./app/routes');
//var authRoute = require('./routes/auth');
var socket = require('./app/socket');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'app/static/client')));

socket.start();



/* ***********************/
/* M I D D L E W A R E
 /* ***********************/

/* set current user */
//app.use(setCurUser);

/* set current team */
//app.all('/:id/*', require('./middleware/currentTeam'));


/* ***********************/
/* R O U T E S
 /* ***********************/

/* api route entry point */
//app.use('/fx', auth.auth());

/* auth route entry point */

app.use('/fx/api', apiRoutes);

//app.get('/',function(req, res, next) {
//    res.json({route: 'no route'});
//})
/* ***********************/
/* E R R O R S
 /* ***********************/

/* 404 route note found */
app.use(function(req, res, next) {
    res.status(404).json({error: 404, message: 'route not found'});
});

/* error handler */
app.use(function(err, req, res, next) {
    logger.error(err.stack);
    res.status(err.status || 500).json(err);
});

/* ***********************/
/* S E R V E R
 /* ***********************/

/* create server */

//var server = app.listen(config.port, function() {
//    logger.info('[Server]: start server on port:', config.port);
//    server.close(function() { console.log('Doh :('); });
//});

http.createServer(app).listen(config.port, function() {
    logger.info('[Server]: start server on port:', config.port);
});

module.exports = app;