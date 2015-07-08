var express = require('express');
//var teams = require('./teams');
//var auth = require('./auth');
//var user = require('../app/controllers/users');
var router = express.Router();
var Client = require('../models/client');
var Order = require('../models/order');


/* Teams route */

router.get('/terminals', function(req, res, next) {

	Client.find({}, function(err, terminals) {
		if (err) return next(err);

		res.json(terminals);
	});
});

router.post('/terminals', function(req, res, next) {
	Client.create(req.body, function(err, e) {
		if (err) return next(err);
		res.json(e);
	});
});

router.get('/terminals/:subscriber/subscriptions', function(req, res, next) {


	Client.findById(req.params.subscriber, function(err, terminal) {

		if (err) return next(err);

		if (!terminal) return next(new Error(404, 'not found error'));

		Client.find({subscriptions: {$in: terminal.subscriptions}}, function(err, s) {
	if (err) return next (err);
			res.json(s);
		});
	});
});

module.exports = router;
