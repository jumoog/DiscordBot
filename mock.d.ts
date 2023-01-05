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
export declare class Mock_EventSubChannelHypeTrainEndEvent {
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
export {};
