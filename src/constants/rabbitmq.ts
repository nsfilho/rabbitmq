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

type Encoding =
    | 'utf-8'
    | 'ascii'
    | 'utf8'
    | 'utf16le'
    | 'ucs2'
    | 'ucs-2'
    | 'base64'
    | 'latin1'
    | 'binary'
    | 'hex'
    | undefined;

export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672';

/** Interval to retry connection. Don't over abuse (< 1000), use at minimum 1000ms */
export const RABBITMQ_RETRIES_INTERVAL = process.env.RABBITMQ_RETRIES_INTERVAL
    ? parseInt(process.env.RABBITMQ_RETRIES_INTERVAL, 10)
    : 1000;

export const RABBITMQ_ROUTINGKEY_PREFIX = process.env.RABBITMQ_ROUTINGKEY_PREFIX || 'api';

/**
 * Show in console messages about rabbitmq progress
 */
export const RABBITMQ_DEBUG_CONSOLE = process.env.RABBITMQ_DEBUG_CONSOLE === 'true';

/** default charset enconding for buffer */
export const RABBITMQ_ENCONDING_CHARSET: Encoding = (process.env.RABBITMQ_ENCONDING_CHARSET as Encoding) || 'utf-8';

/** internal to check if it is connected or not */
export const RABBITMQ_INTERVAL_CONNECTION_CHECK = process.env.RABBITMQ_INTERVAL_CONNECTION_CHECK
    ? parseInt(process.env.RABBITMQ_INTERVAL_CONNECTION_CHECK, 10)
    : 100;
