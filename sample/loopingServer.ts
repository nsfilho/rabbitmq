/* eslint-disable no-console */
import { listenProcedureCall } from '../src';

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
    callback: async ({ payload }) => {
        const { waitTimeToReturn, name, date } = payload;
        const timesCalled = calledTimes.next();

        /** Logging information for you see the process */
        console.log(`Function called, with: ${name} at ${date}`);
        await delay(waitTimeToReturn);
        console.log(`Returning: ${timesCalled}`);

        /** return the answer for remote caller */
        return {
            timesCalled,
        };
    },
});
