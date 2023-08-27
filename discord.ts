import EventEmitter from 'events';
import dotenv from 'dotenv';
import signale from "signale";
import { AttachmentBuilder, Client, EmbedBuilder, Events, GatewayIntentBits, Message, PermissionsBitField, TextChannel } from 'discord.js';
import PQueue from 'p-queue';
import { InstagramMediaItem } from './Instagram.js';

dotenv.config()

const DiscordMessageQueue = new PQueue({ concurrency: 1 });
const sleep = (waitTimeInMs: number) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

export enum rooms {
	hypetrain = "HYPETRAIN",
	debug = "DEBUG",
	shoutout = "SHOUTOUT",
	socials = "SOCIALS"
}

/**
 * Bot class
 */
export class DiscordBot extends EventEmitter {
	private _discordToken: string;
	private _lastCoolDownMessage: Message | undefined;
	private _discordClient;
	private _rooms: Map<string, TextChannel>;
	constructor() {
		super();
		this._discordToken = process.env.DISCORDTOKEN || '';
		this._discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
		this._lastCoolDownMessage = undefined;
		this._rooms = new Map();
	}

	/**
	 * start function
	 */
	async main() {
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			this._rooms.set(rooms.hypetrain, this.getChannel(process.env.ROOMNAME || '🚀┃hypetrain'));
			this._rooms.set(rooms.debug, this.getChannel(process.env.DEBUGROOMNAME || 'debug_prod'));
			this._rooms.set(rooms.shoutout, this.getChannel(process.env.SHOUTOUTROOMNAME || 'shoutout'));
			this._rooms.set(rooms.socials, this.getChannel(process.env.SOCIALSROOMNAME || '📸┃socials'));
			this.sendMessage(`Ready! Logged in as ${c.user.tag}`, rooms.debug);
			signale.success(`Ready! Logged in as ${c.user.tag}`);
		});

		// login discord
		this._discordClient.login(this._discordToken);

		// wait until ready
		while (!this._discordClient.isReady()) {
			await sleep(100);
		}
	}

	/**
	 * get channel by name
	 * @param room 
	 * @returns 
	 */
	private getChannel(room: string) {
		return this._discordClient.channels.cache.find(
			(channel) => (channel as TextChannel).name === room,
		) as TextChannel;
	}

	/**
	 * helper function to send normal text messages
	 */
	async sendMessage(message: string, room: rooms) {
		DiscordMessageQueue.add(() => this.messageQueue(message, room));
	}

	/**
	 * helper function to send normal text messages
	 */
	private async messageQueue(message: string, room: rooms) {
		// check if client is connected
		if (this._discordClient.isReady()) {
			const target = this._rooms.get(room);
			// check send Message permission
			if (target?.permissionsFor(this._discordClient.user!)?.has(PermissionsBitField.Flags.SendMessages)) {
				if (message.includes('The hype train cool down ends')) {
					this._lastCoolDownMessage = await target.send(message);
				} else {
					await target.send(message);
				}
			} else {
				signale.error(`Help! i can't post in <${room}>`);
			}
		}
		await sleep(750);
	}

	/**
	 * delete last send message
	 */
	deleteCoolDown() {
		if (this._discordClient.isReady()) {
			this._lastCoolDownMessage?.delete();
		}
	}

	/**
	 * download Instagram Picture and create a Embed
	 * @param element 
	 */
	async sendIgPost(element: InstagramMediaItem): Promise<void> {
		if (this._discordClient.isReady()) {
			const url = this.hasProp(element, "thumbnail_url") ? element.thumbnail_url : element.media_url
			const blob = await fetch(url!).then((r) => r.blob());
			const arrayBuffer = await blob.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const file = new AttachmentBuilder(buffer, { name: 'preview.jpg' });
			const embed = new EmbedBuilder()
				.setTitle(element.permalink?.includes('/reel/') ? 'Annabel shared a new reel!' : 'Annabel shared a new post!')
				.setURL(element.permalink)
				.setDescription(this.hasProp(element, "caption") ? this.extractMentions(element.caption!) : null)
				.setImage('attachment://preview.jpg')
				.setColor("#D300C5")
				.setFooter({
					text: 'Instagram',
				})
				.setTimestamp();
			const room = this._rooms.get(rooms.socials);
			room?.send({ embeds: [embed], files: [file] });
		}
	}

	private hasProp(obj: unknown, prop: string): boolean {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	extractMentions(text: string): string {
		const resourceRegex = /\@(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}/gm
		const maxChars = 100;
		if (text.length > maxChars) {
			text = text.slice(0, maxChars).split(' ').slice(0, -1).join(' ') + ' ...';
		}
		for (let match of text.matchAll(resourceRegex)) {
			text = text.replace(match[0], `[${match[0]}](https://www.instagram.com/${match[0].slice(1)}/)`)
		}
		return text;
	}
}
