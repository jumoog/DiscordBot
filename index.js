import signale from "signale";
import { Instagram } from "./Instagram.js";
import { DiscordBot } from "./discord.js";
import { Twitch } from "./twitch.js";
process.on('unhandledRejection', (reason, p) => {
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
twitch.on('sendMessage', (message, room) => {
    discord.sendMessage(message, room);
});
twitch.on('deleteCoolDown', () => {
    discord.deleteCoolDown();
});
await discord.main();
await twitch.main();
await instagram.main();
