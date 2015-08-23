import Slack from 'node-slack';
import config from 'config';
import {print} from '../utils';

const slack = new Slack('https://hooks.slack.com/services/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');
// const slack = new Slack('https://hooks.slack.com/services/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');
const {orderChanel, systemChannel} = config.slack;
const slackUsername = 'forexBot'
const sbqt = '`';

export let __useDefault = true;

export default slack;

export const actions = {
    systemMessage (message) {
        slack.send({
            text: message,
            channel: systemChannel,
            username: slackUsername
        });
    },

    terminalConnected (client = {}) {
        slack.send({
            text: `Терминал подключился по сокету ${print(client)}`,
            channel: systemChannel,
            username: slackUsername
        });
    },

    terminalDisconnect (client = {}) {
        slack.send({
            text: `Терминал отключился от сервера ${print(client)}`,
            channel: systemChannel,
            username: slackUsername
        });
    },

    terminalConnectError (messasge = 'no message') {
        slack.send({
            text: messasge,
            channel: systemChannel,
            username: slackUsername
        })
    },

    createNewOrder (client = {}, order = {}) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `Провайдер открыл ордер ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                break;
            case 'subscriber':
                if (order.state === config.orderStates.CREATING) {
                    message = `Обработка открытия ордера для подписчика ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                }
                else if (order.state === config.orderStates.CREATED) {
                    message = `Подписчик открыл ордер ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                }

                break;
        }

        slack.send({
            text: message,
            channel: orderChanel,
            username: slackUsername
        });
    },

    closeOrder (client = {}, order = {}) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `Провайдер закрыл ордер ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                break;

            case 'subscriber':
                if (order.state === config.orderStates.CLOSING) {
                    message = `Обработка закрытия ордера для подписчика ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                }
                else if (order.state === config.orderStates.CLOSED) {
                    message = `Подписчик закрыл ордер ${sbqt} [${print(client)}, ${print(order)}] ${sbqt} `;
                }
                break;

            default:
                message = 'клиент не определен';
        }

        slack.send({
            text: message,
            channel: orderChanel,
            username: slackUsername
        });
    }


};

