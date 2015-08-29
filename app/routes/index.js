import _ from 'underscore';
import config from 'config';
import express from 'express';
import authRoutes from './authRoutes';
import passport from '../utils/passport';
import normalizeUrl from 'normalize-url';
import restify from 'express-restify-mongoose';
import {Provider, Subscriber, Order} from '../models';
import providerRoutes from './providerRoutes';
import subscriberRoutes from './subscriberRoutes';


const router = new express.Router();

function redirect(qExt, url='', req, res) {
    let query = '?';
    const {host, port} = config.server;

    _.extend(req.query, _.isString(qExt) ? {[qExt]:req.params.id} : qExt);
    _.each(req.query, (v,k) => {query += `${k}=${v}&`});

    url = normalizeUrl(`${host}:${port}/api/v1/${url}`);
    url += query;

    res.redirect(url);
}


restify.serve(router, Order);
restify.serve(router, Provider, {lean: false});
restify.serve(router, Subscriber, {lean: false});

/**** AUTH    R O U T E S *************************************/

router.get('/login', authRoutes.isLoggedIn);
router.get('/logout', authRoutes.logout);
router.post('/login', passport.authenticate('local'), authRoutes.login);


/**** P R O V I D E R    R O U T E S **************************/

router.get('/api/v1/providers/:id/orders', redirect.bind(this, 'client', 'orders'));
router.get('/api/v1/providers/:id/subscribers', providerRoutes.GET.subscribers);

router.post('/api/v1/providers/:id/openOrder', providerRoutes.POST.order);
// router.post('/api/v1/providers/:id/stopSubscriptions', providerRoutes.POST.stopSubscriptions);



/**** S U B S C R I B E R    R O U T E S  *********************/

router.get('/api/v1/subscribers/:id/orders', redirect.bind(this, 'client', 'orders'));
router.get('/api/v1/subscribers/:id/subscriptions', subscriberRoutes.GET.subscriptions);

router.post('/subscribers/:id/subscribe', subscriberRoutes.POST.subscribe);
router.post('/subscribers/:id/unsubscribe', subscriberRoutes.POST.unsubscribe);


/**** O R D E R S    R O U T E S ******************************/

// router.get('/orders');
// router.get('/orders/:id');
// router.get('/orders/:id/history', orderRoutes.GET.history);
// router.get('/:client/:id/orders', orderRoutes.GET.orders);

// router.post('/orders/');
// router.post('/orders/:id/close');
// router.post('/:client/:id/orders', orderRoutes.POST.order);

// router.put('/orders/:id', orderRoutes.PUT.order);

/***  TERMINALS   *********************************************/

// router.get('/terminals/', terminalRoutes.GET.terminals);


export default router;
