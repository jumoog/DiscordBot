import EventEmitter from 'events';
import signale from 'signale';
import fs from 'node:fs';

type Me = {
    username: string;
    account_type: string;
    id: string;
}

type RefreshAccessToken = {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface InstagramMediaItemData {
    data: InstagramMediaItem[]
}

export interface InstagramMediaItem {
    id: string;
    caption?: string;
    permalink: string;
    media_type: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO';
    media_url: string;
    thumbnail_url?: string;
    timestamp: string;
}

interface InstagramToken {
    accessToken: string;
    expiresOn: number;
    obtainmentTimestamp: number;
}

export class Instagram extends EventEmitter {
    private readonly _IgTokenPath: string;
    private readonly _IgLastTimeStampPath: string;
    private _IgToken: InstagramToken;
    private _IgLastTimeStamp: string;
    private _IgAccessToken: string;
    private _IgCurrentUserId: string = "";
    private _IgCurrentUserName: string = "";

    constructor() {
        super();
        const tokenDir = fs.existsSync('/tokens/') ? '/tokens/' : './';
        this._IgTokenPath = `${tokenDir}ig_token.json`;
        this._IgLastTimeStampPath = `${tokenDir}lastTimeStamp.json`;
        this._IgToken = JSON.parse(fs.readFileSync(this._IgTokenPath, 'utf8'));
        this._IgLastTimeStamp = JSON.parse(fs.readFileSync(this._IgLastTimeStampPath, 'utf8')).timestamp;
        this._IgAccessToken = this._IgToken.accessToken;
    }

    async main() {
        if (fs.existsSync(this._IgTokenPath) && fs.existsSync(this._IgLastTimeStampPath)) {
            signale.success(`found ig_token.json and lastTimeStamp.json!`);
            await this.checkIgToken();
            await this.getIgUseId();
            if (this._IgCurrentUserId) {
                this.checkForNewIgPosts();
            } else {
                signale.fatal(`user id is empty`);
                process.exit(1);
            }
        } else {
            signale.fatal(`can't find ig_token.json or lastTimeStamp.json!`);
        }
    }

    private async checkForNewIgPosts() {
        const epoch = new Date(this._IgLastTimeStamp).valueOf() / 1000;
        try {
            const res = await fetch(`https://graph.instagram.com/${this._IgCurrentUserId}/media/?fields=id,media_type,caption,media_url,thumbnail_url,timestamp,permalink&access_token=${this._IgAccessToken}&since=${epoch}`);
            if (res.ok) {
                const json = await res.json() as InstagramMediaItemData;
                const { data } = json;
                if (data.length > 0) {
                    this._IgLastTimeStamp = data[0].timestamp;
                    fs.writeFileSync(this._IgLastTimeStampPath, JSON.stringify({ timestamp: this._IgLastTimeStamp }, null, 4));
                }
                data.forEach(post => {
                    signale.debug(JSON.stringify(post, null, 4));
                    this.emit('post', post);
                });
                this.debug(`done! <${data.length}> new Posts <${this._IgLastTimeStamp}>`);
            } else {
                signale.fatal(`status <${res.status}> statusText: <${res.statusText}>`);
            }
        } catch (error) {
            signale.fatal(`checkForNewIgPosts: ${error}`);
        }

        setTimeout(() => this.checkForNewIgPosts(), 30 * 1000);
    }

    private async checkIgToken() {
        const now = Math.floor(Date.now() / 1000);
        let expiresIn = this._IgToken.expiresOn - now;
        const numDays = expiresIn / 60 / 60 / 24;
        if (numDays <= 2) {
            try {
                const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this._IgAccessToken}`);
                if (res.ok) {
                    const json = await res.json() as RefreshAccessToken;
                    const expiresOn = Math.floor(Date.now() / 1000) + json.expires_in - 60;
                    signale.info(`refresh token!`);
                    this._IgAccessToken = json.access_token;
                    this._IgToken = { accessToken: this._IgAccessToken, expiresOn, obtainmentTimestamp: now };
                    fs.writeFileSync(this._IgTokenPath, JSON.stringify(this._IgToken, null, 4));
                } else {
                    signale.fatal(`status <${res.status}> statusText: <${res.statusText}>`);
                }
            } catch (error) {
                signale.fatal(`checkIgToken: ${error}`);
            }
        }
        this.debug(`current token is still valid for <${this.formatTime(expiresIn)}>`);

        setTimeout(() => this.checkIgToken(), 30 * 60 * 1000);
    }

    private async getIgUseId() {
        try {
            const res = await fetch(`https://graph.instagram.com/me/?access_token=${this._IgAccessToken}&fields=username,account_type`);
            if (res.ok) {
                const json = await res.json() as Me;
                this._IgCurrentUserId = json.id;
                this._IgCurrentUserName = json.username;
                signale.success(`Hello username <${this._IgCurrentUserName}> id <${this._IgCurrentUserId}>`);
            }
        } catch (error) {
            signale.fatal(`getIgUseId: ${error}`);
        }
    }

    private formatTime(time: number) {
        const days = Math.floor(time / (24 * 60 * 60));
        const hours = Math.floor((time % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((time % (60 * 60)) / 60);
        const secs = Math.floor(time % 60);
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }

    private debug(message: string) {
        if (process.env.DEBUG) signale.debug(message);
    }
}
