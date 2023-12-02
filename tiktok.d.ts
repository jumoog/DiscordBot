/// <reference types="node" />
import EventEmitter from 'events';
export declare class TikTok extends EventEmitter {
    private _isLive;
    constructor();
    checkLive(): Promise<void>;
    private sendMessage;
    private sendDebugMessage;
}
