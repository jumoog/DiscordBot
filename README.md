# HypetrainDiscordBot

A Discord bot that integrates Twitch Hype Train events and Instagram posts into your Discord server.

## Features

- **Twitch Integration:**  
  - Monitors Hype Train events, stream online/offline status, and channel updates.
  - Sends notifications and event summaries to specified Discord channels.
  - Handles Twitch token refresh and cooldown logic.

- **Instagram Integration:**  
  - Checks for new Instagram posts or reels from a specified account.
  - Shares new posts (with preview image and caption) to a Discord channel.

- **Discord Features:**  
  - Sends messages to specific channels for different event types (Hype Train, Debug, Shoutout, Socials, etc.).
  - Updates member statistics and handles member join/leave/ban events.
  - Sticky welcome message in the introduction channel.
  - Permission checks for bot actions.

- **Healthcheck:**  
  - Healthcheck endpoint for Docker to ensure the bot is running and connected.

## Getting Started

### 1. Install Dependencies

```sh
bun install
```

### 2. Configure Environment

- Copy `env.sample` to `.env` and fill in your credentials:

  ```env
  USERID=""
  ROOMNAME=""
  CLIENTID=""
  CLIENTSECRET=""
  DISCORDTOKEN=""
  DEBUGROOMNAME=""
  SHOUTOUTROOMNAME=""
  SOCIALSROOMNAME=""
  MODLOGROOMNAME=""
  ```

- Place your Twitch and Instagram token files (`tokens.json`, `ig_token.json`, `lastTimeStamp.json`) in the project root or `/tokens/` directory (for Docker).

### 3. Run the Bot

```sh
bun run index.ts
```

### 4. Docker

A `Dockerfile` and `docker-compose.yaml` are provided for containerized deployment.  
Mount your `/tokens/` directory for persistent token storage.

## Usage

- The bot will automatically post Twitch and Instagram updates to the configured Discord channels.
- All errors are logged using [signale](https://github.com/klaussinani/signale).
- For more details, see the code in [index.ts](index.ts), [twitch.ts](twitch.ts), [Instagram.ts](Instagram.ts), and [discord.ts](discord.ts).

### Feature toggles

The bot reads feature toggles from `featureToggles.json` (in the project root or `/tokens/` in Docker). Edit the file and restart the bot.

Slash commands (server only, require Kick/Ban Members):

- `/ig action:on|off|status`
- `/stickynote action:on|off|status`
- `/setchannel feature:<Twitch Live Ping|Instagram Posts> [channel]` (omit `channel` to reset to the default from the environment)

- `instagramPostingEnabled`: enable/disable posting Instagram updates to Discord.
- `stickyNoteEnabled`: enable/disable the intro channel sticky welcome message.
- `shoutoutChannelId` / `socialsChannelId`: channel overrides set via `/setchannel`.

### Healthcheck

`GET /health` on `HEALTH_PORT` (default `3000`) returns `200` while the bot is ready and every started integration is alive (Discord connected, Twitch EventSub socket heartbeating), otherwise `503`.


## Development

- Written in TypeScript.
- `bun run typecheck` runs the type checker.
- `bun test` runs the permission tests against the live server; they are skipped when `DISCORDTOKEN` is not set.

## License

Apache-2.0

---

<p align="center">
  <a href="https://discord.gg/QJE3tukzfv"><img src="https://invidget.switchblade.xyz/QJE3tukzfv"></a>
</p>
