import EventEmitter from 'events';
import { InstagramMediaItem } from './Instagram.js';
export declare enum rooms {
    hypetrain = "HYPETRAIN",
    debug = "DEBUG",
    shoutout = "SHOUTOUT",
    socials = "SOCIALS"
}
export declare class DiscordBot extends EventEmitter {
    private _discordToken;
    private _lastCoolDownMessage;
    private _discordClient;
    private _rooms;
    constructor();
    main(): Promise<void>;
    private getChannel;
    sendMessage(message: string, room: rooms): Promise<void>;
    private messageQueue;
    deleteCoolDown(): void;
    sendIgPost(element: InstagramMediaItem): Promise<void>;
    private hasProp;
    extractMentions(text: string): string;
}
