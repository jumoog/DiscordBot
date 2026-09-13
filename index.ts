import signale from "signale";
import { sleep } from "bun";
import { Instagram } from "./Instagram.ts";
import { DiscordBot, Rooms } from "./discord.ts";
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
process.on('unhandledRejection', (reason: unknown) => {
    signale.fatal('caught your junk %s', reason);
    if (reason instanceof Error && reason.stack) {
        signale.fatal(reason.stack);
    }
});

const discord = new DiscordBot();
const twitch = new Twitch();
const instagram = new Instagram();

instagram.on('post', async (message) => {
    await discord.sendIgPost(message);
});

twitch.on('sendMessage', (message, room) => {
    discord.sendMessage(message, room);
});

twitch.on('coolDown', (message) => {
    discord.sendCoolDownMessage(message);
});

twitch.on('online', (message) => {
    discord.onlineHandler(message);
});

twitch.on('offline', (message) => {
    discord.offlineHandler(message);
});

twitch.on('deleteCoolDown', () => {
    discord.deleteCoolDown();
});

// SIGINT: CTRL + C, SIGTERM: docker stop
const SHUTDOWN_TIMEOUT_MS = 5_000;
let shuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    signale.info(`received ${signal}, shutting down!`);
    setReady(false);
    twitch.stop();
    instagram.stop();
    discord.sendMessage('shutting down!', Rooms.DEBUG);
    // give queued messages a chance to go out, but never hang the container stop
    await Promise.race([discord.shutdown(), sleep(SHUTDOWN_TIMEOUT_MS)]);
    await server.stop();
    process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await Promise.all([discord.main(), twitch.main(), instagram.main()]);

setReady(true);
