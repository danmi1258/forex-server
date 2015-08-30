import _ from 'underscore';
import logger from '../utils/logger';
import config from 'config';
import express from 'express';
import authRoutes from './authRoutes';
import passport from '../utils/passport';
import normalizeUrl from 'normalize-url';
import restify from 'express-restify-mongoose';
import {Provider, Subscriber, Order} from '../models';
import providerRoutes from './providerRoutes';
import subscriberRoutes from './subscriberRoutes';
import {emit, events, normalize} from '../sockets/webSocket';


const router = new express.Router();

/** 
Allow to create custom routing on restfull 

Example:
GET /api/v1/providers/:id/orders?q
to:
GET /api/v1/orders?q&client=:id

@param qExt {Object | String} extension for query
@param url {String} new url. Ex: /api/v1/[url]
*/
function redirect(qExt, url='', req, res) {
    
    let query = '?';
    const {host, port} = config.server;

    _.extend(req.query, _.isString(qExt) ? {[qExt]:req.params.id} : qExt);
    _.each(req.query, (v,k) => {query += `${k}=${v}&`});

    url = normalizeUrl(`${host}:${port}/api/v1/${url}`);
    url += query;

    res.redirect(url);
}


/* set default options for restify */
const defaultOptions = {
    lean: false,
    outputFn (req, res, data) {
        /* send data */
        res.json(data.result);
        /* ignore GET method */
        if (req.method === 'GET') return;
        /* create data object for socket */
        const result = normalize(req, data.result);
        /* try to get event name automaticaly */
        try {
            const eventName = events[req.path.split('/')[3]][result.action];
        }
        catch (err) {
            logger.error('web socket error', err);
            return;
        }
        /* send socket event from all active clients */
        emit(eventName, normalize(req, data.result));
    }
}


/* set restify routes */
restify.serve(router, Order, defaultOptions);
restify.serve(router, Provider, defaultOptions);
restify.serve(router, Subscriber, defaultOptions);


/**** AUTH    R O U T E S *************************************/

router.get('/api/v1/login', authRoutes.isLoggedIn);
router.get('/api/v1/logout', authRoutes.logout);
router.post('/api/v1/login', passport.authenticate('local'), authRoutes.login);


/**** P R O V I D E R    R O U T E S **************************/

router.get('/api/v1/providers/:id/orders', redirect.bind(this, 'client', 'orders'));
router.get('/api/v1/providers/:id/subscribers', providerRoutes.GET.subscribers);

router.post('/api/v1/providers/:id/openOrder', providerRoutes.POST.order);
// router.post('/api/v1/providers/:id/stopSubscriptions', providerRoutes.POST.stopSubscriptions);



/**** S U B S C R I B E R    R O U T E S  *********************/

router.get('/api/v1/subscribers/:id/orders', redirect.bind(this, 'client', 'orders'));
router.get('/api/v1/subscribers/:id/subscriptions', subscriberRoutes.GET.subscriptions);

router.post('/api/v1/subscribers/:id/subscribe', subscriberRoutes.POST.subscribe);
router.post('/api/v1/subscribers/:id/unsubscribe', subscriberRoutes.POST.unsubscribe);


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

router.get('/api/v1/test', function(req, res, next) {
    // emit({a:1});
    res.json('ok');
})

export default router;
