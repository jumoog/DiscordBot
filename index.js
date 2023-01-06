import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import { genFakeBeginEvent, genFakeEndEvent, genFakeProgressEvent } from './mockup.js';
dotenv.config();
const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
process.on('unhandledRejection', (reason, p) => {
    signale.fatal('caught your junk %s', reason);
    if (reason.stack) {
        signale.fatal(reason.stack);
    }
});
class Bot {
    _userId;
    _roomName;
    _clientId;
    _clientSecret;
    _discordToken;
    _currentCoolDownTimer;
    _currentCoolDown;
    _discordClient;
    _timerLeft;
    _tokenPath;
    _level;
    _simulation;
    constructor() {
        this._userId = process.env.USERID || 631529415;
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
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json';
        if (!fs.existsSync(this._tokenPath)) {
            this._simulation = true;
        }
        this._discordClient.once(Events.ClientReady, c => {
            signale.success(`Ready! Logged in as ${c.user.tag}`);
            if (!this._simulation) {
                this.startTwitch();
            }
            else {
                this.startHypeTrainSimulation();
            }
            this._currentCoolDownTimer.on('done', () => {
                this.sendMessage(`The next Hype Train is ready!`);
            });
        });
        this._discordClient.login(this._discordToken);
    }
    async startTwitch() {
        if (fs.existsSync(this._tokenPath)) {
            signale.success(`found tokens.json!`);
            const tokenDataHypeTrain = JSON.parse(fs.readFileSync(this._tokenPath, 'utf8'));
            const authProviderHypeTrain = new RefreshingAuthProvider({
                clientId: this._clientId,
                clientSecret: this._clientSecret,
                onRefresh: async (newTokenData) => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8')
            }, tokenDataHypeTrain);
            const apiClient = new ApiClient({ authProvider: authProviderHypeTrain });
            const twitchListener = new EventSubWsListener({ apiClient });
            await twitchListener.start();
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
        else {
            this.sendMessage(`no tokens.json! No Twitch Support! Running in Mocking mode!`);
            this.hypeTrainEndEventsHandler(genFakeEndEvent(2));
        }
    }
    async startHypeTrainSimulation() {
        while (true) {
            this.hypeTrainBeginEventsHandler(genFakeBeginEvent(2));
            await sleep(1000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(2));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(3));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(4));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(5));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(6));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(7));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(8));
            await sleep(50000);
            this.hypeTrainProgressEvents(genFakeProgressEvent(9));
            await sleep(50000);
            this.hypeTrainEndEventsHandler(genFakeEndEvent(2, 10));
            await sleep(180000);
        }
    }
    async sendHypeTrainMessage() {
        if (this._discordClient.isReady()) {
            const targetChannel = this._discordClient.channels.cache.find((channel) => channel.name === this._roomName);
            if (targetChannel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                const exampleEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('Hypetrain Time!')
                    .setTimestamp();
                targetChannel.send({ embeds: [exampleEmbed] });
            }
            else {
                signale.error(`Help! i can't post in this room`);
            }
        }
    }
    async sendMessage(message) {
        if (this._discordClient.isReady()) {
            const channel = this._discordClient.channels.cache.find((channel) => channel.name === this._roomName);
            if (channel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                channel.send(message);
            }
            else {
                signale.error(`Help! i can't post in this room`);
            }
        }
    }
    timeInSeconds() {
        return Math.floor(this._currentCoolDown / 1000);
    }
    hypeTrainEndEventsHandler(e) {
        this.sendMessage(`We reached Level ${e.level}!`);
        this._level = 0;
        this._currentCoolDown = e.cooldownEndDate.getTime();
        this._timerLeft = this._currentCoolDown - Date.now();
        this._currentCoolDownTimer.stop();
        this._currentCoolDownTimer.start(this._timerLeft);
        this.sendMessage(`Next Hype Train is <t:${this.timeInSeconds()}:R> at <t:${this.timeInSeconds()}:t> possible`);
    }
    hypeTrainBeginEventsHandler(e) {
        this._level = e.level;
        this.sendMessage(`A Hype Train has started at Level ${e.level}!`);
    }
    hypeTrainProgressEvents(e) {
        if (this._level !== e.level) {
            this._level = e.level;
            this.sendMessage(`Hype Train reached Level ${this._level}!`);
        }
    }
}
const bot = new Bot();
bot.main();
