# HypetrainDiscordBot

Twitch does not allow subscribing to the Hype Train of other users. The ID of the broadcaster must match the User ID in the user access token. If you generate an access token you only need the scope `channel:read:hype_train`

## get started

fill `env.sample` with your tokens and rename it to `.env`. Without `token.json`, the bot simulates Hype Train events and sends them to Discord.

## install all dependencies

```shell
  npm i
```

## run the bot

```shell
  node index.js
```

## build bot

install TypeScript then run

```shell
  tsc
```

## Levels

How much Bits or Tier 1 Subs to complete goals. Level 55 is the end Level

| Level | Bits  | Subs | converted |
|-------|-------|------|-----------|
| 1     | 1600  | 4    | 2000      |
| 2     | 1800  | 4    | 2000      |
| 3     | 2100  | 5    | 2500      |
| 4     | 2300  | 5    | 2500      |
| 5     | 3000  | 6    | 3000      |
| 6     | 3700  | 8    | 4000      |
| 7     | 4700  | 10   | 5000      |
| 8     | 5900  | 12   | 6000      |
| 9     | 7200  | 15   | 7500      |
| 10    | 8800  | 18   | 9000      |
| 11    | 10600 | 22   | 11000     |
| 12    | 12600 | 26   | 13000     |
| 13    | 14700 | 30   | 15000     |
| 14    | 17100 | 35   | 17500     |
| 15    | 19700 | 40   | 20000     |
| 16    | 22400 | 45   | 22500     |
| 17    | 25400 | 51   | 25500     |
| 18    | 28600 | 58   | 29000     |
| 19    | 32000 | 64   | 32000     |
