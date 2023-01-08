import { DataObject, rawDataSymbol } from "@twurple/common";

export type EventSubChannelHypeTrainContributionType = 'bits' | 'subscription' | 'other';

interface EventSubChannelHypeTrainEndEventData {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    level: number;
    total: number;
    top_contributions: EventSubChannelHypeTrainContributionData[] | null;
    started_at: string;
    ended_at: string;
    cooldown_ends_at: string;
}

export interface EventSubChannelHypeTrainContributionData {
    user_id: string;
    user_login: string;
    user_name: string;
    type: EventSubChannelHypeTrainContributionType;
    total: number;
}

interface EventSubChannelHypeTrainBeginEventData {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    level: number;
    total: number;
    progress: number;
    goal: number;
    top_contributions: EventSubChannelHypeTrainContributionData[] | null;
    last_contribution: EventSubChannelHypeTrainContributionData;
    started_at: string;
    expires_at: string;
}

interface EventSubChannelHypeTrainProgressEventData {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    level: number;
    total: number;
    progress: number;
    goal: number;
    top_contributions: EventSubChannelHypeTrainContributionData[] | null;
    last_contribution: EventSubChannelHypeTrainContributionData;
    started_at: string;
    expires_at: string;
}

export class mockup_EventSubChannelHypeTrainEndEvent extends DataObject<EventSubChannelHypeTrainEndEventData> {

    /** @private */
    constructor(data: EventSubChannelHypeTrainEndEventData) {
        super(data);
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this[rawDataSymbol].id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this[rawDataSymbol].broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this[rawDataSymbol].broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this[rawDataSymbol].broadcaster_user_name;
    }

    /**
     * The level the Hype Train ended on.
     */
    get level(): number {
        return this[rawDataSymbol].level;
    }

    /**
     * The total points contributed to the Hype Train.
     */
    get total(): number {
        return this[rawDataSymbol].total;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this[rawDataSymbol].top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this[rawDataSymbol].started_at);
    }

    /**
     * The time when the Hype Train ended.
     */
    get endDate(): Date {
        return new Date(this[rawDataSymbol].ended_at);
    }

    /**
     * The time when the Hype Train cooldown ends.
     */
    get cooldownEndDate(): Date {
        return new Date(this[rawDataSymbol].cooldown_ends_at);
    }
}

class EventSubChannelHypeTrainContribution extends DataObject<EventSubChannelHypeTrainContributionData> {

    /** @private */
    constructor(data: EventSubChannelHypeTrainContributionData) {
        super(data);
    }

    /**
     * The contributor's ID.
     */
    get userId(): string {
        return this[rawDataSymbol].user_id;
    }

    /**
     * The contributor's user name.
     */
    get userName(): string {
        return this[rawDataSymbol].user_login;
    }

    /**
     * The contributor's display name.
     */
    get userDisplayName(): string {
        return this[rawDataSymbol].user_name;
    }

    /**
     * The type of the contribution.
     */
    get type(): EventSubChannelHypeTrainContributionType {
        return this[rawDataSymbol].type;
    }

    /**
     * The contributor's total contribution.
     */
    get total(): number {
        return this[rawDataSymbol].total;
    }
}
export class mockup_EventSubChannelHypeTrainBeginEvent extends DataObject<EventSubChannelHypeTrainBeginEventData> {
    /** @private */
    constructor(data: EventSubChannelHypeTrainBeginEventData) {
        super(data);
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this[rawDataSymbol].id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this[rawDataSymbol].broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this[rawDataSymbol].broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this[rawDataSymbol].broadcaster_user_name;
    }

    /**
     * The level the Hype Train started on.
     */
    get level(): number {
        return this[rawDataSymbol].level;
    }

    /**
     * The total points already contributed to the Hype Train.
     */
    get total(): number {
        return this[rawDataSymbol].total;
    }

    /**
     * The number of points contributed to the Hype Train at the current level.
     */
    get progress(): number {
        return this[rawDataSymbol].progress;
    }

    /**
     * The number of points required to reach the next level.
     */
    get goal(): number {
        return this[rawDataSymbol].goal;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this[rawDataSymbol].top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The most recent contribution.
     */
    get lastContribution(): EventSubChannelHypeTrainContribution {
        return new EventSubChannelHypeTrainContribution(this[rawDataSymbol].last_contribution);
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this[rawDataSymbol].started_at);
    }

    /**
     * The time when the Hype Train is expected to expire, unless a change of level occurs to extend the expiration.
     */
    get expiryDate(): Date {
        return new Date(this[rawDataSymbol].expires_at);
    }
}
export class mockup_EventSubChannelHypeTrainProgressEvent extends DataObject<EventSubChannelHypeTrainProgressEventData> {

    /** @private */
    constructor(data: EventSubChannelHypeTrainProgressEventData) {
        super(data);
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this[rawDataSymbol].id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this[rawDataSymbol].broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this[rawDataSymbol].broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this[rawDataSymbol].broadcaster_user_name;
    }

    /**
     * The current level of the Hype Train.
     */
    get level(): number {
        return this[rawDataSymbol].level;
    }

    /**
     * The total points contributed to the Hype Train.
     */
    get total(): number {
        return this[rawDataSymbol].total;
    }

    /**
     * The number of points contributed to the Hype Train at the current level.
     */
    get progress(): number {
        return this[rawDataSymbol].progress;
    }

    /**
     * The number of points required to reach the next level.
     */
    get goal(): number {
        return this[rawDataSymbol].goal;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this[rawDataSymbol].top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The most recent contribution.
     */
    get lastContribution(): EventSubChannelHypeTrainContribution {
        return new EventSubChannelHypeTrainContribution(this[rawDataSymbol].last_contribution);
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this[rawDataSymbol].started_at);
    }

    /**
     * The time when the Hype Train is expected to end, unless extended by reaching the goal.
     */
    get expiryDate(): Date {
        return new Date(this[rawDataSymbol].expires_at);
    }
}

export class mockup_EventSubStreamOnlineEvent extends DataObject<EventSubStreamOnlineEventData> {
	/** @private */
	constructor(data: EventSubStreamOnlineEventData) {
		super(data);
	}

	/**
	 * The ID of the broadcaster.
	 */
	get broadcasterId(): string {
		return this[rawDataSymbol].broadcaster_user_id;
	}

	/**
	 * The name of the broadcaster.
	 */
	get broadcasterName(): string {
		return this[rawDataSymbol].broadcaster_user_login;
	}

	/**
	 * The display name of the broadcaster.
	 */
	get broadcasterDisplayName(): string {
		return this[rawDataSymbol].broadcaster_user_name;
	}


	/**
	 * The ID of the stream going live.
	 */
	get id(): string {
		return this[rawDataSymbol].id;
	}

	/**
	 * The type of the stream going live.
	 */
	get type(): EventSubStreamOnlineEventStreamType {
		return this[rawDataSymbol].type;
	}

	/**
	 * The date and time when the stream was started.
	 */
	get startDate(): Date {
		return new Date(this[rawDataSymbol].started_at);
	}
}

type EventSubStreamOnlineEventStreamType = 'live' | 'playlist' | 'watch_party' | 'premiere' | 'rerun';

/** @private */
interface EventSubStreamOnlineEventData {
	id: string;
	broadcaster_user_id: string;
	broadcaster_user_login: string;
	broadcaster_user_name: string;
	type: EventSubStreamOnlineEventStreamType;
	started_at: string;
}

export class mockup_EventSubStreamOfflineEvent extends DataObject<EventSubStreamOfflineEventData> {
	/** @private */
	constructor(data: EventSubStreamOfflineEventData) {
		super(data);
	}

	/**
	 * The ID of the broadcaster.
	 */
	get broadcasterId(): string {
		return this[rawDataSymbol].broadcaster_user_id;
	}

	/**
	 * The name of the broadcaster.
	 */
	get broadcasterName(): string {
		return this[rawDataSymbol].broadcaster_user_login;
	}

	/**
	 * The display name of the broadcaster.
	 */
	get broadcasterDisplayName(): string {
		return this[rawDataSymbol].broadcaster_user_name;
	}
}

interface EventSubStreamOfflineEventData {
	broadcaster_user_id: string;
	broadcaster_user_login: string;
	broadcaster_user_name: string;
}