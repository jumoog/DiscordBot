import EventEmitter from 'events';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import path from 'node:path';
import signale from "signale";
import { EventSubStreamOnlineEvent, EventSubStreamOfflineEvent, EventSubChannelUpdateEvent, EventSubChannelHypeTrainContribution, EventSubChannelHypeTrainBeginV2Event, EventSubChannelHypeTrainEndV2Event, EventSubChannelHypeTrainProgressV2Event, EventSubChannelSubscriptionEvent, EventSubChannelSubscriptionGiftEvent, EventSubChannelCheerEvent } from '@twurple/eventsub-base';
import { getRawData } from '@twurple/common';
import { Rooms } from './discord.js';
import { touch } from './health.ts';

/**
 * Bot class
 */
export class Twitch extends EventEmitter {
    private readonly _userId: string;
    private readonly _clientId: string;
    private readonly _clientSecret: string;
    private _tokenPath: string;
    private _hypeTrainLevel: number;
    private _hypeTrainTotal: number;
    private _hypeTrainActive: boolean;
    private readonly _currentCoolDownTimer: Timer;
    private _currentCoolDown: number;
    private readonly _onlineTimer: Timer;
    private readonly _streamStartTimer: Timer;

    constructor() {
        super();
        this._userId = String(process.env.USERID ?? '631529415');
        this._clientId = process.env.CLIENTID ?? '';
        this._clientSecret = process.env.CLIENTSECRET ?? '';
        this._tokenPath = '';
        this._currentCoolDownTimer = new Timer();
        this._currentCoolDown = 0;
        this._hypeTrainLevel = 0;
        this._hypeTrainTotal = 0;
        this._hypeTrainActive = false;
        this._onlineTimer = new Timer();
        this._streamStartTimer = new Timer();

        this._currentCoolDownTimer.on('done', this.onCoolDownTimerDone.bind(this));
        this._onlineTimer.on('done', this.onOnlineTimerDone.bind(this));
    }

    private get broadcasterId(): number {
        const parsed = Number.parseInt(this._userId, 10);
        if (!Number.isFinite(parsed)) {
            throw new Error(`Invalid USERID: ${this._userId}`);
        }
        return parsed;
    }

    private resolveTokenPath(): string | null {
        const candidates = [
            // Docker: mounted volume
            path.posix.join('/tokens', 'tokens.json'),
            // Local dev
            path.resolve('tokens.json'),
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }

        return null;
    }

    /**
     * start function
     */
    async main(): Promise<void> {
        if (!this._clientId || !this._clientSecret) {
            this.sendDebugMessage(`Missing CLIENTID/CLIENTSECRET env vars`);
            signale.fatal(`Missing CLIENTID/CLIENTSECRET env vars`);
            return;
        }

        const tokenPath = this.resolveTokenPath();
        if (!tokenPath) {
            this.sendDebugMessage(`can't find twitch tokens!`);
            return;
        }

        this._tokenPath = tokenPath;
        await this.twurpleStart();
    }

    /***
     * internal start
     */
    private async twurpleStart(): Promise<void> {
        if (!fs.existsSync(this._tokenPath)) {
            this.sendDebugMessage(`can't find twitch tokens!`);
            return;
        }

        const broadcasterId = this.broadcasterId;

        signale.success(`found tokens.json!`);
        const tokenData = JSON.parse(fs.readFileSync(this._tokenPath, 'utf8'));

        const authProvider = new RefreshingAuthProvider({
            clientId: this._clientId,
            clientSecret: this._clientSecret,
        });

        authProvider.addUser(this._userId, tokenData);
        authProvider.onRefresh((_userId: unknown, newTokenData: unknown) => {
            fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8');
        });
        authProvider.onRefreshFailure((_userId: unknown) => {
            this.sendDebugMessage(`user token refresh failed!`);
            signale.fatal(`user token refresh failed!`);
        });

        const apiClient = new ApiClient({ authProvider });

        const hypeTrainStatus = await apiClient.hypeTrain.getHypeTrainStatusForBroadcaster(this._userId);
        signale.debug('getHypeTrainEventsForBroadcaster', JSON.stringify(getRawData(hypeTrainStatus), null, 4));

        if (hypeTrainStatus?.current) {
            this._hypeTrainLevel = hypeTrainStatus.current.level;
            this._hypeTrainTotal = hypeTrainStatus.current.total;
            this._hypeTrainActive = true;
            this.sendDebugMessage(`A hype train Event is currently running`);
        } else {
            this.sendDebugMessage(`No hype train Event is currently running`);
        }

        const twitchListener = new EventSubWsListener({
            apiClient,
            logger: {
                minLevel: 'trace',
                custom: (level, message) => {
                    touch('twitch');
                    if (process.env.DEBUG) signale.debug(`[twurple:${level}] ${message}`);
                },
            },
        });

        twitchListener.start();

        try {
            twitchListener.onChannelHypeTrainEndV2(broadcasterId, e => this.onHypeTrainEnd(e));
            twitchListener.onChannelHypeTrainBeginV2(broadcasterId, e => this.onHypeTrainBegin(e));
            twitchListener.onChannelHypeTrainProgressV2(broadcasterId, e => this.onHypeTrainProgress(e));

            // channel:read:subscriptions
            twitchListener.onChannelSubscription(broadcasterId, e => this.onChannelSubscription(e));

            // channel:read:subscriptions
            twitchListener.onChannelSubscriptionGift(broadcasterId, e => this.onChannelSubscriptionGift(e));

            // bits:read
            twitchListener.onChannelCheer(broadcasterId, e => this.onChannelCheer(e));

            twitchListener.onStreamOnline(broadcasterId, e => this.onStreamOnline(e));
            twitchListener.onStreamOffline(broadcasterId, e => this.onStreamOffline(e));
            twitchListener.onChannelUpdate(broadcasterId, e => this.onChannelUpdate(e));

            const shutdown = async () => {
                signale.success('shutting down!');
                await this.sendDebugMessage('shutting down!');
                twitchListener.stop();
                process.exit(0);
            };

            // normal CTRL + C
            process.on('SIGINT', shutdown);
            // DOCKER
            process.on('SIGTERM', shutdown);
        } catch (_error) {
            twitchListener.stop();
            signale.fatal('Please reauthorize your broadcaster account to include all necessary scopes!');
            this.sendDebugMessage('Please reauthorize your broadcaster account to include all necessary scopes!');
        }
    }

    /**
     * helper function to send normal text messages
     */
    private sendMessage(message: string, room = Rooms.HYPETRAIN) {
        this.emit('sendMessage', message, room);
    }

    /**
     * helper function to send debug text messages
     */
    private sendDebugMessage(message: string) {
        this.sendMessage(message, Rooms.DEBUG);
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
    private onHypeTrainEnd(e: EventSubChannelHypeTrainEndV2Event) {
        signale.debug('onHypeTrainEnd', JSON.stringify(getRawData(e), null, 4));

        this.sendMessage(`:clap: **These are the top contributors to the hype train:**`);

        // Send message with all top contributions using handleLastContribution
        e.topContributors.forEach(contribution => {
            this.handleLastContribution(contribution);
        });

        // hype train ended
        this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`);
        // reset level
        this._hypeTrainLevel = 0;
        // reset total
        this._hypeTrainTotal = 0;
        // reset active
        this._hypeTrainActive = false;
        // next hype train as UTC
        this.setCoolDownEndDate(e.cooldownEndDate);
    }

    /**
     * handle hype train BeginEvents (fake and real)
     * @param e 
     */
    private onHypeTrainBegin(e: EventSubChannelHypeTrainBeginV2Event) {
        signale.debug('onHypeTrainBegin', JSON.stringify(getRawData(e), null, 4));
        this._hypeTrainLevel = e.level;
        this._hypeTrainTotal = e.total;
        this._hypeTrainActive = true;
        this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`);
    }

    /**
     * handle hype train ProgressEvents (fake and real)
     * @param e 
     */
    private onHypeTrainProgress(e: EventSubChannelHypeTrainProgressV2Event) {
        this._hypeTrainActive = true;
        const levelUp = e.level > this._hypeTrainLevel;

        if (this._hypeTrainTotal !== e.total) {
            this._hypeTrainLevel = e.level;
            this._hypeTrainTotal = e.total;
            // log JSON
            signale.debug('onHypeTrainProgress', JSON.stringify(getRawData(e), null, 4));

            // check if reached a new level
            if (levelUp) {
                this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`);
            }

            this.sendDebugMessage(`The hype train points: ${e.total} Level: **${e.level}**`);
        }
    }

    /**
     * Handles the last contribution made during a hype train event.
     * Sends a message to the channel based on the type of contribution.
     *
     * @param contribution - The contribution object containing details about the contribution.
     */
    private handleLastContribution(contribution: EventSubChannelHypeTrainContribution) {
        if (contribution.type === "subscription") {
            const amount = contribution.total / 500;
            this.sendMessage(":gift: `" + contribution.userDisplayName + "` gifted **" + amount + "** sub" + (amount > 1 ? "s" : "") + "!");
        } else if (contribution.type === "bits") {
            this.sendMessage(":coin: `" + contribution.userDisplayName + "` cheered **" + contribution.total + "** bits!");
        }
    }

    private onChannelSubscription(e: EventSubChannelSubscriptionEvent) {
        signale.debug('onChannelSubscription', JSON.stringify(getRawData(e), null, 4));
        if (e.isGift || !this._hypeTrainActive) return;
        this.sendMessage(`New subscription from ${e.userDisplayName}!`);
    }

    private onChannelSubscriptionGift(e: EventSubChannelSubscriptionGiftEvent) {
        signale.debug('onChannelSubscriptionGift', JSON.stringify(getRawData(e), null, 4));
        const msg = ":gift: `" + e.gifterDisplayName + "` gifted **" + e.amount + "** sub" + (e.amount > 1 ? "s" : "") + "!";
        if (!this._hypeTrainActive) {
            this.sendDebugMessage(msg);
            return;
        }
        this.sendMessage(msg);
    }

    private onChannelCheer(e: EventSubChannelCheerEvent) {
        signale.debug('onChannelCheer', JSON.stringify(getRawData(e), null, 4));
        const msg = ":coin: `" + e.userDisplayName + "` cheered **" + e.bits + "** bits!";
        if (!this._hypeTrainActive) {
            this.sendDebugMessage(msg);
            return;
        }
        this.sendMessage(msg);
    }

    /**
     * handle Stream OnlineEvents (fake and real)
     * @param e 
     */
    private onStreamOnline(e: EventSubStreamOnlineEvent) {
        signale.debug('onStreamOnline', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.start(120_000);
        this.emit('online', `${e.broadcasterDisplayName} went online!`);
    }

    /**
     * handle Stream OfflineEvents (fake and real)
     * @param e 
     */
    private onStreamOffline(e: EventSubStreamOfflineEvent) {
        signale.debug('onStreamOffline', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.stop();
        this._streamStartTimer.stop();
        this.emit('offline', `${e.broadcasterDisplayName} went offline!`);
    }

    /**
     * handle Channel UpdateEvents
     */
    private onChannelUpdate(e: EventSubChannelUpdateEvent) {
        signale.debug('onChannelUpdate', JSON.stringify(getRawData(e), null, 4));
        this.sendDebugMessage(`${e.broadcasterDisplayName} changed title to <${e.streamTitle}> and category to <${e.categoryName}>`);
    }

    /**
     * set cool down stop watch
     */
    private setCoolDownEndDate(coolDownEndDate: Date) {
        this._currentCoolDown = coolDownEndDate.getTime();
        const timerLeft = Math.max(0, this._currentCoolDown - Date.now());
        // stop timer just to be sure
        this._currentCoolDownTimer.stop();
        // set timer
        this._currentCoolDownTimer.start(timerLeft);
        // inform channel about new cool down
        // R -> Relative (in 2 minutes)
        // t -> short time (2:19 AM)
        this.sendMessage(`:station: The hype train cool down ends <t:${this.timeInSeconds()}:R>.`);
    }

    private onCoolDownTimerDone() {
        this.emit('deleteCoolDown');
        this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
    }

    private onOnlineTimerDone() {
        if (this._streamStartTimer.status === 'stopped') {
            this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.twitch.tv/annabelstopit`, Rooms.SHOUTOUT);
            this._streamStartTimer.start(1_800_000);
        }
    }
}

