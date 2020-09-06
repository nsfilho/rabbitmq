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
import { getConnection, assertQueue } from '.';
import { RABBIT_ENCONDING_CHARSET } from '../../constants';
import { disconnect } from './connection';

export interface remoteProcedureCallOptions {
    /** exchange to send a call */
    exchange: string;
    /** routing key */
    routingKey: string;
    /** parameters or payload content */
    payload: unknown;
    /**
     * Exclusive return channel, creates a new queue, with unique ID, to receive the procedure return.
     * When you a exclusive channel, have a performance impact because a new queue will be created.
     * Default: false
     */
    exclusiveReturnChannel?: boolean;
    /**
     * Ignore return (for function which not return anything to you)
     * Default: false
     */
    ignoreReturn?: boolean;
    /**
     * Assert return queue exists. Don't use true except in rarely cases, because this cause a large
     * performance degradation.
     *
     * Default: false
     */
    assertReturnQueue?: boolean;
}

/**
 * Call a Remote Procedure by a exchange name.
 * @param options named parameters
 */
export const remoteProcedureCall = async <T>(options: remoteProcedureCallOptions): Promise<T | null> => {
    const { exchange, routingKey, payload, ignoreReturn, exclusiveReturnChannel, assertReturnQueue } = options;
    const uniqueId = nanoid();
    const returnQueueName = exclusiveReturnChannel ? `${exchange}.return` : `${exchange}.return.${uniqueId}`;
    if (assertReturnQueue || exclusiveReturnChannel)
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
    if (ignoreReturn) return null;
    return new Promise((resolve) => {
        channel.consume(
            returnQueueName,
            async (message) => {
                if (message) {
                    const { correlationId, replyTo } = message.properties;
                    if (replyTo === returnQueueName && correlationId === uniqueId) {
                        channel.ack(message);
                        resolve(JSON.parse(message.content.toString(RABBIT_ENCONDING_CHARSET)) as T);
                        await channel.close();
                    } else {
                        channel.nack(message);
                    }
                }
            },
            {
                noAck: false,
                exclusive: false,
            },
        );
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
}

/**
 * Listen in a queue for a remote function call
 * @param options named parameters
 */
export const listenProcedureCall = async <Request = unknown, Response = unknown>(
    options: listenProcedureCallOptions<Request, Response>,
): Promise<void> => {
    const { callback, queue, returnValue = true } = options;
    const connection = await getConnection();
    const channel = await connection.createChannel();
    await assertQueue({
        name: queue,
        advanced: {
            durable: true,
            autoDelete: false,
        },
    });

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
                const params = JSON.parse(message.content.toString(RABBIT_ENCONDING_CHARSET));
                const result = await callback({
                    payload: params,
                    stop,
                });
                if (returnValue) {
                    channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(result)), {
                        correlationId,
                        replyTo,
                    });
                }
                channel.ack(message);
                if (stopListening) {
                    await channel.close();
                    if (disconnectAfterStop) await disconnect();
                }
            }
        },
        {
            noAck: false,
        },
    );
};
