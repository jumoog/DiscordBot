import signale from "signale";
import { Instagram } from "./Instagram.ts";
import { DiscordBot, Rooms } from "./discord.js";
import { Twitch } from "./twitch.ts";
import { setReady, snapshot, touch } from "./health.ts";

const healthPort = Number(process.env.HEALTH_PORT ?? 3000);
touch('startup');

const server = Bun.serve({
    port: healthPort,
    fetch(req) {
        const { pathname } = new URL(req.url);
        if (pathname === '/health') {
            const s = snapshot();
            return Response.json(s, { status: s.ok && s.ready ? 200 : 503 });
        }

        return new Response('Not Found', { status: 404 });
    },
});

signale.success(`healthcheck listening on :${server.port}`);


// catch all possible errors and don't crash
process.on('unhandledRejection', (reason: Error | any, p: Promise<any>) => {
    signale.fatal('caught your junk %s', reason);
    if (reason.stack) {
        signale.fatal(reason.stack);
    }
});

const discord = new DiscordBot();
const twitch = new Twitch();
const instagram = new Instagram();

instagram.on('post', async (message) => {
    await discord.sendIgPost(message);
});

twitch.on('sendMessage', (message: string, room: Rooms) => {
    discord.sendMessage(message, room);
});

twitch.on('online', (message: string) => {
    discord.onlineHandler(message);
});

twitch.on('offline', (message: string) => {
    discord.offlineHandler(message);
});

twitch.on('deleteCoolDown', () => {
    discord.deleteCoolDown();
});

await discord.main();
await twitch.main();
await instagram.main();

setReady(true);
