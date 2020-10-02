/**
 * Unique Execution Library
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
import { nanoid } from 'nanoid';
import { assertQueue, disconnect, getChannel } from '.';
import { RABBITMQ_ENCONDING_CHARSET } from '../../constants';
import { assertExchange } from './asserts';
import { channelConsume } from './connection';

export interface remoteProcedureCallOptions {
    /** exchange to send a call */
    exchange: string;
    /** routing key */
    routingKey: string;
    /** parameters or payload content */
    payload: unknown;
    /**
     * Ignore return (for function which not return anything to you)
     * Default: false
     */
    ignoreReturn?: boolean;
}

/**
 * Call a Remote Procedure by a exchange name.
 * @param options named parameters
 */
export const remoteProcedureCall = async <T>(options: remoteProcedureCallOptions): Promise<T | null> => {
    const { exchange, routingKey, payload, ignoreReturn } = options;
    const returnQueueName = `${exchange}.return`;
    const uniqueId = nanoid();
    const channel = await getChannel({ name: returnQueueName });
    return new Promise((resolve) => {
        if (ignoreReturn) {
            resolve(null);
        } else {
            channelConsume({
                name: returnQueueName,
                correlationId: uniqueId,
                callback: (message) => {
                    resolve(JSON.parse(message.content.toString(RABBITMQ_ENCONDING_CHARSET)) as T);
                },
            });
        }
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
            correlationId: uniqueId,
            replyTo: returnQueueName,
        });
    });
};

export interface stopOptions {
    /** Disconnect from Rabbit after stop. default: false */
    disconnectAfterStop?: boolean;
}

export interface listenCallbackOptions<Request> {
    /** content payload */
    payload: Request;
    /** stop to listening remote call */
    stop: (options?: stopOptions) => void;
}

export interface listenProcedureCallOptions<Request, Response> {
    /** Queue name to listen */
    queue: string;
    /** Function to callback, which receive a payload as parameter */
    callback: (options: listenCallbackOptions<Request>) => Promise<Response>;
    /** This function return value? default: true */
    returnValue?: boolean;
    /** Assert Exchange for receive procedures calls. Default: true */
    autoExchange?: boolean;
}

/**
 * Listen in a queue for a remote function call
 * @param options named parameters
 */
export const listenProcedureCall = async <Request = unknown, Response = unknown>(
    options: listenProcedureCallOptions<Request, Response>,
): Promise<void> => {
    const { callback, queue, returnValue = true, autoExchange = true } = options;
    const channel = await getChannel({ name: queue });

    // Assert Call Queue
    await assertQueue({
        name: queue,
        advanced: {
            durable: true,
            autoDelete: false,
        },
    });

    // Assert default return queue
    await assertQueue({
        name: `${queue}.return`,
        advanced: {
            durable: true,
            autoDelete: false,
        },
    });

    if (autoExchange) {
        // Assert Exchange call queue
        await assertExchange({
            name: queue,
            type: 'topic',
            advanced: {
                durable: true,
                autoDelete: false,
            },
        });
        await channel.bindQueue(queue, queue, '*');

        // Assert Exchange default return queue
        const returnQueue = `${queue}.return`;
        await assertExchange({
            name: returnQueue,
            type: 'topic',
            advanced: {
                durable: true,
                autoDelete: false,
            },
        });
        await channel.bindQueue(returnQueue, returnQueue, '*');
    }

    /** Logic for stop listening */
    let stopListening = false;
    let disconnectAfterStop = false;
    const stop = (internalOptions?: stopOptions) => {
        if (internalOptions) {
            const { disconnectAfterStop: internalDisconnect } = internalOptions;
            disconnectAfterStop = internalDisconnect || false;
        }
        stopListening = true;
    };

    channel.consume(
        queue,
        async (message) => {
            if (message) {
                const { replyTo, correlationId } = message.properties;
                const params = JSON.parse(message.content.toString(RABBITMQ_ENCONDING_CHARSET));
                const result = await callback({
                    payload: params,
                    stop,
                });
                if (returnValue) {
                    channel.publish(replyTo, 'return', Buffer.from(JSON.stringify(result)), {
                        correlationId,
                        replyTo,
                    });
                }
                channel.ack(message);
                if (stopListening) {
                    if (disconnectAfterStop) await disconnect();
                }
            }
        },
        {
            noAck: false,
        },
    );
};
