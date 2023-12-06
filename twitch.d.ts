/// <reference types="node" />
import EventEmitter from 'events';
export declare class Twitch extends EventEmitter {
    private _userId;
    private _clientId;
    private _clientSecret;
    private _timerLeft;
    private _tokenPath;
    private _level;
    private _total;
    private _currentCoolDownTimer;
    private _currentCoolDown;
    private _onlineTimer;
    private _streamStartTimer;
    private _keepAlive;
    constructor();
    main(): Promise<void>;
    private twurpleStart;
    private sendMessage;
    private sendDebugMessage;
    private timeInSeconds;
    private hypeTrainEndEventsHandler;
    private hypeTrainBeginEventsHandler;
    private hypeTrainProgressEvents;
    private StreamOnlineEventsHandler;
    private StreamOfflineEventsHandler;
    private ChannelUpdateEvents;
    private setCoolDownEndDate;
}
