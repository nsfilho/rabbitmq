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
import amqp from 'amqplib';
import { nanoid } from 'nanoid';
import {
    RABBITMQ_URL,
    RABBITMQ_RETRIES_INTERVAL,
    RABBITMQ_ROUTINGKEY_PREFIX,
    RABBITMQ_CONSOLE_STATUS,
} from '../../constants';

/**
 * Internal control
 */
const internalState: {
    connection: amqp.Connection | null;
} = {
    connection: null,
};

/**
 * Return a internal connection to rabbit (for create  channels)
 */
export const getConnection = async (): Promise<amqp.Connection> => {
    if (internalState.connection !== null) return internalState.connection;
    return new Promise((resolve) => {
        let retriesCount = 0;
        const retriesInterval = setInterval(async () => {
            try {
                internalState.connection = await amqp.connect(RABBITMQ_URL);
                clearInterval(retriesInterval);
                resolve(internalState.connection);
            } catch (err) {
                retriesCount += 1;
                if (RABBITMQ_CONSOLE_STATUS)
                    console.error(
                        `RABBITMQ(${retriesCount}): Failed to connect, retry in: ${RABBITMQ_RETRIES_INTERVAL}s`,
                    );
            }
        }, RABBITMQ_RETRIES_INTERVAL);
    });
};

export interface assertExchangeOptions {
    name: string;
    type: 'fanout' | 'direct' | 'headers';
    advanced?: amqp.Options.AssertExchange;
}

/**
 * Grant / assert the exchange exists
 * @param options named options
 */
export const assertExchange = async (options: assertExchangeOptions): Promise<amqp.Replies.AssertExchange> => {
    const { name, type, advanced } = options;
    const connection = await getConnection();
    const channel = await connection.createChannel();
    const result = await channel.assertExchange(name, type, advanced);
    await channel.close();
    return result;
};

export interface assertQueueOptions {
    name: string;
    advanced?: amqp.Options.AssertQueue;
}

/**
 * Grant / assert the exchange exists
 * @param options named options
 */
export const assertQueue = async (options: assertQueueOptions): Promise<amqp.Replies.AssertQueue> => {
    const { name, advanced } = options;
    const connection = await getConnection();
    const channel = await connection.createChannel();
    const result = await channel.assertQueue(name, advanced);
    await channel.close();
    return result;
};

export interface publishOptions {
    /** Exchange name */
    exchange: string;
    /** Routing key complement (use prefix before this name) */
    routingKey: string;
    /** Payload content (recommended to pass a object) */
    payload: unknown;
}

/**
 * Publish a content (or object) to RabbitMQ
 * @param options named parameters
 */
export const publish = async (options: publishOptions): Promise<void> => {
    const { exchange, routingKey, payload } = options;
    const connection = await getConnection();
    const channel = await connection.createChannel();
    channel.publish(exchange, `${RABBITMQ_ROUTINGKEY_PREFIX}.${routingKey}`, Buffer.from(JSON.stringify(payload)));
};

export interface remoteProcedureCallOptions {
    /** exchange to send a call */
    exchange: string;
    /** routing key */
    routingKey: string;
    /** parameters or payload content */
    payload: unknown;
}

/**
 * Call a Remote Procedure by a exchange name.
 * @param options named paramters
 */
export const remoteProcedureCall = async <T>(options: remoteProcedureCallOptions): Promise<T | null> => {
    const { exchange, routingKey, payload } = options;
    const uniqueId = nanoid();
    const returnQueueName = `${exchange}.return.${uniqueId}`;
    await assertQueue({
        name: returnQueueName,
        advanced: {
            autoDelete: true,
            durable: false,
        },
    });
    const connection = await getConnection();
    const channel = await connection.createChannel();
    await channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
        correlationId: uniqueId,
        replyTo: returnQueueName,
    });
    const result = await channel.get(returnQueueName);
    await channel.close();
    if (result) {
        return JSON.parse(result.content.toString('utf-8')) as T;
    }
    return null;
};

export interface listenProcedureCallOptions {
    /** Queue name to listen */
    queue: string;
    /** Function to callback, which receive a payload as parameter */
    callback: (payload: unknown) => Promise<unknown>;
}

/**
 * Listen in a queue for a remote function call
 * @param options named parameters
 */
export const listenProcedureCall = async (options: listenProcedureCallOptions): Promise<void> => {
    const { callback, queue } = options;
    const connection = await getConnection();
    const channel = await connection.createChannel();
    await assertQueue({
        name: queue,
        advanced: {
            durable: true,
            autoDelete: false,
        },
    });
    channel.consume(queue, async (message) => {
        if (message) {
            const { replyTo, correlationId } = message.properties;
            const params = JSON.parse(message.content.toString('utf-8'));
            const result = await callback(params);
            channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(result)), {
                correlationId,
                replyTo,
            });
        }
    });
};
