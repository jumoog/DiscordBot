import EventEmitter from 'events';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import Timer from 'tiny-timer';
import fs from 'node:fs';
import signale from "signale";
import { EventSubChannelHypeTrainBeginEvent, EventSubChannelHypeTrainEndEvent, EventSubChannelHypeTrainProgressEvent, EventSubStreamOnlineEvent, EventSubStreamOfflineEvent, EventSubChannelUpdateEvent, EventSubChannelHypeTrainContribution } from '@twurple/eventsub-base';
import { getRawData } from '@twurple/common';
import { Rooms } from './discord.js';

/**
 * Bot class
 */
export class Twitch extends EventEmitter {
    private readonly _userId: number | string;
    private readonly _clientId: string;
    private readonly _clientSecret: string;
    private _timerLeft: number;
    private _tokenPath: string;
    private _level: number;
    private _total: number;
    private readonly _currentCoolDownTimer: Timer;
    private _currentCoolDown: number;
    private readonly _onlineTimer: Timer;
    private readonly _streamStartTimer: Timer;

    constructor() {
        super();
        this._userId = process.env.USERID ?? 631529415;
        this._clientId = process.env.CLIENTID ?? '';
        this._clientSecret = process.env.CLIENTSECRET ?? '';
        this._timerLeft = 0;
        this._tokenPath = '';
        this._currentCoolDownTimer = new Timer();
        this._currentCoolDown = 0;
        this._level = 0;
        this._total = 0;
        this._onlineTimer = new Timer();
        this._streamStartTimer = new Timer();

        this._currentCoolDownTimer.on('done', this.handleCoolDownTimerDone.bind(this));
        this._onlineTimer.on('done', this.handleOnlineTimerDone.bind(this));
    }

    /**
     * start function
     */
    async main() {
        this._tokenPath = fs.existsSync('/tokens/') ? '/tokens/tokens.json' : './tokens.json'
        if (fs.existsSync(this._tokenPath)) {
            this.twurpleStart();
        } else {
            this.sendDebugMessage(`can't find twitch tokens!`);
        }
    }

    /***
     * internal start
     */
    private async twurpleStart() {
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
            authProviderHypeTrain.onRefresh((_userId: any, newTokenData: any) => fs.writeFileSync(this._tokenPath, JSON.stringify(newTokenData, null, 4), 'utf8'));
            authProviderHypeTrain.onRefreshFailure((_userId: any) => {
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
            const twitchListener = new EventSubWsListener({
                apiClient,
                logger: {
                    minLevel: 'trace',
                    custom: (level, message) => {
                        fs.writeFileSync(`/tokens/HEALTH`, message)
                    },
                },
            });

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

    /**
     * helper function to send normal text messages
     */
    private sendMessage(message: string, room = Rooms.HYPETRAIN) {
        this.emit('sendMessage', message, room);
    }

    /**
     * helper function to send debug text messages
     */
    private async sendDebugMessage(message: string) {
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
    private hypeTrainEndEventsHandler(e: EventSubChannelHypeTrainEndEvent) {
        signale.debug('hypeTrainEndEventsHandler', JSON.stringify(getRawData(e), null, 4));

        this.sendMessage(`:clap: **These are the top contributors to the hype train:**`);

        // Send message with all top contributions using handleLastContribution
        e.topContributors.forEach(contribution => {
            this.handleLastContribution(contribution);
        });

        // hype train ended
        this.sendMessage(`:checkered_flag: The hype train is over! We reached Level **${e.level}**!`);
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
    private hypeTrainBeginEventsHandler(e: EventSubChannelHypeTrainBeginEvent) {
        signale.debug('hypeTrainBeginEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._level = e.level;
        this.sendMessage(`:partying_face: A hype train has started at Level **${e.level}**!`);
    }

    /**
     * handle hype train ProgressEvents (fake and real)
     * @param e 
     */
    private hypeTrainProgressEvents(e: EventSubChannelHypeTrainProgressEvent) {
        if (this._total !== e.total) {
            this._total = e.total;
            // log JSON
            signale.debug('hypeTrainProgressEvents', JSON.stringify(getRawData(e), null, 4));

            // check if reached a new level
            if (this._level !== e.level) {
                this._level = e.level;
                this.sendMessage(`:trophy: The hype train reached Level **${e.level}**!`);
            }
            // handle last contribution
            this.handleLastContribution(e.lastContribution);

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

    /**
     * handle Stream OnlineEvents (fake and real)
     * @param e 
     */
    private StreamOnlineEventsHandler(e: EventSubStreamOnlineEvent) {
        signale.debug('StreamOnlineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.start(120_000);
        this.emit('online', `${e.broadcasterDisplayName} went online!`)
    }

    /**
     * handle Stream OfflineEvents (fake and real)
     * @param e 
     */
    private StreamOfflineEventsHandler(e: EventSubStreamOfflineEvent) {
        signale.debug('StreamOfflineEventsHandler', JSON.stringify(getRawData(e), null, 4));
        this._onlineTimer.stop();
        this.emit('offline', `${e.broadcasterDisplayName} went offline!`)
    }

    /**
     * handle Channel UpdateEvents
     */
    private ChannelUpdateEvents(e: EventSubChannelUpdateEvent) {
        signale.debug('ChannelUpdateEvents', JSON.stringify(getRawData(e), null, 4));
        this.sendDebugMessage(`${e.broadcasterDisplayName} changed title to <${e.streamTitle}> and category to <${e.categoryName}>`);
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
        this.sendMessage(`:station: The hype train cool down ends <t:${this.timeInSeconds()}:R>.`);
    }

    private handleCoolDownTimerDone() {
        this.emit('deleteCoolDown');
        this.sendMessage(`:index_pointing_at_the_viewer: The next hype train is ready!`);
    }

    private handleOnlineTimerDone() {
        if (this._streamStartTimer.status === 'stopped') {
            this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.twitch.tv/annabelstopit`, Rooms.SHOUTOUT);
            this._streamStartTimer.start(1_800_000);
        }
    }
}

