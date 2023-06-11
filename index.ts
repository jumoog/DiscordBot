import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, Events, GatewayIntentBits, Message, PermissionsBitField, TextChannel } from 'discord.js';
import { mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainProgressEvent, mockup_EventSubStreamOfflineEvent, mockup_EventSubStreamOnlineEvent } from './mockup.js';
import { EventSubChannelHypeTrainBeginEvent, EventSubChannelHypeTrainEndEvent, EventSubChannelHypeTrainProgressEvent, EventSubStreamOnlineEvent, EventSubStreamOfflineEvent, EventSubChannelUpdateEvent } from '@twurple/eventsub-base/lib/index.js';
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
	private _userId: number | string;
	private _hypeTrainRoom: TextChannel | undefined;
	private _clientId: string;
	private _clientSecret: string;
	private _discordToken: string;
	private _debugRoom: TextChannel | undefined;
	private _currentCoolDownTimer: Timer;
	private _currentCoolDown: number;
	private _discordClient;
	private _timerLeft;
	private _tokenPath;
	private _level;
	private _total;
	private _simulation;
	private _onlineTimer: Timer;
	private _lastMessage: Message | undefined;
	private _shoutOut: TextChannel | undefined;
	private _streamStartTimer: Timer;
	constructor() {
		this._userId = process.env.USERID || 631529415; // annabelstopit
		this._hypeTrainRoom = undefined;
		this._debugRoom = undefined;
		this._shoutOut = undefined;
		this._clientId = process.env.CLIENTID || '';
		this._clientSecret = process.env.CLIENTSECRET || '';
		this._discordToken = process.env.DISCORDTOKEN || '';
		this._currentCoolDownTimer = new Timer();
		this._currentCoolDown = 0;
		this._discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
		this._timerLeft = 0;
		this._tokenPath = '';
		this._level = 0;
		this._total = 0;
		this._simulation = false;
		this._onlineTimer = new Timer();
		this._streamStartTimer = new Timer();
		this._lastMessage = undefined;
	}

	async main() {
		this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json'
		if (!fs.existsSync(this._tokenPath)) {
			this._simulation = true;
		}
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			this._hypeTrainRoom = this.getChannel(process.env.ROOMNAME || '🚀┃hypetrain');
			this._debugRoom = this.getChannel(process.env.DEBUGROOMNAME || 'debug_prod');
			this._shoutOut = this.getChannel(process.env.SHOUTOUTROOMNAME || 'shoutout');
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
				// only do a shoutout at start or every 30 mins
				if (this._streamStartTimer.status === 'stopped') {
					this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.twitch.tv/annabelstopit`, this._shoutOut);
					// start 30 min timer
					this._streamStartTimer.start(1_800_000);
				}
			});
		});
		// login
		this._discordClient.login(this._discordToken);
	}

	/***
	 * starts the Twitch Bots
	 */
	private async startTwitch() {
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
				},
			);
			authProviderHypeTrain.addUser(this._userId, tokenDataHypeTrain);
			authProviderHypeTrain.onRefresh((_userId, newTokenData) => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8'));
			authProviderHypeTrain.onRefreshFailure(_userId => {
				this.sendDebugMessage(`user token refresh failed!`);
				signale.fatal(`user token refresh failed!`);
			})
			// Twitch API
			const apiClient = new ApiClient({ authProvider: authProviderHypeTrain });

			// query Twitch API for last hype train
			const { data: events } = await apiClient.hypeTrain.getHypeTrainEventsForBroadcaster(this._userId);
			events.forEach(hypeTrainEvent => {
				signale.debug('getHypeTrainEventsForBroadcaster', JSON.stringify(getRawData(hypeTrainEvent), null, 4));
				// check if hype train is active
				if (hypeTrainEvent.expiryDate.getTime() - new Date().getTime() > 0) {
					this.sendDebugMessage(`A hype train Event is currently running`);
				} else {
					this.sendDebugMessage(`No hype train Event is currently running`);
					// check if the cool down is still active
					if (hypeTrainEvent.cooldownDate.getTime() - new Date().getTime() > 0) {
						this.sendDebugMessage(`Cool down is still active`);
						this.setCoolDownEndDate(hypeTrainEvent.cooldownDate);
					} else {
						this.sendDebugMessage(`The last hype train started at <t:${this.timeInSeconds(hypeTrainEvent.startDate.getTime())}:f> and ended at <t:${this.timeInSeconds(hypeTrainEvent.expiryDate.getTime())}:f> with Level ${hypeTrainEvent.level}`);
					}
				}
			});
			// We need the Twitch Events
			// https://dev.twitch.tv/docs/eventsub/handling-webhook-events
			const twitchListener = new EventSubWsListener({ apiClient });
			twitchListener.start();

			try {
				// https://twurple.js.org/reference/eventsub-ws/classes/EventSubWsListener.html#subscribeToChannelHypeTrainEndEvents
				twitchListener.onChannelHypeTrainEnd(Number(this._userId), e => {
					this.hypeTrainEndEventsHandler(e);
				});

				twitchListener.onChannelHypeTrainBegin(Number(this._userId), e => {
					this.hypeTrainBeginEventsHandler(e);
				});

				twitchListener.onChannelHypeTrainProgress(Number(this._userId), e => {
					this.hypeTrainProgressEvents(e);
				});

				twitchListener.onStreamOnline(Number(this._userId), e => {
					// needs scope moderator:manage:chat_settings
					// apiClient.chat.updateSettings(this._userId, this._userId, { emoteOnlyModeEnabled: false });
					this.StreamOnlineEventsHandler(e);
				});

				twitchListener.onStreamOffline(Number(this._userId), e => {
					// needs scope moderator:manage:chat_settings
					// apiClient.chat.updateSettings(this._userId, this._userId, { emoteOnlyModeEnabled: true });
					this.StreamOfflineEventsHandler(e);
				});

				twitchListener.onChannelUpdate(Number(this._userId), e => {
					this.ChannelUpdateEvents(e);

				});
				// tell Twitch that we no longer listen
				// otherwise it will try to send events to a down app
				// normal CTRL + C
				process.on('SIGINT', async () => {
					signale.success('shutting down!');
					await this.sendDebugMessage('shutting down!');
					twitchListener.stop();
					process.exit(0);
				});
				// DOCKER
				process.on('SIGTERM', async () => {
					signale.success('shutting down!');
					await this.sendDebugMessage('shutting down!');
					twitchListener.stop();
					process.exit(0);
				});
			} catch (e) {
				twitchListener.stop();
				signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
				this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
			}
		}
	}

	private async startHypeTrainSimulation() {
		const hypes: any[] = JSON.parse(fs.readFileSync(`./10_01_2023.json`, 'utf-8'));
		while (true) {
			for (let index = 0; index < hypes.length; index++) {
				const hypeTrainEvent = hypes[index];
				if (hypeTrainEvent?.StreamOnlineEventsHandler) {
					this.StreamOnlineEventsHandler(new mockup_EventSubStreamOnlineEvent(hypeTrainEvent.StreamOnlineEventsHandler));
				}
				if (hypeTrainEvent?.StreamOfflineEventsHandler) {
					this.StreamOfflineEventsHandler(new mockup_EventSubStreamOfflineEvent(hypeTrainEvent.StreamOfflineEventsHandler));
				}
				if (hypeTrainEvent?.hypeTrainBeginEventsHandler) {
					this.hypeTrainBeginEventsHandler(new mockup_EventSubChannelHypeTrainBeginEvent(hypeTrainEvent.hypeTrainBeginEventsHandler));
				}
				if (hypeTrainEvent?.hypeTrainProgressEvents) {
					this.hypeTrainProgressEvents(new mockup_EventSubChannelHypeTrainProgressEvent(hypeTrainEvent.hypeTrainProgressEvents));
				}
				if (hypeTrainEvent?.hypeTrainEndEventsHandler) {
					this.hypeTrainEndEventsHandler(new mockup_EventSubChannelHypeTrainEndEvent(hypeTrainEvent.hypeTrainEndEventsHandler));
				}
			}
			await sleep(1_000_000);
		}
	}

	private getChannel(room: string) {
		return this._discordClient.channels.cache.find(
			(channel) => (channel as TextChannel).name === room,
		) as TextChannel;
	}

	/**
	 * helper function to send normal text messages
	 */
	private async sendMessage(message: string, room = this._hypeTrainRoom) {
		// check if client is connected
		if (this._discordClient.isReady()) {
			// check send Message permission
			if (room?.permissionsFor(this._discordClient.user!)?.has(PermissionsBitField.Flags.SendMessages)) {
				if (room === this._debugRoom) {
					await room.send(message);
				} else {
					this._lastMessage = await room.send(message);
				}
			} else {
				signale.error(`Help! i can't post in this room`);
			}
		}
		await sleep(750);
	}

	private async testPermission(room: TextChannel) {
		if (this._discordClient.isReady()) {
			// check send Message permission
			if (room?.permissionsFor(this._discordClient.user!)?.has(PermissionsBitField.Flags.SendMessages)) {
				this.sendDebugMessage(`I can post in <${room.name}>`);
			} else {
				this.sendDebugMessage(`Help! i can't post in <${room.name}>`);
			}
			await sleep(750);
		}
	}

	/**
	 * helper function to send debug text messages
	 */
	private async sendDebugMessage(message: string) {
		await this.sendMessage(message, this._debugRoom);
	}

	/**
	 * Javascript has UNIX Timestamps in milliseconds.
	 * Convert to seconds to avoid 52961 years problem
	 * @returns 
	 */
	private timeInSeconds(date = this._currentCoolDown): number {
		return Math.floor(date / 1_000);
	}

	/**
	 * handle hype train EndEvents (fake and real)
	 * @param e 
	 */
	private hypeTrainEndEventsHandler(e: EventSubChannelHypeTrainEndEvent | mockup_EventSubChannelHypeTrainEndEvent) {
		signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));
		DiscordMessageQueue.add(() => this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`));
		// reset level
		this._level = 0;
		// reset total
		this._total = 0;
		// next hype train as UTC
		this.setCoolDownEndDate(e.cooldownEndDate)
	}

	/**
	 * handle hype train BeginEvents (fake and real)
	 * @param e 
	 */
	private hypeTrainBeginEventsHandler(e: EventSubChannelHypeTrainBeginEvent | mockup_EventSubChannelHypeTrainBeginEvent) {
		signale.debug('hypeTrainBeginEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._level = e.level;
		DiscordMessageQueue.add(() => this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`));
	}

	/**
	 * handle hype train ProgressEvents (fake and real)
	 * @param e 
	 */
	private hypeTrainProgressEvents(e: EventSubChannelHypeTrainProgressEvent | mockup_EventSubChannelHypeTrainProgressEvent) {
		// filter duplicates out
		if (this._total !== e.total) {
			this._total = e.total;
			// log JSON
			signale.debug('hypeTrainProgressEvents', JSON.stringify(getRawData(e), null, 4));
			// check if reached a new level
			if (this._level !== e.level) {
				this._level = e.level;
				DiscordMessageQueue.add(() => this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`));
			}
			// check if is a subscription
			// tier 1 500
			// tier 2 1000
			// tier 3 1500
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
	private StreamOnlineEventsHandler(e: EventSubStreamOnlineEvent | mockup_EventSubStreamOnlineEvent) {
		signale.debug('StreamOnlineEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._onlineTimer.start(120_000);
		DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went online!`));
	}

	/**
	 * handle Stream OfflineEvents (fake and real)
	 * @param e 
	 */
	private StreamOfflineEventsHandler(e: EventSubStreamOfflineEvent | mockup_EventSubStreamOfflineEvent) {
		signale.debug('StreamOfflineEventsHandler', JSON.stringify(getRawData(e), null, 4));
		this._onlineTimer.stop();
		DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went offline!`));
	}

	/**
	 * handle Channel UpdateEvents
	 */
	private ChannelUpdateEvents(e: EventSubChannelUpdateEvent) {
		signale.debug('ChannelUpdateEvents', JSON.stringify(getRawData(e), null, 4));
		DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} changed title to <${e.streamTitle}> and category to <${e.categoryName}>`));
	}

	/**
	 * set cool down stop watch
	 */
	private setCoolDownEndDate(coolDownEndDate: Date) {
		this._currentCoolDown = coolDownEndDate.getTime();
		this._timerLeft = this._currentCoolDown - Date.now();
		// stop timer just to be sure
		this._currentCoolDownTimer.stop();
		// set timer
		this._currentCoolDownTimer.start(this._timerLeft);
		// inform channel about new cool down
		// R -> Relative (in 2 minutes)
		// t -> short time (2:19 AM)
		DiscordMessageQueue.add(() => this.sendMessage(`:station: The hype train cool down ends <t:${this.timeInSeconds()}:R>.`));
	}

	/**
	 * delete last send message
	 */
	private deleteLastMessage() {
		if (this._discordClient.isReady()) {
			this._lastMessage?.delete();
		}
	}
}

const bot = new Bot();
bot.main();
