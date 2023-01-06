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

| Level | Bits  | Subs |
|-------|-------|------|
| 1     | 1600  | 4    |
| 2     | 1800  | 4    |
| 3     | 2100  | 5    |
| 4     | 2300  | 5    |
| 5     | 3000  | 6    |
| 6     | 3700  | 8    |
| 7     | 4700  | 10   |
| 8     | 5900  | 12   |
| 9     | 7200  | 15   |
| 10    | 8800  | 18   |
| 11    | 10600 | 22   |
| 12    | 12600 | 26   |
| 13    | 14700 | 30   |
| 14    | 17100 | 35   |
