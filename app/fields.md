Client
======

    name: String,
    
    /* ids of a terminal-providers */
    subscriptions: Array,
    
    /* id of the orders opened in the terminal */
    openOrders: Array,
    
    /* the terminal access code */
    token: String,
    
    /* terminal id */
    tid: Number,
    
    /* terminal type in HEX: provider(0x01010) / consumer (0x1020) */
    type: String


Order
=====
    
    ticket: Number,
    
    // ID of the native terminal (Client)
    client: {type: String, require: true},
    
    // type of order's direct: buy, sell
    type: {type: Number, require: true},
    
    // currency pare example: EUR/USD
        symbol: {type: String, require: true},
    
    // volume
    lots: {type: Number, require: true},
    
    // status: 11-opening, 12-opened, 21-closing, 22-closed
    state: {type: Number, default: 0},
    
    // History of the trading. Hash:
    history: Array,
    
    // has value then the order opened in the terminal(confirm open order)
    openedOn: Date,
    
    // has value then the order closed in the terminal (confirm close order)
    closedOn: Date
