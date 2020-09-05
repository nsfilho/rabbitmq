# RabbitMQ

A very simple and small services to simplify process to connect and call remote procedures (async way).

Project licensed under: GPLv3

## Environment Variables

This services use some environment variables to pre-adjust some things, like:

-   `RABBITMQ_URL`: url to connect to amqp server. Default: `amqp://admin:password@localhost:5672`;
-   `RABBITMQ_RETRIES_INTERVAL`: interval to retry connection in miliseconds. Default: `1000`;
-   `RABBITMQ_ROUTINGKEY_PREFIX`: prefix to routing key to identify this as a sender. Default: `api`;
-   `RABBITMQ_CONSOLE_STATUS`: show in console messages about rabbitmq status;

## Example

```ts
import { listenProcedureCall, remoteProcedureCall } from '@nsfilho/rabbitmq';

/**
 * Suggestion for type (and consist) your exchanges names.
 */
export const EventsType = {
    EXPRESS: process.env.RABBIT_EXCHANGE_EXPRESS || 'express',
    AUTH: process.env.RABBIT_EXCHANGE_AUTH || 'auth',
};
```
