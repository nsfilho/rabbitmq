/* eslint-disable no-console */
import { remoteProcedureCall } from '../src';

interface ExamplePayloadRequest {
    name: string;
    date: string;
    waitTimeToReturn: number;
}

interface ExamplePayloadReturn {
    timesCalled: number;
}

const execute = async () => {
    setInterval(async () => {
        // Call a remote procedure (so simple 🥰)
        const remoteReturn = await remoteProcedureCall({
            exchange: 'api.rust.test1',
            payload: {
                name: 'inside function',
                date: new Date().toISOString(),
                waitTimeToReturn: 1,
            },
            routingKey: 'default',
        });
        // Log return for you see the fully process.
        console.log('Remote Return:', remoteReturn);
    }, 1);
};

execute();
