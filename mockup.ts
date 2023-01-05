type EventSubChannelHypeTrainContributionType = 'bits' | 'subscription' | 'other';

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

interface EventSubChannelHypeTrainContributionData {
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

export class mockup_EventSubChannelHypeTrainEndEvent {

    /** @private */
    data: EventSubChannelHypeTrainEndEventData;
    constructor(data: EventSubChannelHypeTrainEndEventData) {
        this.data = data;
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this.data.id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this.data.broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this.data.broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this.data.broadcaster_user_name;
    }

    /**
     * The level the Hype Train ended on.
     */
    get level(): number {
        return this.data.level;
    }

    /**
     * The total points contributed to the Hype Train.
     */
    get total(): number {
        return this.data.total;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this.data.top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this.data.started_at);
    }

    /**
     * The time when the Hype Train ended.
     */
    get endDate(): Date {
        return new Date(this.data.ended_at);
    }

    /**
     * The time when the Hype Train cooldown ends.
     */
    get cooldownEndDate(): Date {
        return new Date(this.data.cooldown_ends_at);
    }
}

class EventSubChannelHypeTrainContribution {

    /** @private */
    data: EventSubChannelHypeTrainContributionData;
    constructor(data: EventSubChannelHypeTrainContributionData) {
        this.data = data;
    }

    /**
     * The contributor's ID.
     */
    get userId(): string {
        return this.data.user_id;
    }

    /**
     * The contributor's user name.
     */
    get userName(): string {
        return this.data.user_login;
    }

    /**
     * The contributor's display name.
     */
    get userDisplayName(): string {
        return this.data.user_name;
    }

    /**
     * The type of the contribution.
     */
    get type(): EventSubChannelHypeTrainContributionType {
        return this.data.type;
    }

    /**
     * The contributor's total contribution.
     */
    get total(): number {
        return this.data.total;
    }
}
export class mockup_EventSubChannelHypeTrainBeginEvent {
    /** @private */
    data: EventSubChannelHypeTrainBeginEventData
    constructor(data: EventSubChannelHypeTrainBeginEventData) {
        this.data = data;
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this.data.id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this.data.broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this.data.broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this.data.broadcaster_user_name;
    }

    /**
     * The level the Hype Train started on.
     */
    get level(): number {
        return this.data.level;
    }

    /**
     * The total points already contributed to the Hype Train.
     */
    get total(): number {
        return this.data.total;
    }

    /**
     * The number of points contributed to the Hype Train at the current level.
     */
    get progress(): number {
        return this.data.progress;
    }

    /**
     * The number of points required to reach the next level.
     */
    get goal(): number {
        return this.data.goal;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this.data.top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The most recent contribution.
     */
    get lastContribution(): EventSubChannelHypeTrainContribution {
        return new EventSubChannelHypeTrainContribution(this.data.last_contribution);
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this.data.started_at);
    }

    /**
     * The time when the Hype Train is expected to expire, unless a change of level occurs to extend the expiration.
     */
    get expiryDate(): Date {
        return new Date(this.data.expires_at);
    }
}
export class mockup_EventSubChannelHypeTrainProgressEvent {

    /** @private */
    data: EventSubChannelHypeTrainProgressEventData
    constructor(data: EventSubChannelHypeTrainProgressEventData) {
        this.data = data;
    }

    /**
     * The ID of the Hype Train.
     */
    get id(): string {
        return this.data.id;
    }

    /**
     * The ID of the broadcaster.
     */
    get broadcasterId(): string {
        return this.data.broadcaster_user_id;
    }

    /**
     * The name of the broadcaster.
     */
    get broadcasterName(): string {
        return this.data.broadcaster_user_login;
    }

    /**
     * The display name of the broadcaster.
     */
    get broadcasterDisplayName(): string {
        return this.data.broadcaster_user_name;
    }

    /**
     * The current level of the Hype Train.
     */
    get level(): number {
        return this.data.level;
    }

    /**
     * The total points contributed to the Hype Train.
     */
    get total(): number {
        return this.data.total;
    }

    /**
     * The number of points contributed to the Hype Train at the current level.
     */
    get progress(): number {
        return this.data.progress;
    }

    /**
     * The number of points required to reach the next level.
     */
    get goal(): number {
        return this.data.goal;
    }

    /**
     * The contributors with the most points, for both bits and subscriptions.
     */
    get topContributors(): EventSubChannelHypeTrainContribution[] {
        return (
            this.data.top_contributions?.map(
                data => new EventSubChannelHypeTrainContribution(data)
            ) ?? []
        );
    }

    /**
     * The most recent contribution.
     */
    get lastContribution(): EventSubChannelHypeTrainContribution {
        return new EventSubChannelHypeTrainContribution(this.data.last_contribution);
    }

    /**
     * The time when the Hype Train started.
     */
    get startDate(): Date {
        return new Date(this.data.started_at);
    }

    /**
     * The time when the Hype Train is expected to end, unless extended by reaching the goal.
     */
    get expiryDate(): Date {
        return new Date(this.data.expires_at);
    }
}