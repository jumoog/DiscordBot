import EventEmitter from 'events';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { rooms } from './discord.js';
import signale from 'signale';
export class TikTok extends EventEmitter {
    _isLive;
    constructor() {
        super();
        this._isLive = false;
    }
    async checkLive() {
        const tiktokLiveConnection = new WebcastPushConnection("@annabelstopit");
        const roomInfo = await tiktokLiveConnection.getRoomInfo().catch((e) => signale.error(e));
        if (roomInfo) {
            signale.log(`Status: ${roomInfo.status} Stream started timestamp: ${roomInfo.create_time}`);
            if (roomInfo.status == 2 && !this._isLive) {
                this.sendDebugMessage(`${roomInfo.display_id} went online on TikTok!`);
                this.sendMessage(`@everyone Λ N N Λ B E L is live now\nhttps://www.tiktok.com/@annabelstopit`, rooms.shoutout);
                this._isLive = true;
            }
            if (roomInfo.status == 4 && this._isLive) {
                this.sendDebugMessage(`${roomInfo.display_id} went offline on TikTok!`);
                this._isLive = false;
            }
        }
        else {
            this.sendDebugMessage("TikTok has a problem");
        }
        setTimeout(() => this.checkLive(), 5 * 60 * 1000);
    }
    sendMessage(message, room = rooms.hypetrain) {
        this.emit('sendMessage', message, room);
    }
    async sendDebugMessage(message) {
        this.sendMessage(message, rooms.debug);
    }
}
