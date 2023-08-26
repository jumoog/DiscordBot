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
    _IgLastIds;
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
        this._IgLastIds = [];
    }
    async main() {
        if (fs.existsSync(this._IgTokenPath) && fs.existsSync(this._IgLastTimeStampPath)) {
            signale.success(`found ig_token.json and lastTimeStamp.json!`);
            await this.checkIgToken();
            await this.getIgUseId();
            this.checkForNewIgPosts();
        }
        else {
            signale.fatal(`can't find ig_token.json or lastTimeStamp.json!`);
        }
    }
    async checkForNewIgPosts() {
        const epoch = new Date(this._IgLastTimeStamp).valueOf() / 1000;
        const res = await fetch(`https://graph.instagram.com/${this._IgCurrentUserId}/media/?fields=id,media_type,caption,media_url,thumbnail_url,timestamp,permalink&access_token=${this._IgAccessToken}&since=${epoch}`);
        const json = await res.json();
        const data = json.data;
        if (data.length > 0) {
            this._IgLastTimeStamp = data[0].timestamp;
            fs.writeFileSync(this._IgLastTimeStampPath, JSON.stringify({ timestamp: this._IgLastTimeStamp }, null, 4));
        }
        for (let index = 0; index < data.length; index++) {
            signale.debug(JSON.stringify(data[index], null, 4));
            if (!this._IgLastIds.includes(data[index].id)) {
                this._IgLastIds.push(data[index].id);
                this.emit('message', data[index]);
            }
        }
        signale.complete(`done! <${data.length}> new Posts <${this._IgLastTimeStamp}>`);
        setTimeout(() => this.checkForNewIgPosts(), 30 * 1000);
    }
    async checkIgToken() {
        const now = Math.floor(Date.now() / 1000);
        const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this._IgAccessToken}`);
        const json = await res.json();
        const numDays = Math.floor(json.expires_in / 60 / 60 / 24);
        if (numDays <= 2) {
            signale.info(`refresh token!`);
            this._IgAccessToken = json.access_token;
        }
        signale.info(`current token is still valid for <${this.formatTime(json.expires_in)}>`);
        const newFile = { accessToken: this._IgAccessToken, expiresIn: json.expires_in, obtainmentTimestamp: now };
        fs.writeFileSync(this._IgTokenPath, JSON.stringify(newFile, null, 4));
        setTimeout(() => this.checkIgToken(), 30 * 60 * 1000);
    }
    async getIgUseId() {
        const res = await fetch(`https://graph.instagram.com/me/?access_token=${this._IgAccessToken}&fields=username,account_type`);
        const json = await res.json();
        this._IgCurrentUserId = json.id;
        this._IgCurrentUserName = json.username;
        signale.success(`Hello username <${this._IgCurrentUserName}> id <${this._IgCurrentUserId}>`);
    }
    formatTime(time) {
        let days = time / (24 * 60 * 60);
        let hours = (days % 1) * 24;
        let minutes = (hours % 1) * 60;
        let secs = (minutes % 1) * 60;
        [days, hours, minutes, secs] = [Math.floor(days), Math.floor(hours), Math.floor(minutes), Math.floor(secs)];
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }
}
