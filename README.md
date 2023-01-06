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
How much Bits or Tier 1 Subs to complete goals

| Level | Bits  | Subs | accumulated |
|-------|-------|------|-------------|
| 1     | 1600  | 4    | 1600        |
| 2     | 1800  | 4    | 3400        |
| 3     | 2100  | 5    | 5500        |
| 4     | 2300  | 5    | 7800        |
| 5     | 3000  | 6    | 10800       |
| 6     | 3700  | 8    | 14500       |
| 7     | 4700  | 10   | 19200       |
| 8     | 5900  | 12   | 25100       |
| 9     | 7200  | 15   | 32300       |
| 10    | 8800  | 18   | 41100       |
| 11    | 10600 | 22   | 51700       |
| 12    | 12600 | 26   | 64300       |
| 13    | 14700 | 30   | 79000       |
| 14    | 17100 | 35   | 96100       |
| 15    | 19700 | 40   | 115800      |
| 16    | 22400 | 45   | 138200      |
| 17    | 25400 | 51   | 163600      |
| 18    | 28600 | 58   | 192200      |
| 19    | 32000 | 64   | 224200      |
