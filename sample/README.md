# Introduction

Running sample files example, you will need `ts-node` in your system. If you have this
globally you can ignore the nexts steps. But if you don't have (or you prefer not change the codes),
use the steps bellow:

1. Clone this repo;
2. Add all dependencies;
3. Run the sample of you want.

```sh
git clone https://github.com/nsfilho/rabbitmq.git
cd rabbitmq
yarn install

# Run the most basic way
yarn ts-node sample/index.ts

# For debug purpose
node --require ts-node/register --inspect sample/index.ts

```

To run a multiple servers and clients sample, you can use the bellow command to run how much servers you want (my tip is to run at minimum 3 for you understand):

```sh
yarn ts-node sample/loopingServer.ts
```

And run how much clients you want, using the bellow command (my tip is: run only one for you understand the server auto-balance process via round-robin):

```sh
yarn ts-node sample/loopingClient.ts
```
