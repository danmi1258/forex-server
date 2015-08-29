import mongoose from 'mongoose';
import BaseSchema from './base';
import {getSocketByTid} from '../sockets/terminalSocket/socket';
import 'mongoose-schema-extend';

/**
    @class Client
    @extends Default
 */
let Schema = BaseSchema.extend({
    name: {
        type: String,
        required: true,
        unique: true
    },

    /* the terminal access code */
    token: String,

    /* terminal id */
    tid: {
        type: Number,
        required: true,
        unique: true
    }
});

Schema.virtual('online')
    .get(function() {
        return !!getSocketByTid(this.tid);
    });

Schema.set('toObject', { virtuals: true });
Schema.set('toJSON', { virtuals: true });


export default Schema;