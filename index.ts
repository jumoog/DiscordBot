import signale from "signale";
import { Instagram } from "./Instagram.js";
import { DiscordBot, rooms } from "./discord.js";
import { Twitch } from "./twitch.js";

// catch all possible errors and don't crash
process.on('unhandledRejection', (reason: Error | any, p: Promise<any>) => {
	signale.fatal('caught your junk %s', reason);
	if (reason.stack) {
		signale.fatal(reason.stack);
	}
});

const discord = new DiscordBot();
const twitch = new Twitch();
const instagram  = new Instagram();

instagram.on('message', (message) => {
    discord.sendIgPost(message);
});

twitch.on('sendMessage', (message: string, room: rooms) => {
    discord.sendMessage(message, room);
});

twitch.on('deleteCoolDown', () => {
    discord.deleteCoolDown();
});

await discord.main();
await twitch.main();
await instagram.main();

