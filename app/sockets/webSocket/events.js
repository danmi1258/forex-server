/* web socket events */

module.exports.events = {
    /*
    hash:
    {
        client: Object,
        action: 'created, updated, deleted',
        Affectedfields: {} // for updated action only
    }
    */
    clientAction: 'CLIENT_ACTION',
    
    /*
    hash:
    {
        subscriber: Object
        provider: Object
        action: subscribe/unsubscribe
    }
    */
    subscriptionAction: 'SUBSCRIPTION_ACTION',
    
    /*
    Order actions
    =============
    {
        order: Object,
        owner: Object
        action: 'created, updated, deleted',
        Affectedfields: {} // for updated action only
    }
    */

    orderAction: 'ORDER_ACTION',

    /*
    Terminal action
    ===============

    {
        client: Object
        action: connected/disconnected
    }
    */

    terminalAction: 'TERMINAL_ACTION'
}