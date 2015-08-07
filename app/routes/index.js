var express = require('express');
var router = new express.Router();
var providerRoutes = require('./providerRoutes');
var subscriberRoutes = require('./subscriberRoutes');
var terminalRoutes = require('./terminalRoutes');
var orderRoutes = require('./orderRoutes');
var authRoutes = require('./authRoutes');
var passport = require('../utils/passport');

/**** AUTH    R O U T E S *************************************/

router.get('/login', authRoutes.isLoggedIn);
router.get('/logout', authRoutes.logout);
router.post('/login', passport.authenticate('local'), authRoutes.login);

// router.get('/logout', passport.logout);

/**** P R O V I D E R    R O U T E S **************************/

router.get('/providers', providerRoutes.GET.providers);
router.get('/providers/:id', providerRoutes.GET.provider);
router.get('/providers/:id/orders', providerRoutes.GET.orders);
router.get('/providers/:id/subscribers', providerRoutes.GET.subscribers);

router.post('/providers', providerRoutes.POST.provider);
router.post('/providers/:id/openOrder', providerRoutes.POST.openOrder);
// router.post('/providers/:id/stopSubscriptions', providerRoutes.POST.stopSubscriptions);

//router.put('/providers/:id', providerRoutes.PUT.provider);

// router.delete('/providers', providerRoutes.DELETE.provider);


/**** S U B S C R I B E R    R O U T E S  *********************/

router.get('/subscribers', subscriberRoutes.GET.subscribers);
router.get('/subscribers/:id', subscriberRoutes.GET.subscriber);
router.get('/subscribers/:id/orders', subscriberRoutes.GET.orders);
router.get('/subscribers/:id/subscriptions', subscriberRoutes.GET.subscriptions);

router.post('/subscribers', subscriberRoutes.POST.subscriber);
router.post('/subscribers/:id/subscribe', subscriberRoutes.POST.subscribe);
router.post('/subscribers/:id/unsubscribe', subscriberRoutes.POST.unsubscribe);

// router.put('/subscribers/:id/stopSubscription', subscriberRoutes.POST.stopSubscriptions);


/**** O R D E R S    R O U T E S ******************************/

router.get('/orders');
router.get('/orders/:id');

router.post('/orders/');
router.post('/orders/:id/close');

router.put('/orders/:id', orderRoutes.PUT.order);

/***  TERMINALS   *********************************************/

// router.get('/terminals/', terminalRoutes.GET.terminals);


module.exports = router;
