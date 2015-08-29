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
var router = require('./app/routes');
var app = express();
var server = http.createServer(app);
var sessionStore = new MongoStore({'db': mongoose.connections[0].name});
var slack = require('./app/integrations/slack');

require('./app/sockets/webSocket/socketIO')(server, sessionStore);


// var agent = require('webkit-devtools-agent');
// agent.start()

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

var socket = require('./app/sockets/terminalSocket/socket');
socket.start();

/* ***********************/
/* M I D D L E W A R E
 /* ***********************/

app.use(auth);

/* ***********************/
/* R O U T E S
 /* ***********************/

/* api route entry point */
app.use(router);

/* ***********************/
/* E R R O R S
 /* ***********************/

/* 404 route note found */
app.use(function(req, res) {
    res.status(404).json({error: 404, message: 'route not found'});
});

/* error handler */
app.use(function(err, req, res, next) {
    logger.error(err);
    res.status(err.status || 500).json({
        status: err.status,
        name: err.name,
        message: err.message
    });
    next();
});


/****   S E R V E R    **********************************************/

let sbqt = '`';
let {port, host} = config.get('server');
let message = `Сервер запущен. ${sbqt} prot:${port}, host:${host} ${sbqt}`;
slack.actions.systemMessage(message);

server.listen(config.get('server').port, function() {
    logger.info(`[Server]: Start server on port: ${config.get('server').port}`);
    logger.info(`under environment: ${process.env.NODE_ENV || 'default'}`);
    logger.info(`used db: ${config.get('database').uri}`);
});


module.exports = app;
