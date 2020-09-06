# RabbitMQ

A very simple and small services to simplify process to connect and call remote procedures (async way).

-   Project licensed under: GPLv3
-   Site Documentation: [Homepage](https://nsfilho.github.io/rabbitmq/index.html)
-   Repository: [GitHub](https://github.com/nsfilho/rabbitmq.git)

## Environment Variables

This services use some environment variables to pre-adjust some things, like:

-   `RABBITMQ_URL`: url to connect to amqp server. Default: `amqp://admin:password@localhost:5672`;
-   `RABBITMQ_RETRIES_INTERVAL`: interval to retry connection in milliseconds. Default: `1000`;
-   `RABBITMQ_ROUTINGKEY_PREFIX`: prefix to routing key to identify this as a sender. Default: `api`;
-   `RABBITMQ_CONSOLE_STATUS`: show in console messages about rabbitmq status;
-   `RABBIT_ENCONDING_CHARSET`: permits you to change buffer charset to encoding your messages.

## Running RabbitMQ

For use this library you will need to run a RabbitMQ. A sample docker-compose:

```yml
version: '2.0'

services:
    queue:
        image: rabbitmq:3-management
        ports:
            - 5672:5672
            - 15672:15672
        environment:
            - RABBITMQ_DEFAULT_USER=admin
            - RABBITMQ_DEFAULT_PASS=password
        volumes:
            - rabbitmq:/var/lib/rabbitmq

volumes:
    rabbitmq:
```

If you would like to use a docker swarm (stack) version, you can see in your sample folder.

## Example

You will found other samples in: [Samples Folder](https://github.com/nsfilho/rabbitmq/tree/master/sample).

```ts
/* eslint-disable no-console */
import { listenProcedureCall, remoteProcedureCall, getConnection, assertExchange } from '../src';

interface ExamplePayloadRequest {
    name: string;
    date: string;
    waitTimeToReturn: number;
}

interface ExamplePayloadReturn {
    timesCalled: number;
}

const delay = (timer: number) =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timer);
    });

const calledTimes = {
    x: 0,
    next: function next() {
        this.x += 1;
        return this.x;
    },
};

/**
 * Listen a procedure
 *
 * This will permit you to decoupling your code in a very nice way.
 * You can do many triggers or answers to remote requests
 *
 */
listenProcedureCall<ExamplePayloadRequest, ExamplePayloadReturn>({
    // Function name
    queue: 'exampleRemoteFunction',

    // Piece of code to execute 🚀
    callback: async ({ payload, stop }) => {
        const { waitTimeToReturn, name, date } = payload;
        const timesCalled = calledTimes.next();

        /** Logging information for you see the process */
        console.log(`Function called, with: ${name} at ${date}`);
        await delay(waitTimeToReturn);
        console.log(`Returning: ${timesCalled}`);

        /** stop listen more */
        stop();

        /** return the answer for remote caller */
        return {
            timesCalled,
        };
    },
});

const execute = async () => {
    // --------------------------------------------------------------------------------------------------
    // bind the Exchange to Queue (via code, for test purpose only -- not need in production environment)
    // Generally DevOps will do the properly assignments in production environment.
    const connection = await getConnection();
    const channel = await connection.createChannel();
    await assertExchange({
        name: 'exampleRemoteFunction',
        type: 'fanout',
        advanced: {
            autoDelete: false,
            durable: true,
        },
    });
    await channel.bindQueue('exampleRemoteFunction', 'exampleRemoteFunction', 'default');
    await channel.close();
    // --------------------------------------------------------------------------------------------------

    // Call a remote procedure (so simple 🥰)
    const remoteReturn = await remoteProcedureCall({
        exchange: 'exampleRemoteFunction',
        payload: {
            name: 'inside function',
            date: new Date().toISOString(),
            waitTimeToReturn: 3000,
        },
        routingKey: 'default',
        assertReturnQueue: true,
        exclusiveReturnChannel: false,
        ignoreReturn: false,
    });

    // Log return for you see the fully process.
    console.log('Remote Return:', remoteReturn);
    await connection.close();
};

execute();
```
