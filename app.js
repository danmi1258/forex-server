require('./app/database/adapter');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var path = require('path');
var config = require('config');
var bodyParser = require('body-parser');
var passport = require('./app/utils/passport');
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);
var auth = require('./app/middleware/auth').auth;
var cors = require('cors');
var logger = require('./app/utils/logger');
var apiRoutes = require('./app/routes');
var socket = require('./app/socket');
var app = express();
var server = http.createServer(app);
var sessionStore = new MongoStore({'db': mongoose.connections[0].name});
require('./app/sockets/webSocket/socketIO')(server, sessionStore);


app.use(cors({origin: /localhost.*/, credentials: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'app/static/client')));
app.use(session({
    secret: config.get('session').secret,
    cookie: config.get('session').cookie,
    key: config.get('session').key,
    store: sessionStore,
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


/****   S E R V E R    **********************************************/



server.listen(config.get('server').port, function() {
    logger.info('[Server]: start server on port:', config.get('server').port);
});




module.exports = app;
