/* eslint-disable no-console */
import { remoteProcedureCall, getConnection, assertExchange, assertQueue } from '../src';

interface ExamplePayloadRequest {
    name: string;
    date: string;
    waitTimeToReturn: number;
}

interface ExamplePayloadReturn {
    timesCalled: number;
}

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
    await assertQueue({
        name: 'exampleRemoteFunction.return',
        advanced: {
            autoDelete: false,
            durable: true,
        },
    });
    await channel.bindQueue('exampleRemoteFunction', 'exampleRemoteFunction', 'default');
    await channel.close();
    // --------------------------------------------------------------------------------------------------

    setInterval(async () => {
        // Call a remote procedure (so simple 🥰)
        const remoteReturn = await remoteProcedureCall({
            exchange: 'exampleRemoteFunction',
            payload: {
                name: 'inside function',
                date: new Date().toISOString(),
                waitTimeToReturn: 3000,
            },
            routingKey: 'default',
        });

        // Log return for you see the fully process.
        console.log('Remote Return:', remoteReturn);
    }, 1000);
};

execute();
