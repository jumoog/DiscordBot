import EventEmitter from 'events';
export interface InstagramMediaItem {
    id: string;
    caption?: string;
    permalink: string;
    media_type: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO';
    media_url: string;
    thumbnail_url?: string;
    timestamp: string;
}
export interface InstagramToken {
    accessToken: string;
    expiresOn: number;
    obtainmentTimestamp: number;
}
export declare class Instagram extends EventEmitter {
    private _IgToken;
    private _IgLastTimeStamp;
    private _IgAccessToken;
    private _IgCurrentUserId;
    private _IgCurrentUserName;
    private _IgTokenPath;
    private _IgLastTimeStampPath;
    constructor();
    main(): Promise<void>;
    private checkForNewIgPosts;
    private checkIgToken;
    private getIgUseId;
    private formatTime;
    private debug;
}
