import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent, EventSubChannelHypeTrainContributionData, EventSubChannelHypeTrainContributionType, mockup_EventSubStreamOnlineEvent, mockup_EventSubStreamOfflineEvent } from "./mockup.js";
export declare class Simulation {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    level: number;
    total: number;
    progress: number;
    goal: number;
    top_contributions: EventSubChannelHypeTrainContributionData[] | null;
    last_contribution: EventSubChannelHypeTrainContributionData | null;
    constructor(broadcaster_user_id: string, broadcaster_user_login: string, broadcaster_user_name: string);
    genFakeBeginEvent(level: number): mockup_EventSubChannelHypeTrainBeginEvent;
    genFakeProgressEvent(double?: boolean): mockup_EventSubChannelHypeTrainProgressEvent;
    genFakeEndEvent(minutes?: number): mockup_EventSubChannelHypeTrainEndEvent;
    randomType(): EventSubChannelHypeTrainContributionType;
    randomTotal(type: EventSubChannelHypeTrainContributionType): number;
    randomInteger(min: number, max: number): number;
    fakeLastContribution(): EventSubChannelHypeTrainContributionData;
    levelCalculator(): void;
    fakeOnline(): mockup_EventSubStreamOnlineEvent;
    fakeOffline(): mockup_EventSubStreamOfflineEvent;
}
