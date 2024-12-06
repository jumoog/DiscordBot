import signale from "signale";
//import { Instagram } from "./Instagram.ts";
import { DiscordBot, Rooms } from "./discord.js";
import { Twitch } from "./twitch.ts";

// catch all possible errors and don't crash
process.on('unhandledRejection', (reason: Error | any, p: Promise<any>) => {
	signale.fatal('caught your junk %s', reason);
	if (reason.stack) {
		signale.fatal(reason.stack);
	}
});

const discord = new DiscordBot();
const twitch = new Twitch();
//const instagram  = new Instagram();

/*
instagram.on('post', async (message) => {
    await discord.sendIgPost(message);
});
*/

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
//await instagram.main();
