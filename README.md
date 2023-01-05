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
