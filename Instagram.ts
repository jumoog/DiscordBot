import EventEmitter from 'events';
import signale from 'signale';
import fs from 'node:fs';

export interface InstagramMediaItem {
	id: string
	caption?: string
	permalink: string
	media_type: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO'
	media_url: string
	thumbnail_url?: string
	timestamp: string
}

export interface InstagramToken {
	accessToken: string;
	expiresIn: number;
	obtainmentTimestamp: number;
}

export class Instagram extends EventEmitter {
	private _IgToken: InstagramToken;
	private _IgLastTimeStamp: string;
	private _IgAccessToken: string;
	private _IgCurrentUserId: number;
	private _IgCurrentUserName: string;
	private _IgTokenPath: string;
	private _IgLastTimeStampPath: string;
	constructor() {
		super()
		this._IgTokenPath = fs.existsSync('/tokens/') ? '/tokens/ig_token.json' : './ig_token.json'
		this._IgLastTimeStampPath = fs.existsSync('/tokens/') ? '/tokens/lastTimeStamp.json' : './lastTimeStamp.json'
		this._IgToken = JSON.parse(fs.readFileSync(this._IgTokenPath, 'utf8'));
		this._IgLastTimeStamp = JSON.parse(fs.readFileSync(this._IgLastTimeStampPath, 'utf8')).timestamp;
		this._IgAccessToken = this._IgToken.accessToken;
		this._IgCurrentUserId = 0;
		this._IgCurrentUserName = "";
		this._IgCurrentUserName = "";
	}

	/**
	 * start function
	 */
	async main() {
		if (fs.existsSync(this._IgTokenPath) && fs.existsSync(this._IgLastTimeStampPath)) {
			signale.success(`found ig_token.json and lastTimeStamp.json!`);
			await this.checkIgToken();
			await this.getIgUseId();
			this.checkForNewIgPosts();
		} else {
			signale.fatal(`can't find ig_token.json or lastTimeStamp.json!`);
		}
	}

	/**
	 * query IG for new post/reel
	 */
	private async checkForNewIgPosts() {
		// use the last post time stamp as parameter
		const epoch = new Date(this._IgLastTimeStamp).valueOf() / 1000;
		const res = await fetch(`https://graph.instagram.com/${this._IgCurrentUserId}/media/?fields=id,media_type,caption,media_url,thumbnail_url,timestamp,permalink&access_token=${this._IgAccessToken}&since=${epoch}`);
		const json = await res.json();
		// extract data
		const data: InstagramMediaItem[] = json.data;
		for (let index = 0; index < data.length; index++) {
			this.emit('message', data[index]);
		}
		// set last timestamp
		if (data.length > 0) {
			this._IgLastTimeStamp = data[0].timestamp;
			fs.writeFileSync(this._IgLastTimeStampPath, JSON.stringify({ timestamp: this._IgLastTimeStamp }, null, 4));
		}
		signale.complete(this._IgLastTimeStamp, 'done');
		// retrigger every 30 seconds
		setTimeout(() => this.checkForNewIgPosts(), 30 * 1000);
	}

	/**
	 * validate token and refresh if needed
	 */
	private async checkIgToken() {
		const now = Math.floor(Date.now() / 1000);
		const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this._IgAccessToken}`);
		const json = await res.json();
		let numDays = Math.floor(json.expires_in / 60 / 60 / 24);
		if (numDays <= 2) {
			signale.info(`refresh token!`)
			this._IgAccessToken = json.access_token;
		}
		signale.info(`current token is still valid for <${numDays}> days`)
		const newFile: InstagramToken = { accessToken: this._IgAccessToken, expiresIn: json.expires_in, obtainmentTimestamp: now }
		fs.writeFileSync(this._IgTokenPath, JSON.stringify(newFile, null, 4));
		// check every 30 minutes
		setTimeout(() => this.checkIgToken(), 30 * 60 * 1000);
	}

	/**
	 * query Instagram for the User Id
	 */
	private async getIgUseId() {
		const res = await fetch(`https://graph.instagram.com/me/?access_token=${this._IgAccessToken}&fields=username,account_type`);
		const json = await res.json();
		this._IgCurrentUserId = json.id;
		this._IgCurrentUserName = json.username;
		signale.success(`Hello username <${this._IgCurrentUserName}> id <${this._IgCurrentUserId }>`);
	}
}
