import {getSocketByTid} from '../../sockets/terminalSocket/socket';
import _ from 'underscore';


function arrayNetStatusMixin(data, callback) {
    _.each([{a:1}], (e) => {
        e.b=1;
        console.log(e);
    })

    _.each(data, (e) => {
        console.log(1, e)
        e.netStatus = !getSocketByTid(e.tid);
        console.log(data[0] == e);
        console.log(2, e);
    });
    callback(null, data);
}

function objectNetStatusMixin(client, callback) {
    client.netStatus = !!getSocketByTid(client.tid);
    callback(null, client);
}

export default function mixin(data, req, res, next) {

    function response(err, data) {
        res.json(data);
    }

    _.isArray(data) ? arrayNetStatusMixin(data, response) : 
                      objectNetStatusMixin(data, response);
}