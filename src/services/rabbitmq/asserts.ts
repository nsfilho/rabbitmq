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
import { getChannel } from '.';

export interface assertExchangeOptions {
    name: string;
    type: 'fanout' | 'direct' | 'headers' | 'topic';
    advanced?: amqp.Options.AssertExchange;
}

/**
 * Grant / assert the exchange exists
 * @param options named options
 */
export const assertExchange = async (options: assertExchangeOptions): Promise<amqp.Replies.AssertExchange> => {
    const { name, type, advanced } = options;
    const channel = await getChannel({ name });
    const result = await channel.assertExchange(name, type, advanced);
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
    const channel = await getChannel({ name });
    const result = await channel.assertQueue(name, advanced);
    return result;
};
