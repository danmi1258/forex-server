import Slack from 'node-slack';
import config from 'config';

const slack = new Slack('https://hooks.slack.com/services/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');
// const slack = new Slack('https://hooks.slack.com/services/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');
const {orderChanel, systemChanel} = config.slack;
const slackUsername = 'forexBot'

export let __useDefault = true;

export default slack;

export const actions = {
    terminalConnected (client = {}) {
        slack.send({
            text: `terminal [name: ${client.name}, tid: ${client.tid}] is conected`,
            channel: systemChanel,
            username: slackUsername
        });
    },

    terminalDisconnect (client = {}) {
        slack.send({
            text: `terminal [name: ${client.name}, tid: ${client.tid}] is disconected`,
            channel: systemChanel,
            username: slackUsername
        });
    },

    terminalConnectError (messasge = 'no message') {
        slack.send({
            text: messasge,
            channel: systemChanel,
            username: slackUsername
        })
    },

    createNewOrder (client = {}, order = {}) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `provider [${client.name}, ${client.tid}] create new order [ticket: ${order.ticket}]`;
                break;
            case 'subscriber':
                if (order.state === config.orderStates.CREATING) {
                    message = `subscriber [${client.name}, ${client.tid}] copied new order [ticket: ${order.ticket}]`;
                }
                else if (order.state === config.orderStates.CREATED) {
                    message = `subscriber [${client.name}, ${client.tid}] confirm new order creation [ticket: ${order.ticket}]`;
                }

                break;
        }

        console.log('##########', message, systemChanel, slackUsername);

        slack.send({
            text: message,
            channel: systemChanel,
            username: slackUsername
        });
    },

    closeOrder (client = {}, order = {}) {
        let message;

        switch (client._title) {
            case 'provider':
                message = `provider [${client.name}, ${client.tid}] closed the order [ticket: ${order.ticket}]`;
                break;
            case 'subscriber':
                if (order.state === config.orderStates.CREATING) {
                    message = `subscriber [${client.name}, ${client.tid}] start to closing order [ticket: ${order.ticket}]`;
                }
                else if (order.state === config.orderStates.CREATED) {
                    message = `subscriber [${client.name}, ${client.tid}] confirmed to close order [ticket: ${order.ticket}]`;
                }

                break;
        }

        slack.send({
            text: message,
            channel: systemChanel,
            username: slackUsername
        });
    }


};

