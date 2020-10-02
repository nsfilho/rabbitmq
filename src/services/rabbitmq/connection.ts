/**
 * RabbitMQ Library
 * Copyright (C) 2020 E01-AIO Automação Ltda.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Nelio Santos <nsfilho@icloud.com>
 * 
 */
/* eslint-disable no-console */

/**
 * VERY IMPORTANT: don't try to import logger here (egg-or-chicken paradox)
 */
import amqp, { ConsumeMessage } from 'amqplib';
import { nanoid } from 'nanoid';
import {
    RABBITMQ_URL,
    RABBITMQ_RETRIES_INTERVAL,
    RABBITMQ_DEBUG_CONSOLE,
    RABBITMQ_INTERVAL_CONNECTION_CHECK,
} from '../../constants';

/**
 * Internal control
 */
const internalState: {
    connection: amqp.Connection | null;
    started: boolean;
} = {
    started: false,
    connection: null,
};

const waitOtherInstanceConnect = (): Promise<amqp.Connection> =>
    new Promise((resolve) => {
        const myId = nanoid();
        setInterval(() => {
            if (internalState.connection !== null) resolve(internalState.connection);
            else if (RABBITMQ_DEBUG_CONSOLE)
                console.log(`RABBITMQ(${myId}): waiting other parallel call to connected...`);
        }, RABBITMQ_INTERVAL_CONNECTION_CHECK);
    });

/**
 * A infinite looping to get you a reliable and stable connection to RabbitMQ
 */
export const getConnection = async (): Promise<amqp.Connection> => {
    if (internalState.connection !== null) return internalState.connection;
    if (internalState.started) return waitOtherInstanceConnect();
    internalState.started = true;
    return new Promise((resolve) => {
        let retriesCount = 0;
        const retriesInterval = setInterval(async () => {
            try {
                internalState.connection = await amqp.connect(RABBITMQ_URL);
                clearInterval(retriesInterval);
                if (RABBITMQ_DEBUG_CONSOLE) console.log(`RABBITMQ(${retriesCount}): connected!`);
                resolve(internalState.connection);
            } catch (err) {
                retriesCount += 1;
                if (RABBITMQ_DEBUG_CONSOLE)
                    console.error(
                        `RABBITMQ(${retriesCount}): Failed to connect, retry in: ${RABBITMQ_RETRIES_INTERVAL}s`,
                    );
            }
        }, RABBITMQ_RETRIES_INTERVAL);
    });
};

/**
 * Disconnect in a secure way from RabbitMQ
 */
export const disconnect = async (): Promise<void> => {
    if (internalState.connection !== null) {
        const { connection } = internalState;
        await connection.close();
        internalState.connection = null;
    }
};

interface ChannelVault {
    name: string;
    channel?: amqp.Channel;
    consuming: boolean;
    events: {
        correlationId: string;
        callback: (message: ConsumeMessage) => void;
    }[];
}

const channelVault: ChannelVault[] = [];

interface getChannelOptions {
    name: string;
}

export const getChannelVault = async ({ name }: getChannelOptions): Promise<ChannelVault> => {
    let channel = channelVault.find((v) => v.name === name);
    if (!channel) {
        // Quick start
        channel = {
            name,
            consuming: false,
            events: [],
        };
        channelVault.push(channel);

        // define channel for this object (can use sometime to solve)
        const connection = await getConnection();
        channel.channel = await connection.createChannel();
    }

    // Wait until other process create a channel
    if (!channel.channel) {
        await new Promise((resolve) => {
            const interval = setInterval(() => {
                if (channel && channel.channel) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
    }

    // Return a secure channel vault.
    return channel;
};

export const getChannel = async ({ name }: getChannelOptions): Promise<amqp.Channel> => {
    const vault = await getChannelVault({ name });

    // Now return a secure instance of channel
    return vault.channel as amqp.Channel;
};

interface channelConsumeOptions {
    name: string;
    correlationId: string;
    callback: (message: ConsumeMessage) => void;
}

export const channelConsume = async ({ name, correlationId, callback }: channelConsumeOptions): Promise<void> => {
    const vault = await getChannelVault({ name });
    vault.events.push({
        correlationId,
        callback,
    });
    if (!vault.consuming) {
        vault.consuming = true;
        vault.channel?.consume(
            vault.name,
            (message) => {
                if (message) {
                    for (let x = 0; x < vault.events.length; x += 1) {
                        if (message.properties.correlationId === vault.events[x].correlationId) {
                            vault.channel?.ack(message);
                            try {
                                vault.events[x].callback(message);
                            } catch (err) {
                                console.error('Callback Failed: {}', err);
                            }
                            vault.events.splice(x, 1);
                            break;
                        }
                    }
                }
            },
            {
                noAck: false,
                exclusive: false,
            },
        );
    }
};
