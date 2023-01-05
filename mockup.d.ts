declare type EventSubChannelHypeTrainContributionType = 'bits' | 'subscription' | 'other';
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
export declare class mockup_EventSubChannelHypeTrainEndEvent {
    data: EventSubChannelHypeTrainEndEventData;
    constructor(data: EventSubChannelHypeTrainEndEventData);
    get id(): string;
    get broadcasterId(): string;
    get broadcasterName(): string;
    get broadcasterDisplayName(): string;
    get level(): number;
    get total(): number;
    get topContributors(): EventSubChannelHypeTrainContribution[];
    get startDate(): Date;
    get endDate(): Date;
    get cooldownEndDate(): Date;
}
declare class EventSubChannelHypeTrainContribution {
    data: EventSubChannelHypeTrainContributionData;
    constructor(data: EventSubChannelHypeTrainContributionData);
    get userId(): string;
    get userName(): string;
    get userDisplayName(): string;
    get type(): EventSubChannelHypeTrainContributionType;
    get total(): number;
}
export declare class mockup_EventSubChannelHypeTrainBeginEvent {
    data: EventSubChannelHypeTrainBeginEventData;
    constructor(data: EventSubChannelHypeTrainBeginEventData);
    get id(): string;
    get broadcasterId(): string;
    get broadcasterName(): string;
    get broadcasterDisplayName(): string;
    get level(): number;
    get total(): number;
    get progress(): number;
    get goal(): number;
    get topContributors(): EventSubChannelHypeTrainContribution[];
    get lastContribution(): EventSubChannelHypeTrainContribution;
    get startDate(): Date;
    get expiryDate(): Date;
}
export declare class mockup_EventSubChannelHypeTrainProgressEvent {
    data: EventSubChannelHypeTrainProgressEventData;
    constructor(data: EventSubChannelHypeTrainProgressEventData);
    get id(): string;
    get broadcasterId(): string;
    get broadcasterName(): string;
    get broadcasterDisplayName(): string;
    get level(): number;
    get total(): number;
    get progress(): number;
    get goal(): number;
    get topContributors(): EventSubChannelHypeTrainContribution[];
    get lastContribution(): EventSubChannelHypeTrainContribution;
    get startDate(): Date;
    get expiryDate(): Date;
}
export declare function genFakeEndEvent(minutes?: number): mockup_EventSubChannelHypeTrainEndEvent;
export declare function genFakeBeginEvent(): mockup_EventSubChannelHypeTrainBeginEvent;
export declare function genFakeProgressEvent(): mockup_EventSubChannelHypeTrainProgressEvent;
export {};
