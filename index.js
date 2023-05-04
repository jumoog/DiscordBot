import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { Client, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
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
    _hypeTrainRoom;
    _clientId;
    _clientSecret;
    _discordToken;
    _debugRoom;
    _currentCoolDownTimer;
    _currentCoolDown;
    _discordClient;
    _timerLeft;
    _tokenPath;
    _level;
    _total;
    _simulation;
    _onlineTimer;
    _lastMessage;
    _shoutOut;
    constructor() {
        this._userId = process.env.USERID || 631529415;
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
        this._lastMessage = {};
    }
    async main() {
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json';
        if (!fs.existsSync(this._tokenPath)) {
            this._simulation = true;
        }
        this._discordClient.once(Events.ClientReady, c => {
            this._hypeTrainRoom = this.getChannel(process.env.ROOMNAME || '🚀┃hypetrain');
            this._debugRoom = this.getChannel(process.env.DEBUGROOMNAME || 'debug_prod');
            this._shoutOut = this.getChannel(process.env.SHOUTOUTROOMNAME || 'shoutout');
            this.sendDebugMessage(`Ready! Logged in as ${c.user.tag}`);
            signale.success(`Ready! Logged in as ${c.user.tag}`);
            if (!this._simulation) {
                this.startTwitch();
            }
            else {
                this.startHypeTrainSimulation();
            }
            this._currentCoolDownTimer.on('done', () => {
                this.deleteLastMessage();
                this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
            });
            this._onlineTimer.on('done', () => {
                this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.twitch.tv/annabelstopit`, this._shoutOut);
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
                onRefresh: async (_userId, newTokenData) => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8')
            });
            authProviderHypeTrain.addUser(this._userId, tokenDataHypeTrain);
            let debugLevel = process.env.TWURPLEDEBUG || 'warning';
            const apiClient = new ApiClient({
                authProvider: authProviderHypeTrain, logger: {
                    minLevel: debugLevel
                }
            });
            const { data: events } = await apiClient.hypeTrain.getHypeTrainEventsForBroadcaster(this._userId);
            events.forEach(hypeTrainEvent => {
                signale.debug('getHypeTrainEventsForBroadcaster', JSON.stringify(getRawData(hypeTrainEvent), null, 4));
                if (hypeTrainEvent.expiryDate.getTime() - new Date().getTime() > 0) {
                    this.sendDebugMessage(`A hype train Event is currently running`);
                }
                else {
                    this.sendDebugMessage(`No hype train Event is currently running`);
                    if (hypeTrainEvent.cooldownDate.getTime() - new Date().getTime() > 0) {
                        this.sendDebugMessage(`Cool down is still active`);
                        this.setCoolDownEndDate(hypeTrainEvent.cooldownDate);
                    }
                    else {
                        this.sendDebugMessage(`The last hype train started at <t:${this.timeInSeconds(hypeTrainEvent.startDate.getTime())}:f> and ended at <t:${this.timeInSeconds(hypeTrainEvent.expiryDate.getTime())}:f> with Level ${hypeTrainEvent.level}`);
                    }
                }
            });
            const twitchListener = new EventSubWsListener({ apiClient });
            twitchListener.start();
            twitchListener.onUserSocketDisconnect(async (_, err) => {
                err?.name;
            });
            try {
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
                    this.StreamOnlineEventsHandler(e);
                });
                twitchListener.onStreamOffline(Number(this._userId), e => {
                    this.StreamOfflineEventsHandler(e);
                });
                twitchListener.onChannelUpdate(Number(this._userId), e => {
                    this.ChannelUpdateEvents(e);
                });
            }
            catch (e) {
                twitchListener.stop();
                signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
                this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
            }
        }
    }
    async startHypeTrainSimulation() {
        const hypes = JSON.parse(fs.readFileSync(`./10_01_2023.json`, 'utf-8'));
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
            await sleep(1000000);
        }
    }
    getChannel(room) {
        return this._discordClient.channels.cache.find((channel) => channel.name === room);
    }
    async sendMessage(message, room = this._hypeTrainRoom) {
        if (this._discordClient.isReady()) {
            if (room?.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                if (room === this._debugRoom) {
                    await room.send(message);
                }
                else {
                    this._lastMessage = await room.send(message);
                }
            }
            else {
                signale.error(`Help! i can't post in this room`);
            }
        }
        await sleep(750);
    }
    async testPermission(room) {
        if (this._discordClient.isReady()) {
            if (room?.permissionsFor(this._discordClient.user)?.has(PermissionsBitField.Flags.SendMessages)) {
                this.sendDebugMessage(`I can post in <${room.name}>`);
            }
            else {
                this.sendDebugMessage(`Help! i can't post in <${room.name}>`);
            }
            await sleep(750);
        }
    }
    async sendDebugMessage(message) {
        await this.sendMessage(message, this._debugRoom);
    }
    timeInSeconds(date = this._currentCoolDown) {
        return Math.floor(date / 1000);
    }
    hypeTrainEndEventsHandler(e) {
        signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));
        DiscordMessageQueue.add(() => this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`));
        this._level = 0;
        this._total = 0;
        this.setCoolDownEndDate(e.cooldownEndDate);
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
                const amount = e.lastContribution.total / 500;
                DiscordMessageQueue.add(() => this.sendMessage(":gift: `" + e.lastContribution.userDisplayName + "` gifted **" + amount + "** sub" + (amount > 1 ? "s" : "") + "!"));
            }
            else if (e.lastContribution.type === "bits") {
                DiscordMessageQueue.add(() => this.sendMessage(":coin: `" + e.lastContribution.userDisplayName + "` cheered **" + e.lastContribution.total + "** bits!"));
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
    ChannelUpdateEvents(e) {
        signale.debug('ChannelUpdateEvents', JSON.stringify(getRawData(e), null, 4));
        DiscordMessageQueue.add(() => this.sendDebugMessage(`${e.broadcasterDisplayName} changed title to <${e.streamTitle}> and category to <${e.categoryName}>`));
    }
    setCoolDownEndDate(coolDownEndDate) {
        this._currentCoolDown = coolDownEndDate.getTime();
        this._timerLeft = this._currentCoolDown - Date.now();
        this._currentCoolDownTimer.stop();
        this._currentCoolDownTimer.start(this._timerLeft);
        DiscordMessageQueue.add(() => this.sendMessage(`:station: The hype train cool down ends <t:${this.timeInSeconds()}:R>.`));
    }
    deleteLastMessage() {
        if (this._discordClient.isReady()) {
            this._lastMessage.delete();
        }
    }
}
const bot = new Bot();
bot.main();
