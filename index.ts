import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField, TextChannel } from 'discord.js';
import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent } from './mockup.js';

dotenv.config()

// catch all possible errors and don't crash
process.on('unhandledRejection', (reason: Error | any, p: Promise<any>) => {
	signale.fatal('caught your junk %s', reason);
	if (reason.stack) {
		signale.fatal(reason.stack);
	}
});

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
	}

	async main() {
		// discord client
		this._discordClient.once(Events.ClientReady, c => {
			signale.success(`Ready! Logged in as ${c.user.tag}`);
			this.startTwitch();
		});
		this._discordClient.login(this._discordToken);
	}

	async startTwitch() {
		// check if it runs in Docker or local
		this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json'
		// check if json file exists
		if (fs.existsSync(this._tokenPath)) {
			signale.success(`found tokens.json!`);
			const tokenDataHypeTrain = JSON.parse(fs.readFileSync(this._tokenPath, 'utf8'));
			const authProviderHypeTrain = new RefreshingAuthProvider(
				{
					clientId: this._clientId,
					clientSecret: this._clientSecret,
					onRefresh: async newTokenData => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8')
				},
				tokenDataHypeTrain
			);

			const apiClient = new ApiClient({ authProvider: authProviderHypeTrain });
			const twitchListener = new EventSubWsListener({ apiClient });
			await twitchListener.start();

			// https://twurple.js.org/reference/eventsub-ws/classes/EventSubWsListener.html#subscribeToChannelHypeTrainEndEvents
			await twitchListener.subscribeToChannelHypeTrainEndEvents(Number(this._userId), e => {
				// TODO display (level and co?)
				console.info(e.topContributors);
				console.info(e.level);
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
				this.sendMessage(`Next HypeTrain <t:${this._currentCoolDown}:R> at <t:${this._currentCoolDown}:t>`);
			});

			await twitchListener.subscribeToChannelHypeTrainBeginEvents(Number(this._userId), e => {
				this.sendMessage(`A HypeTrain has started!`);
			});

		} else {
			this.sendMessage(`no tokens.json! No Twitch Support! Running in Mocking mode!`);
			// create fake EventSubChannelHypeTrainEndEvent
			const e = this.genFakeEndEvent(2);
			// next hype train as UTC
			this._currentCoolDown = e.cooldownEndDate.getTime();
			this._timerLeft = this._currentCoolDown - Date.now();
			e.topContributors.forEach( element => {
				this.sendMessage(`${element.userDisplayName} contributed ${element.total} ${element.type}`);
			});
			// stop timer just to be sure
			this._currentCoolDownTimer.stop();
			// set timer
			this._currentCoolDownTimer.start(this._timerLeft);
			// inform channel about new cool down
			// R -> Relative (in 2 minutes)
			// t -> short time (2:19 AM)
			this.sendMessage(`Next HypeTrain <t:${this.timeInSeconds()}:R> at <t:${this.timeInSeconds()}:t>`);
		}
		// time is over event
		this._currentCoolDownTimer.on('done', () => {
			this.sendMessage(`The next HypeTrain is ready!`);
		});
	}

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
				// TODO build something usefull
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

	timeInSeconds(): number {
		return Math.floor(this._currentCoolDown / 1000);
	}

	genFakeEndEvent(minutes: number): mockup_EventSubChannelHypeTrainEndEvent {
		return new mockup_EventSubChannelHypeTrainEndEvent({
			id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
			broadcaster_user_id: "1337",
			broadcaster_user_login: "cool_user",
			broadcaster_user_name: "Cool_User",
			level: 2,
			total: 137,
			top_contributions: [
				{ "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
				{ "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
			],
			started_at: "2020-07-15T17:16:03.17106713Z",
			ended_at: "2020-07-15T17:16:11.17106713Z",
			// now + 20 mins
			cooldown_ends_at: new Date(new Date().getTime() + (minutes * 60 * 1000)).toISOString()
		});
	}

	genFakeBeginEvent(){
		return new mockup_EventSubChannelHypeTrainBeginEvent({
			id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
			broadcaster_user_id: "1337",
			broadcaster_user_login: "cool_user",
			broadcaster_user_name: "Cool_User",
			total: 137,
			progress: 137,
			goal: 500,
			top_contributions: [
				{ "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
				{ "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
			],
			last_contribution: { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
			level: 2,
			started_at: "2020-07-15T17:16:03.17106713Z",
			expires_at: "2020-07-15T17:16:11.17106713Z"
		});
	}
	
	genFakeProgressEvent() {
		return new mockup_EventSubChannelHypeTrainProgressEvent({
			id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
			broadcaster_user_id: "1337",
			broadcaster_user_login: "cool_user",
			broadcaster_user_name: "Cool_User",
			level: 2,
			total: 700,
			progress: 200,
			goal: 1000,
			top_contributions: [
				{ "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
				{ "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
			],
			last_contribution: { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
			started_at: "2020-07-15T17:16:03.17106713Z",
			expires_at: "2020-07-15T17:16:11.17106713Z"
		});
	}
}

const bot = new Bot();
bot.main();
