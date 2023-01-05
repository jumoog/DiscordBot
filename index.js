import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import { genFakeEndEvent } from './mockup.js';
dotenv.config();
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
    }
    async main() {
        this._discordClient.once(Events.ClientReady, c => {
            signale.success(`Ready! Logged in as ${c.user.tag}`);
            this.startTwitch();
        });
        this._discordClient.login(this._discordToken);
    }
    async startTwitch() {
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json';
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
                console.info(e.topContributors);
                console.info(e.level);
                this._currentCoolDown = e.cooldownEndDate.getTime();
                this._timerLeft = this._currentCoolDown - Date.now();
                this._currentCoolDownTimer.stop();
                this._currentCoolDownTimer.start(this._timerLeft);
                this.sendMessage(`Next HypeTrain <t:${this.timeInSeconds()}:R> at <t:${this.timeInSeconds()}:t>`);
            });
            await twitchListener.subscribeToChannelHypeTrainBeginEvents(Number(this._userId), e => {
                this.sendMessage(`A HypeTrain has started!`);
            });
        }
        else {
            this.sendMessage(`no tokens.json! No Twitch Support! Running in Mocking mode!`);
            const e = genFakeEndEvent(2);
            this._currentCoolDown = e.cooldownEndDate.getTime();
            this._timerLeft = this._currentCoolDown - Date.now();
            e.topContributors.forEach(element => {
                if (element.type === "subscription") {
                    this.sendMessage(`${element.userDisplayName} contributed ${element.total} ${element.type}`);
                }
            });
            this._currentCoolDownTimer.stop();
            this._currentCoolDownTimer.start(this._timerLeft);
            this.sendMessage(`Next HypeTrain <t:${this.timeInSeconds()}:R> at <t:${this.timeInSeconds()}:t>`);
        }
        this._currentCoolDownTimer.on('done', () => {
            this.sendMessage(`The next HypeTrain is ready!`);
        });
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
}
const bot = new Bot();
bot.main();
