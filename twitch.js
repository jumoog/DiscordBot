import EventEmitter from 'events';
import dotenv from 'dotenv';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { getRawData } from '@twurple/common';
import { rooms } from './discord.js';
dotenv.config();
export class Twitch extends EventEmitter {
    _userId;
    _clientId;
    _clientSecret;
    _timerLeft;
    _tokenPath;
    _level;
    _total;
    _currentCoolDownTimer;
    _currentCoolDown;
    _onlineTimer;
    _streamStartTimer;
    constructor() {
        super();
        this._userId = process.env.USERID || 631529415;
        this._clientId = process.env.CLIENTID || '';
        this._clientSecret = process.env.CLIENTSECRET || '';
        this._timerLeft = 0;
        this._tokenPath = '';
        this._currentCoolDownTimer = new Timer();
        this._currentCoolDown = 0;
        this._level = 0;
        this._total = 0;
        this._onlineTimer = new Timer();
        this._streamStartTimer = new Timer();
    }
    async main() {
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json';
        if (fs.existsSync(this._tokenPath)) {
            this.twurpleStart();
        }
        else {
            this.sendDebugMessage(`can't find twitch tokens!`);
        }
        this._currentCoolDownTimer.on('done', () => {
            this.emit('deleteCoolDown');
            this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
        });
        this._onlineTimer.on('done', () => {
            if (this._streamStartTimer.status === 'stopped') {
                this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.twitch.tv/annabelstopit`, rooms.shoutout);
                this._streamStartTimer.start(1800000);
            }
        });
    }
    async twurpleStart() {
        if (fs.existsSync(this._tokenPath)) {
            signale.success(`found tokens.json!`);
            const tokenDataHypeTrain = JSON.parse(fs.readFileSync(this._tokenPath, 'utf8'));
            const authProviderHypeTrain = new RefreshingAuthProvider({
                clientId: this._clientId,
                clientSecret: this._clientSecret,
            });
            authProviderHypeTrain.addUser(this._userId, tokenDataHypeTrain);
            authProviderHypeTrain.onRefresh((_userId, newTokenData) => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8'));
            authProviderHypeTrain.onRefreshFailure(_userId => {
                this.sendDebugMessage(`user token refresh failed!`);
                signale.fatal(`user token refresh failed!`);
            });
            const apiClient = new ApiClient({ authProvider: authProviderHypeTrain });
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
            const twitchListener = new EventSubWsListener({
                apiClient,
                logger: {
                    minLevel: 'trace',
                    custom: (level, message) => {
                        fs.writeFileSync(`/tokens/HEALTH`, message);
                    },
                },
            });
            twitchListener.start();
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
                process.on('SIGINT', async () => {
                    signale.success('shutting down!');
                    await this.sendDebugMessage('shutting down!');
                    twitchListener.stop();
                    process.exit(0);
                });
                process.on('SIGTERM', async () => {
                    signale.success('shutting down!');
                    await this.sendDebugMessage('shutting down!');
                    twitchListener.stop();
                    process.exit(0);
                });
            }
            catch (e) {
                twitchListener.stop();
                signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
                this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
            }
        }
    }
    sendMessage(message, room = rooms.hypetrain) {
        this.emit('sendMessage', message, room);
    }
    async sendDebugMessage(message) {
        this.sendMessage(message, rooms.debug);
    }
    timeInSeconds(date = this._currentCoolDown) {
        return Math.floor(date / 1000);
    }
    hypeTrainEndEventsHandler(e) {
        signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`);
        this._level = 0;
        this._total = 0;
        this.setCoolDownEndDate(e.cooldownEndDate);
    }
    hypeTrainBeginEventsHandler(e) {
        signale.debug('hypeTrainBeginEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._level = e.level;
        this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`);
    }
    hypeTrainProgressEvents(e) {
        if (this._total !== e.total) {
            this._total = e.total;
            signale.debug('hypeTrainProgressEvents', JSON.stringify(getRawData(e), null, 4));
            if (this._level !== e.level) {
                this._level = e.level;
                this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`);
            }
            if (e.lastContribution.type === "subscription") {
                const amount = e.lastContribution.total / 500;
                this.sendMessage(":gift: `" + e.lastContribution.userDisplayName + "` gifted **" + amount + "** sub" + (amount > 1 ? "s" : "") + "!");
            }
            else if (e.lastContribution.type === "bits") {
                this.sendMessage(":coin: `" + e.lastContribution.userDisplayName + "` cheered **" + e.lastContribution.total + "** bits!");
            }
            this.sendDebugMessage(`The hype train points: ${e.total} Level: **${e.level}**`);
        }
        else {
            signale.debug('hypeTrainProgressEvents', 'skipping duplicate!');
        }
    }
    StreamOnlineEventsHandler(e) {
        signale.debug('StreamOnlineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.start(120000);
        this.sendDebugMessage(`${e.broadcasterDisplayName} went online!`);
    }
    StreamOfflineEventsHandler(e) {
        signale.debug('StreamOfflineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.stop();
        this.sendDebugMessage(`${e.broadcasterDisplayName} went offline!`);
    }
    ChannelUpdateEvents(e) {
        signale.debug('ChannelUpdateEvents', JSON.stringify(getRawData(e), null, 4));
        this.sendDebugMessage(`${e.broadcasterDisplayName} changed title to <${e.streamTitle}> and category to <${e.categoryName}>`);
    }
    setCoolDownEndDate(coolDownEndDate) {
        this._currentCoolDown = coolDownEndDate.getTime();
        this._timerLeft = this._currentCoolDown - Date.now();
        this._currentCoolDownTimer.stop();
        this._currentCoolDownTimer.start(this._timerLeft);
        this.sendMessage(`:station: The hype train cool down ends <t:${this.timeInSeconds()}:R>.`);
    }
}
