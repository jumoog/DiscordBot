import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField, TextChannel } from 'discord.js';
import { mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainProgressEvent } from './mockup.js';
import { EventSubChannelHypeTrainBeginEvent, EventSubChannelHypeTrainEndEvent, EventSubChannelHypeTrainProgressEvent } from '@twurple/eventsub-base/lib/index.js';
import { Simulation } from './simulation.js';

dotenv.config()

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
	_currentCoolDownTimer: Timer;
	_currentCoolDown: number;
	_discordClient;
	_timerLeft;
	_tokenPath;
	_level;
	_simulation;
	constructor() {
		this._userId = process.env.USERID || 631529415; // annabelstopit
		this._roomName = process.env.ROOMNAME || '';
		this._clientId = process.env.CLIENTID || '';
		this._clientSecret = process.env.CLIENTSECRET || '';
		this._discordToken = process.env.DISCORDTOKEN || '';
		this._currentCoolDownTimer = new Timer();
		this._currentCoolDown = 0;
		this._discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
		this._timerLeft = 0;
		this._tokenPath = '';
		this._level = 0;
		this._simulation = false;
	}

	async main() {
		this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json'
		if (!fs.existsSync(this._tokenPath)) {
			this._simulation = true;
		}
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			signale.success(`Ready! Logged in as ${c.user.tag}`);
			if (!this._simulation) {
				this.startTwitch();
			} else {
				this.startHypeTrainSimulation();
			}

			// time is over event
			this._currentCoolDownTimer.on('done', () => {
				this.sendMessage(`The next Hype Train is ready!`);
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
			// We need the Twitch Events
			// https://dev.twitch.tv/docs/eventsub/handling-webhook-events
			const twitchListener = new EventSubWsListener({ apiClient });
			await twitchListener.start();

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
		}
	}

	async startHypeTrainSimulation() {
		const sim = new Simulation("this._userId", "this._userId", "this._userId");
		while (true) {
			this.hypeTrainBeginEventsHandler(sim.genFakeBeginEvent(2));
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			this.hypeTrainProgressEvents(sim.genFakeProgressEvent());
			await sleep(1000);
			// end hype train at level 10 with 2 minutes cool down
			this.hypeTrainEndEventsHandler(sim.genFakeEndEvent(2));
			// wait 3 minutes
			await sleep(180000);
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
				channel.send(message);
			} else {
				signale.error(`Help! i can't post in this room`);
			}
		}
	}

	/**
	 * Javascript has UNIX Timestamps in milliseconds.
	 * Convert to seconds to avoid 52961 years problem
	 * @returns 
	 */
	timeInSeconds(): number {
		return Math.floor(this._currentCoolDown / 1000);
	}

	/**
	 * handle Hype Train EndEvents (fake and real)
	 * @param e 
	 */
	hypeTrainEndEventsHandler(e: EventSubChannelHypeTrainEndEvent | mockup_EventSubChannelHypeTrainEndEvent) {
		this.sendMessage(`We reached Level ${e.level}!`);
		// reset level
		this._level = 0;
		// next hype train as UTC
		this._currentCoolDown = e.cooldownEndDate.getTime();
		this._timerLeft = this._currentCoolDown - Date.now();
		// stop timer just to be sure
		this._currentCoolDownTimer.stop();
		// set timer
		this._currentCoolDownTimer.start(this._timerLeft);
		// inform channel about new cool down
		// R -> Relative (in 2 minutes)
		// t -> short time (2:19 AM)
		this.sendMessage(`Next Hype Train is <t:${this.timeInSeconds()}:R> at <t:${this.timeInSeconds()}:t> possible`);
	}

	/**
	 * handle Hype Train BeginEvents (fake and real)
	 * @param e 
	 */
	hypeTrainBeginEventsHandler(e: EventSubChannelHypeTrainBeginEvent | mockup_EventSubChannelHypeTrainBeginEvent) {
		this._level = e.level;
		this.sendMessage(`A Hype Train has started at Level ${e.level}!`);
	}

	/**
	 * handle Hype Train ProgressEvents (fake and real)
	 * @param e 
	 */
	hypeTrainProgressEvents(e: EventSubChannelHypeTrainProgressEvent | mockup_EventSubChannelHypeTrainProgressEvent) {
		if (this._level !== e.level) {
			this._level = e.level;
			if (e.lastContribution.type === "subscription") {
				this.sendMessage(`:gift: ${e.lastContribution.userDisplayName} gifted ${e.lastContribution.total / 500} subs! :gift:`);
			} 
			else if (e.lastContribution.type === "bits") {
				this.sendMessage(`:coin: ${e.lastContribution.userDisplayName} cheered ${e.lastContribution.total} bits! :coin:`);
			}
			this.sendMessage(`Hype Train reached Level ${this._level}!`);
		}
		if (this._simulation) {
			this.sendMessage(`Hype Train points ${e.total}!`);
		}
	}
}

const bot = new Bot();
bot.main();
