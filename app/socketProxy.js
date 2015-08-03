var server = null;
var getSocketByTid = null;

module.exports = {
    getServer: function() {
        return server;
    },
    setServer: function(_server) {
        server = _server;
    },
    setSocketGetter: function(fn) {
        getSocketByTid = fn;
    },
    getSocketByTid: function(tid) {
        return getSocketByTid(tid);
    }

};
