import EventEmitter from 'events';
import signale from 'signale';
import fs from 'node:fs';
export class Instagram extends EventEmitter {
    _IgToken;
    _IgLastTimeStamp;
    _IgAccessToken;
    _IgCurrentUserId;
    _IgCurrentUserName;
    _IgTokenPath;
    _IgLastTimeStampPath;
    constructor() {
        super();
        this._IgTokenPath = fs.existsSync('/tokens/') ? '/tokens/ig_token.json' : './ig_token.json';
        this._IgLastTimeStampPath = fs.existsSync('/tokens/') ? '/tokens/lastTimeStamp.json' : './lastTimeStamp.json';
        this._IgToken = JSON.parse(fs.readFileSync(this._IgTokenPath, 'utf8'));
        this._IgLastTimeStamp = JSON.parse(fs.readFileSync(this._IgLastTimeStampPath, 'utf8')).timestamp;
        this._IgAccessToken = this._IgToken.accessToken;
        this._IgCurrentUserId = 0;
        this._IgCurrentUserName = "";
        this._IgCurrentUserName = "";
    }
    async main() {
        if (fs.existsSync(this._IgTokenPath) && fs.existsSync(this._IgLastTimeStampPath)) {
            signale.success(`found ig_token.json and lastTimeStamp.json!`);
            await this.checkIgToken();
            await this.getIgUseId();
            if (this._IgCurrentUserId !== 0) {
                this.checkForNewIgPosts();
            }
            else {
                signale.fatal(`user id is 0`);
                process.exit(1);
            }
        }
        else {
            signale.fatal(`can't find ig_token.json or lastTimeStamp.json!`);
        }
    }
    async checkForNewIgPosts() {
        const epoch = new Date(this._IgLastTimeStamp).valueOf() / 1000;
        await fetch(`https://graph.instagram.com/${this._IgCurrentUserId}/media/?fields=id,media_type,caption,media_url,thumbnail_url,timestamp,permalink&access_token=${this._IgAccessToken}&since=${epoch}`)
            .then(async (res) => {
            if (res.ok) {
                const json = await res.json();
                const data = json.data;
                if (data.length > 0) {
                    this._IgLastTimeStamp = data[0].timestamp;
                    fs.writeFileSync(this._IgLastTimeStampPath, JSON.stringify({ timestamp: this._IgLastTimeStamp }, null, 4));
                }
                for (let index = 0; index < data.length; index++) {
                    signale.debug(JSON.stringify(data[index], null, 4));
                    this.emit('post', data[index]);
                }
                this.debug(`done! <${data.length}> new Posts <${this._IgLastTimeStamp}>`);
            }
            else {
                signale.fatal(`status <${res.status}> statusText: <${res.statusText}>`);
            }
        })
            .catch((error) => signale.fatal(`checkForNewIgPosts: ${error}`));
        setTimeout(() => this.checkForNewIgPosts(), 30 * 1000);
    }
    async checkIgToken() {
        const now = Math.floor(Date.now() / 1000);
        let expiresIn = this._IgToken.expiresOn - now;
        const numDays = expiresIn / 60 / 60 / 24;
        if (numDays <= 2) {
            await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this._IgAccessToken}`)
                .then(async (res) => {
                if (res.ok) {
                    const json = await res.json();
                    const expiresOn = Math.floor(Date.now() / 1000) + json.expires_in - 60;
                    signale.info(`refresh token!`);
                    this._IgAccessToken = json.access_token;
                    this._IgToken = { accessToken: this._IgAccessToken, expiresOn, obtainmentTimestamp: now };
                    fs.writeFileSync(this._IgTokenPath, JSON.stringify(this._IgToken, null, 4));
                }
                else {
                    signale.fatal(`status <${res.status}> statusText: <${res.statusText}>`);
                }
            })
                .catch((error) => signale.fatal(`checkIgToken: ${error}`));
        }
        this.debug(`current token is still valid for <${this.formatTime(expiresIn)}>`);
        setTimeout(() => this.checkIgToken(), 30 * 60 * 1000);
    }
    async getIgUseId() {
        await fetch(`https://graph.instagram.com/me/?access_token=${this._IgAccessToken}&fields=username,account_type`)
            .then(async (res) => {
            if (res.ok) {
                const json = await res.json();
                this._IgCurrentUserId = json.id;
                this._IgCurrentUserName = json.username;
                signale.success(`Hello username <${this._IgCurrentUserName}> id <${this._IgCurrentUserId}>`);
            }
        })
            .catch((error) => signale.fatal(`getIgUseId: ${error}`));
    }
    formatTime(time) {
        let days = time / (24 * 60 * 60);
        let hours = (days % 1) * 24;
        let minutes = (hours % 1) * 60;
        let secs = (minutes % 1) * 60;
        [days, hours, minutes, secs] = [Math.floor(days), Math.floor(hours), Math.floor(minutes), Math.floor(secs)];
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }
    debug(message) {
        if (process.env.DEBUG)
            signale.debug(message);
    }
}
