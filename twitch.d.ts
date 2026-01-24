/// <reference types="node" />
import EventEmitter from 'events';
export declare class Twitch extends EventEmitter {
    private _userId;
    private _clientId;
    private _clientSecret;
    private _tokenPath;
    private _hypeTrainLevel;
    private _hypeTrainTotal;
    private _hypeTrainActive;
    private _currentCoolDownTimer;
    private _currentCoolDown;
    private _onlineTimer;
    private _streamStartTimer;
    constructor();
    private get broadcasterId();
    private resolveTokenPath;
    main(): Promise<void>;
    private twurpleStart;
    private sendMessage;
    private sendDebugMessage;
    private timeInSeconds;
    private onHypeTrainEnd;
    private onHypeTrainBegin;
    private onHypeTrainProgress;
    private handleLastContribution;
    private onChannelSubscription;
    private onChannelSubscriptionGift;
    private onChannelCheer;
    private onStreamOnline;
    private onStreamOffline;
    private onChannelUpdate;
    private setCoolDownEndDate;
    private onCoolDownTimerDone;
    private onOnlineTimerDone;
}
