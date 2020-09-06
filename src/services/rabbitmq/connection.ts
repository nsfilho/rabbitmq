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
import { RABBITMQ_URL, RABBITMQ_RETRIES_INTERVAL, RABBITMQ_CONSOLE_STATUS } from '../../constants';

/**
 * Internal control
 */
const internalState: {
    connection: amqp.Connection | null;
} = {
    connection: null,
};

/**
 * A infinite looping to get you a reliable and stable connection to RabbitMQ
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
