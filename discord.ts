import EventEmitter from 'events';
import signale from "signale";
import { AttachmentBuilder, Channel, Client, EmbedBuilder, Events, GatewayIntentBits, Guild, Message, MessageCreateOptions, MessagePayload, PermissionsBitField, TextChannel, VoiceChannel } from 'discord.js';
import PQueue from 'p-queue';
import { InstagramMediaItem } from './Instagram.ts';
import { Cron } from "croner";
import { sleep } from 'bun';

const DiscordMessageQueue = new PQueue({ concurrency: 1 });

const AnnabelDC = "821708215216635904";
const StatsRoom = "1189573435710521345";
const ContentRole = "953017309369344031";

export enum rooms {
	hypetrain = "HYPETRAIN",
	debug = "DEBUG",
	shoutout = "SHOUTOUT",
	socials = "SOCIALS",
	stats = "STATS"
}

/**
 * Bot class
 */
export class DiscordBot extends EventEmitter {
	private _discordToken: string;
	private _lastCoolDownMessage: Message | undefined;
	private _discordClient;
	private _rooms: Map<string, TextChannel | VoiceChannel | null>;
	private _memberCount: number;
	constructor() {
		super();
		this._discordToken = process.env.DISCORDTOKEN ?? '';
		this._discordClient = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences],
		});
		this._lastCoolDownMessage = undefined;
		this._rooms = new Map();
		this._memberCount = 0;
	}

	/**
	 * start function
	 */
	async main() {
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			this._rooms.set(rooms.hypetrain, this.getChannel(process.env.ROOMNAME ?? '🚀┃hypetrain'));
			this._rooms.set(rooms.debug, this.getChannel(process.env.DEBUGROOMNAME ?? 'debug_prod'));
			this._rooms.set(rooms.shoutout, this.getChannel(process.env.SHOUTOUTROOMNAME ?? 'shoutout'));
			this._rooms.set(rooms.socials, this.getChannel(process.env.SOCIALSROOMNAME ?? '📸┃socials'));
			this._rooms.set(rooms.stats, (this._discordClient.channels.cache.get(StatsRoom) as TextChannel));
			this._memberCount = (this._discordClient.guilds.cache.get(AnnabelDC) as Guild).memberCount;
			this.sendMessage(`Ready! Logged in as ${c.user.tag}`, rooms.debug);
			signale.success(`Ready! Logged in as ${c.user.tag}`);
		});

		this._discordClient.on('guildMemberAdd', member => {
			if (member.guild.id === AnnabelDC) {
				this._memberCount = member.guild.memberCount;
			}
		});

		this._discordClient.on('guildMemberRemove', member => {
			if (member.guild.id === AnnabelDC) {
				this._memberCount = member.guild.memberCount;
			}
		});

		// login discord
		this._discordClient.login(this._discordToken);

		// wait until ready
		while (!this._discordClient.isReady()) {
			await sleep(100);
		}

		// every 10 minutes
		Cron('*/10 * * * *', async () => {
			if (this._discordClient.isReady()) {
				const room = this._rooms.get(rooms.stats)!;
				signale.info(`cron`, this._memberCount, `A-Team: ${this._memberCount} members`);
				if (this.botHasPermission(room, PermissionsBitField.Flags.ManageChannels)) {
					room.setName(`A-Team: ${this._memberCount} members`);
				} else {
					this.sendMessage(`Help! i can't set name of <${room}>`, rooms.debug);
				}
			}
		})
	}

	/**
	 * get channel by name
	 * @param room 
	 * @returns 
	 */
	private getChannel(room: string) {
		return this._discordClient.channels.cache.find(
			(channel) => (channel as TextChannel).name === room,
		) as TextChannel | VoiceChannel | null;
	}

	/**
	 * helper function to send normal text messages
	 */
	async sendMessage(message: string | MessagePayload | MessageCreateOptions, room: rooms) {
		DiscordMessageQueue.add(() => this.messageQueue(message, room));
	}

	/**
	 * helper function to send normal text messages
	 */
	private async messageQueue(message: string | MessagePayload | MessageCreateOptions, room: rooms) {
		// check if client is connected
		if (this._discordClient.isReady()) {
			const target = this._rooms.get(room);
			// check send Message permission
			if (this.botHasPermission(target!, PermissionsBitField.Flags.SendMessages)) {
				if (typeof message === "string") {
					if (message.includes('The hype train cool down ends')) {
						this._lastCoolDownMessage = await target?.send(message);
					} else {
						await target?.send(message);
					}
				} else {
					await target?.send(message);
				}
			} else {
				signale.error(`Help! i can't post in <${room}>`);
				this.sendMessage(`Help! i can't post in <${room}>`, rooms.debug);
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
		this.sendMessage({ content: `<@&${ContentRole}>`, embeds: [embed], files: [file] }, rooms.socials);
	}

	private hasProp(obj: unknown, prop: string): boolean {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	private botHasPermission(channel: TextChannel | VoiceChannel | null, permissions: bigint) {
		// Check if the channel is a GuildChannel (text or voice channel)
		if (channel?.guild) {
			// Check if the bot has the 'SEND_MESSAGES' permission in the channel
			return channel.permissionsFor(channel?.guild.members.me!)?.has(permissions);
		}
		// If the channel is not a GuildChannel, return false
		return false;
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
