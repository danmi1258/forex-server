export { default as Base } from './base';
export { default as Client } from './client';
export { default as Methods } from './methods';
export { default as Order } from './order';
export { default as Provider } from './provider';
export { default as Subscriber } from './subscriber';
export {default as User } from './user';

import { default as Client } from './client';
import { default as Base } from './base';
import { default as Methods } from './methods';
import { default as Order } from './order';
import Provider from './provider';
import { default as Subscriber } from './subscriber';
import {default as User } from './user';

const match = {
    users: User,
    orders: Order,
    providers: Provider,
    subscribers: Subscriber
}

export function getModel(name) {
    return match[name.toLowerCase()];
}
