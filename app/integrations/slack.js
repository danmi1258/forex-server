import Slack from 'node-slack';
import config from 'config';
import {print} from '../utils';

const slack = new Slack('https://hooks.slack.com/services/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');
// const slack = new Slack('https://hooks.slack.com/services/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');
const {orderChannel, systemChannel} = config.slack;
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

    createNewOrder (client = {}, orderTicket) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `Провайдер открыл ордер ${sbqt} [${print(client)}, ticket: ${orderTicket}] ${sbqt} `;
                break;
            case 'subscriber':
                message = `Подписчик подтвердил открытие ордера ${sbqt} [${print(client)}, ticket: ${orderTicket}] ${sbqt} `;
                break;
        }

        slack.send({
            text: message,
            channel: orderChannel,
            username: slackUsername
        });
    },

    closeOrder (client = {}, orderTicket) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `Провайдер закрыл ордер ${sbqt} [${print(client)}, ticket: ${orderTicket}] ${sbqt} `;
                break;
            case 'subscriber':
                message = `Подписчик подтвердил закрытие ордера ${sbqt} [${print(client)}, ticket: ${orderTicket}] ${sbqt} `;
                break;
        }

        slack.send({
            text: message,
            channel: orderChannel,
            username: slackUsername
        });
    }


};

