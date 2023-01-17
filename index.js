import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, EmbedBuilder, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import { mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainProgressEvent, mockup_EventSubStreamOfflineEvent, mockup_EventSubStreamOnlineEvent } from './mockup.js';
import { getRawData } from '@twurple/common';
import PQueue from 'p-queue';
dotenv.config();
const DiscordMessageQueue = new PQueue({ concurrency: 1 });
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
    _debugRoomName;
    _currentCoolDownTimer;
    _currentCoolDown;
    _cooldownPeriod;
    _discordClient;
    _timerLeft;
    _tokenPath;
    _level;
    _total;
    _simulation;
    _onlineTimer;
    constructor() {
        this._userId = process.env.USERID || 631529415;
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
    }
    async main() {
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json';
        if (!fs.existsSync(this._tokenPath)) {
            this._simulation = true;
        }
        this._discordClient.once(Events.ClientReady, c => {
            this.sendDebugMessage(`Ready! Logged in as ${c.user.tag}`);
            signale.success(`Ready! Logged in as ${c.user.tag}`);
            if (!this._simulation) {
                this.startTwitch();
            }
            else {
                this.startHypeTrainSimulation();
            }
            this._currentCoolDownTimer.on('done', () => {
                this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
            });
            this._onlineTimer.on('done', () => {
                this.sendMessage(`5 minutes waiting time over! annabelstopit is online!`);
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
            const { data: events } = await apiClient.hypeTrain.getHypeTrainEventsForBroadcaster(this._userId);
            events.forEach(hypetrainEvent => {
                signale.debug('getHypeTrainEventsForBroadcaster', JSON.stringify(getRawData(hypetrainEvent), null, 4));
                if (hypetrainEvent.expiryDate.getTime() - new Date().getTime() > 0) {
                    this.sendDebugMessage(`A hype train Event is currently running`);
                }
                else {
                    this.sendDebugMessage(`No hype train Event is currently running`);
                    this.setCooldownPeriod(hypetrainEvent);
                    this.sendDebugMessage(`The Cooldown Period is set to ${Math.round(this._cooldownPeriod / 3600000)} hour(s)!`);
                    if (new Date().getTime() - hypetrainEvent.cooldownDate.getTime() < this._cooldownPeriod) {
                        this.sendDebugMessage(`The last hype train was less than an ${Math.round(this._cooldownPeriod / 3600000)} hour(s) ago. Set cool down.`);
                        this.setCooldownEndDate(hypetrainEvent.cooldownDate);
                    }
                    else {
                        this.sendDebugMessage(`The last hype train started at <t:${this.timeInSeconds(hypetrainEvent.startDate.getTime())}:f> and ended at <t:${this.timeInSeconds(hypetrainEvent.expiryDate.getTime())}:f> with Level ${hypetrainEvent.level}`);
                    }
                }
            });
            const twitchListener = new EventSubWsListener({ apiClient });
            await twitchListener.start();
            try {
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
                    this.StreamOnlineEventsHandler(e);
                });
                await twitchListener.subscribeToStreamOfflineEvents(Number(this._userId), e => {
                    this.StreamOfflineEventsHandler(e);
                });
            }
            catch (e) {
                await twitchListener.stop();
                signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
                this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
            }
        }
    }
    async startHypeTrainSimulation() {
        const hypes = JSON.parse(fs.readFileSync(`./10_01_2023.json`, 'utf-8'));
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
            await sleep(100000);
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
        await sleep(1000);
    }
    async sendDebugMessage(message) {
        if (this._discordClient.isReady()) {
            const channel = this._discordClient.channels.cache.find((channel) => channel.name === this._debugRoomName);
            if (channel.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                channel.send(message);
            }
            else {
                signale.error(`Help! i can't post in this room`);
            }
        }
        await sleep(1000);
    }
    timeInSeconds(date = this._currentCoolDown) {
        return Math.floor(date / 1000);
    }
    hypeTrainEndEventsHandler(e) {
        signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));
        DiscordMessageQueue.add(() => this.sendMessage(`:checkered_flag: hype train is over! We reached Level **${e.level}**!`));
        this._level = 0;
        this._total = 0;
        this.setCooldownEndDate(e.cooldownEndDate);
    }
    hypeTrainBeginEventsHandler(e) {
        signale.debug('hypeTrainBeginEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._level = e.level;
        DiscordMessageQueue.add(() => this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`));
    }
    hypeTrainProgressEvents(e) {
        if (this._total !== e.total) {
            this._total = e.total;
            signale.debug('hypeTrainProgressEvents', JSON.stringify(getRawData(e), null, 4));
            if (this._level !== e.level) {
                this._level = e.level;
                DiscordMessageQueue.add(() => this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`));
            }
            if (e.lastContribution.type === "subscription") {
                DiscordMessageQueue.add(() => this.sendMessage(":gift: `" + e.lastContribution.userDisplayName + "` gifted **" + (e.lastContribution.total / 500) + "** subs!"));
            }
            else if (e.lastContribution.type === "bits") {
                DiscordMessageQueue.add(() => this.sendMessage(":coin: `" + e.lastContribution.userDisplayName + "` cheered **" + (e.lastContribution.total) + "** bits!"));
            }
            DiscordMessageQueue.add(() => this.sendDebugMessage(`The hype train points: ${e.total} Level: **${e.level}**`));
        }
        else {
            signale.debug('hypeTrainProgressEvents', 'skipping duplicate!');
        }
    }
    StreamOnlineEventsHandler(e) {
        signale.debug('StreamOnlineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.start(300000);
        DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went online!`));
    }
    StreamOfflineEventsHandler(e) {
        signale.debug('StreamOfflineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.stop();
        DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} went offline!`));
    }
    setCooldownEndDate(cooldownEndDate) {
        this._currentCoolDown = cooldownEndDate.getTime();
        this._timerLeft = this._currentCoolDown - Date.now();
        this._currentCoolDownTimer.stop();
        this._currentCoolDownTimer.start(this._timerLeft);
        DiscordMessageQueue.add(() => this.sendMessage(`:station: The hype train cooldown ends <t:${this.timeInSeconds()}:R>.`));
    }
    setCooldownPeriod(hypetrainEvent) {
        const cooldownDate = hypetrainEvent.cooldownDate;
        const expiryDate = hypetrainEvent.expiryDate;
        cooldownDate.setMilliseconds(0);
        expiryDate.setMilliseconds(0);
        this._cooldownPeriod = (cooldownDate.getTime() - expiryDate.getTime());
    }
}
const bot = new Bot();
bot.main();
