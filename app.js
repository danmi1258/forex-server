var express = require('express');
var http = require('http');
var database = require('./app/database/adapter');
var mongoose = require('mongoose');
var path = require('path');
var config = require('config').get('server');
var bodyParser = require('body-parser');
var passport = require('./app/utils/passport');
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);
var auth = require('./app/middleware/auth').auth;
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
app.use(session({
    secret: 'afk;j4fhdfuhekl',
    cookie: {
            path: "/",
            httpOnly: true,
            maxAge: null
        },
    key: 'sid',
    store: new MongoStore({'db': mongoose.connections[0].name}),
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

socket.start();



/* ***********************/
/* M I D D L E W A R E
 /* ***********************/

app.use(auth);

/* ***********************/
/* R O U T E S
 /* ***********************/

/* api route entry point */
app.use('/api', apiRoutes);


/* ***********************/
/* E R R O R S
 /* ***********************/

/* 404 route note found */
app.use(function(req, res) {
    res.status(404).json({error: 404, message: 'route not found'});
});

/* error handler */
app.use(function(err, req, res, next) {
    logger.error(err.message);
    res.status(err.status || 500).json({
        status: err.status,
        name: err.name,
        message: err.message
    });
    next();
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
