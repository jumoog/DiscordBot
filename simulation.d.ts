import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent, EventSubChannelHypeTrainContributionData, EventSubChannelHypeTrainContributionType } from "./mockup.js";
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
    genFakeProgressEvent(): mockup_EventSubChannelHypeTrainProgressEvent;
    genFakeEndEvent(minutes?: number): mockup_EventSubChannelHypeTrainEndEvent;
    randomType(): EventSubChannelHypeTrainContributionType;
    randomTotal(type: EventSubChannelHypeTrainContributionType): number;
    randomInteger(min: number, max: number): number;
    fakeLastContribution(): EventSubChannelHypeTrainContributionData;
    levelCalculator(): void;
}
