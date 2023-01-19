import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient, HelixHypeTrainEvent } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, Message, PermissionsBitField, TextChannel } from 'discord.js';
import { mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainProgressEvent, mockup_EventSubStreamOfflineEvent, mockup_EventSubStreamOnlineEvent } from './mockup.js';
import { EventSubChannelHypeTrainBeginEvent, EventSubChannelHypeTrainEndEvent, EventSubChannelHypeTrainProgressEvent, EventSubStreamOnlineEvent, EventSubStreamOfflineEvent } from '@twurple/eventsub-base/lib/index.js';
import { getRawData } from '@twurple/common';
import PQueue from 'p-queue';

dotenv.config()

const DiscordMessageQueue = new PQueue({ concurrency: 1 });

const sleep = (waitTimeInMs: number) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

// catch all possible errors and don't crash
process.on('unhandledRejection', (reason: Error | any, p: Promise<any>) => {
	signale.fatal('caught your junk %s', reason);
	if (reason.stack) {
		signale.fatal(reason.stack);
	}
});

/**
 * Bot class
 */
class Bot {
	_userId: number | string;
	_roomName: string;
	_clientId: string;
	_clientSecret: string;
	_discordToken: string;
	_debugRoomName: string;
	_currentCoolDownTimer: Timer;
	_currentCoolDown: number;
	_cooldownPeriod: number;
	_discordClient;
	_timerLeft;
	_tokenPath;
	_level;
	_total;
	_simulation;
	_onlineTimer;
	_lastMessage: Message;
	constructor() {
		this._userId = process.env.USERID || 631529415; // annabelstopit
		this._roomName = process.env.ROOMNAME || '';
		this._clientId = process.env.CLIENTID || '';
		this._clientSecret = process.env.CLIENTSECRET || '';
		this._discordToken = process.env.DISCORDTOKEN || '';
		this._debugRoomName = process.env.DEBUGROOMNAME || 'debug';
		this._currentCoolDownTimer = new Timer();
		this._currentCoolDown = 0;
		this._cooldownPeriod = 0;
		this._discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
		this._timerLeft = 0;
		this._tokenPath = '';
		this._level = 0;
		this._total = 0;
		this._simulation = false;
		this._onlineTimer = new Timer();
		//@ts-ignore
		this._lastMessage = {};
	}

	async main() {
		this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json'
		if (!fs.existsSync(this._tokenPath)) {
			this._simulation = true;
		}
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			this.sendDebugMessage(`Ready! Logged in as ${c.user.tag}`);
			signale.success(`Ready! Logged in as ${c.user.tag}`);
			if (!this._simulation) {
				this.startTwitch();
			} else {
				this.startHypeTrainSimulation();
			}

			// time is over event
			this._currentCoolDownTimer.on('done', () => {
				this.deleteLastMessage();
				this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
			});

			this._onlineTimer.on('done', () => {
				this.sendDebugMessage(`5 minutes waiting time over! annabelstopit is online!`);
			});
		});
		// login
		this._discordClient.login(this._discordToken);
	}

	/***
	 * starts the Twitch Bots
	 */
	async startTwitch() {
		// check if it runs in Docker or local
		// /tokens/tokens.json is the location in Docker

		// check if tokens.json exists
		if (fs.existsSync(this._tokenPath)) {
			signale.success(`found tokens.json!`);
			// read tokens.json
			const tokenDataHypeTrain = JSON.parse(fs.readFileSync(this._tokenPath, 'utf8'));
			// refresh tokens if they expire
			const authProviderHypeTrain = new RefreshingAuthProvider(
				{
					clientId: this._clientId,
					clientSecret: this._clientSecret,
					onRefresh: async newTokenData => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8')
				},
				tokenDataHypeTrain
			);

			// Twitch API
			const apiClient = new ApiClient({ authProvider: authProviderHypeTrain });

			// query Twitch API for last hype train
			const { data: events } = await apiClient.hypeTrain.getHypeTrainEventsForBroadcaster(this._userId);
			events.forEach(hypetrainEvent => {
				signale.debug('getHypeTrainEventsForBroadcaster', JSON.stringify(getRawData(hypetrainEvent), null, 4));
				// check if hype train is active
				if (hypetrainEvent.expiryDate.getTime() - new Date().getTime() > 0) {
					this.sendDebugMessage(`A hype train Event is currently running`);
				} else {
					this.sendDebugMessage(`No hype train Event is currently running`);
					// check if the cool down was less than Cooldown Period (cooldownDate - expiryDate). For annabelstopit = 1h
					this.setCooldownPeriod(hypetrainEvent);
					this.sendDebugMessage(`The Cooldown Period is set to ${Math.round(this._cooldownPeriod / 3600000)} hour(s)!`);
					if (new Date().getTime() - hypetrainEvent.cooldownDate.getTime() < this._cooldownPeriod) {
						this.sendDebugMessage(`The last hype train was less than an ${Math.round(this._cooldownPeriod / 3600000)} hour(s) ago. Set cool down.`);
						this.setCooldownEndDate(hypetrainEvent.cooldownDate);
					} else {
						this.sendDebugMessage(`The last hype train started at <t:${this.timeInSeconds(hypetrainEvent.startDate.getTime())}:f> and ended at <t:${this.timeInSeconds(hypetrainEvent.expiryDate.getTime())}:f> with Level ${hypetrainEvent.level}`);
					}
				}
			});
			// We need the Twitch Events
			// https://dev.twitch.tv/docs/eventsub/handling-webhook-events
			const twitchListener = new EventSubWsListener({ apiClient });
			await twitchListener.start();

			try {
				// https://twurple.js.org/reference/eventsub-ws/classes/EventSubWsListener.html#subscribeToChannelHypeTrainEndEvents
				await twitchListener.subscribeToChannelHypeTrainEndEvents(Number(this._userId), e => {
					this.hypeTrainEndEventsHandler(e);
				});

				await twitchListener.subscribeToChannelHypeTrainBeginEvents(Number(this._userId), e => {
					this.hypeTrainBeginEventsHandler(e);
				});

				await twitchListener.subscribeToChannelHypeTrainProgressEvents(Number(this._userId), e => {
					this.hypeTrainProgressEvents(e);
				});

				await twitchListener.subscribeToStreamOnlineEvents(Number(this._userId), e => {
					// needs scope moderator:manage:chat_settings
					// apiClient.chat.updateSettings(this._userId, this._userId, { emoteOnlyModeEnabled: false });
					this.StreamOnlineEventsHandler(e);
				});

				await twitchListener.subscribeToStreamOfflineEvents(Number(this._userId), e => {
					// needs scope moderator:manage:chat_settings
					// apiClient.chat.updateSettings(this._userId, this._userId, { emoteOnlyModeEnabled: true });
					this.StreamOfflineEventsHandler(e);
				});
			} catch (e) {
				await twitchListener.stop();
				signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
				this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
			}
		}
	}

	async startHypeTrainSimulation() {
		const hypes: any[] = JSON.parse(fs.readFileSync(`./10_01_2023.json`, 'utf-8'));
		while (true) {
			for (let index = 0; index < hypes.length; index++) {
				const hypetrainEvent = hypes[index];
				if (hypetrainEvent?.StreamOnlineEventsHandler) {
					this.StreamOnlineEventsHandler(new mockup_EventSubStreamOnlineEvent(hypetrainEvent.StreamOnlineEventsHandler));
				}
				if (hypetrainEvent?.StreamOfflineEventsHandler) {
					this.StreamOfflineEventsHandler(new mockup_EventSubStreamOfflineEvent(hypetrainEvent.StreamOfflineEventsHandler));
				}
				if (hypetrainEvent?.hypeTrainBeginEventsHandler) {
					this.hypeTrainBeginEventsHandler(new mockup_EventSubChannelHypeTrainBeginEvent(hypetrainEvent.hypeTrainBeginEventsHandler));
				}
				if (hypetrainEvent?.hypeTrainProgressEvents) {
					this.hypeTrainProgressEvents(new mockup_EventSubChannelHypeTrainProgressEvent(hypetrainEvent.hypeTrainProgressEvents));
				}
				if (hypetrainEvent?.hypeTrainEndEventsHandler) {
					this.hypeTrainEndEventsHandler(new mockup_EventSubChannelHypeTrainEndEvent(hypetrainEvent.hypeTrainEndEventsHandler));
				}
			}
			await sleep(1000000);
		}
	}

	/**
	 * helper function to send Embed messages
	 */
	async sendHypeTrainMessage() {
		// check if client is connected
		if (this._discordClient.isReady()) {
			// search right channel
			const targetChannel = this._discordClient.channels.cache.find(
				(channel) => (channel as TextChannel).name === this._roomName,
			) as TextChannel;
			// check send Message permission
			if (targetChannel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
				// build Embed
				// TODO build something useful
				const exampleEmbed = new EmbedBuilder()
					.setColor(0x0099FF)
					.setTitle('Hypetrain Time!')
					.setTimestamp();
				targetChannel.send({ embeds: [exampleEmbed] });
			} else {
				signale.error(`Help! i can't post in this room`);
			}
		}
	}

	/**
	 * helper function to send normal text messages
	 */
	async sendMessage(message: string) {
		// check if client is connected
		if (this._discordClient.isReady()) {
			// search right channel
			const channel = this._discordClient.channels.cache.find(
				(channel) => (channel as TextChannel).name === this._roomName,
			) as TextChannel;
			// check send Message permission
			if (channel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
				this._lastMessage = await channel.send(message);
			} else {
				signale.error(`Help! i can't post in this room`);
			}
		}
		await sleep(750);
	}

	/**
	 * helper function to send debug text messages
	 */
	async sendDebugMessage(message: string) {
		// check if client is connected
		if (this._discordClient.isReady()) {
			// search right channel
			const channel = this._discordClient.channels.cache.find(
				(channel) => (channel as TextChannel).name === this._debugRoomName,
			) as TextChannel;
			// check send Message permission
			if (channel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
				channel.send(message);
			} else {
				signale.error(`Help! i can't post in this room`);
			}
		}
		await sleep(1000);
	}

	/**
	 * Javascript has UNIX Timestamps in milliseconds.
	 * Convert to seconds to avoid 52961 years problem
	 * @returns 
	 */
	timeInSeconds(date = this._currentCoolDown): number {
		return Math.floor(date / 1000);
	}

	/**
	 * handle hype train EndEvents (fake and real)
	 * @param e 
	 */
	hypeTrainEndEventsHandler(e: EventSubChannelHypeTrainEndEvent | mockup_EventSubChannelHypeTrainEndEvent) {
		signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));
		DiscordMessageQueue.add(() => this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`));
		// reset level
		this._level = 0;
		// reset total
		this._total = 0;
		// next hype train as UTC
		this.setCooldownEndDate(e.cooldownEndDate)
	}

	/**
	 * handle hype train BeginEvents (fake and real)
	 * @param e 
	 */
	hypeTrainBeginEventsHandler(e: EventSubChannelHypeTrainBeginEvent | mockup_EventSubChannelHypeTrainBeginEvent) {
		signale.debug('hypeTrainBeginEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._level = e.level;
		DiscordMessageQueue.add(() => this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`));
	}

	/**
	 * handle hype train ProgressEvents (fake and real)
	 * @param e 
	 */
	hypeTrainProgressEvents(e: EventSubChannelHypeTrainProgressEvent | mockup_EventSubChannelHypeTrainProgressEvent) {
		if (this._total !== e.total) {
			this._total = e.total;
			signale.debug('hypeTrainProgressEvents', JSON.stringify(getRawData(e), null, 4));
			if (this._level !== e.level) {
				this._level = e.level;
				DiscordMessageQueue.add(() => this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`));
			}
			if (e.lastContribution.type === "subscription") {
				const amount = e.lastContribution.total / 500;
				DiscordMessageQueue.add(() => this.sendMessage(":gift: `" + e.lastContribution.userDisplayName + "` gifted **" + amount + "** sub" + (amount > 1 ? "s" : "") + "!"));

			}
			else if (e.lastContribution.type === "bits") {
				DiscordMessageQueue.add(() => this.sendMessage(":coin: `" + e.lastContribution.userDisplayName + "` cheered **" + e.lastContribution.total + "** bits!"));
			}
			DiscordMessageQueue.add(() => this.sendDebugMessage(`The hype train points: ${e.total} Level: **${e.level}**`));
		} else {
			signale.debug('hypeTrainProgressEvents', 'skipping duplicate!');
		}
	}

	/**
	 * handle Stream OnlineEvents (fake and real)
	 * @param e 
	 */
	StreamOnlineEventsHandler(e: EventSubStreamOnlineEvent | mockup_EventSubStreamOnlineEvent) {
		signale.debug('StreamOnlineEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._onlineTimer.start(300_000);
		DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went online!`));
	}

	/**
	 * handle Stream OfflineEvents (fake and real)
	 * @param e 
	 */
	StreamOfflineEventsHandler(e: EventSubStreamOfflineEvent | mockup_EventSubStreamOfflineEvent) {
		signale.debug('StreamOfflineEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._onlineTimer.stop();
		DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went offline!`));
	}

	setCooldownEndDate(cooldownEndDate: Date) {
		this._currentCoolDown = cooldownEndDate.getTime();
		this._timerLeft = this._currentCoolDown - Date.now();
		// stop timer just to be sure
		this._currentCoolDownTimer.stop();
		// set timer
		this._currentCoolDownTimer.start(this._timerLeft);
		// inform channel about new cool down
		// R -> Relative (in 2 minutes)
		// t -> short time (2:19 AM)
		DiscordMessageQueue.add(() => this.sendMessage(`:station: The hype train cooldown ends <t:${this.timeInSeconds()}:R>.`));
	}

	setCooldownPeriod(hypetrainEvent: HelixHypeTrainEvent) {
		const cooldownDate = hypetrainEvent.cooldownDate;
		const expiryDate = hypetrainEvent.expiryDate;
		// remove Milliseconds
		cooldownDate.setMilliseconds(0);
		// remove Milliseconds
		expiryDate.setMilliseconds(0);
		// with 0 milliseconds the calculation returns extract hours 
		this._cooldownPeriod = (cooldownDate.getTime() - expiryDate.getTime())
	}

	deleteLastMessage() {
		if (this._discordClient.isReady()) {
			this._lastMessage.delete();
		}
	}
}

const bot = new Bot();
bot.main();
