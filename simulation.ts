import { time } from "node:console";
import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent, EventSubChannelHypeTrainContributionData, EventSubChannelHypeTrainContributionType } from "./mockup.js";

export class Simulation {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    level: number
    total: number
    progress: number
    goal: number
    top_contributions: EventSubChannelHypeTrainContributionData[] | null;
    last_contribution: EventSubChannelHypeTrainContributionData | null;
    constructor(broadcaster_user_id: string, broadcaster_user_login: string, broadcaster_user_name: string) {
        this.broadcaster_user_id = broadcaster_user_id
        this.broadcaster_user_login = broadcaster_user_login
        this.broadcaster_user_name = broadcaster_user_name
        this.level = 0
        this.total = 0
        this.progress = 0
        this.goal = 0
        this.top_contributions = []
        this.last_contribution = null
    }

    genFakeBeginEvent(level: number): mockup_EventSubChannelHypeTrainBeginEvent {
        this.progress = 0;
        this.total = 0;
        this.level = level;
        this.top_contributions = [this.fakeLastContribution(), this.fakeLastContribution()]
        return new mockup_EventSubChannelHypeTrainBeginEvent({
            id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
            broadcaster_user_id: this.broadcaster_user_id,
            broadcaster_user_login: this.broadcaster_user_login,
            broadcaster_user_name: this.broadcaster_user_name,
            total: this.total,
            progress: this.progress,
            goal: this.goal,
            top_contributions: this.top_contributions,
            last_contribution: this.fakeLastContribution(),
            level: this.level,
            started_at: new Date().toISOString(),
            expires_at: new Date(new Date().getTime() + (8 * 1000)).toISOString()
        });
    }

    genFakeProgressEvent(): mockup_EventSubChannelHypeTrainProgressEvent {
        return new mockup_EventSubChannelHypeTrainProgressEvent({
            id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
            broadcaster_user_id: this.broadcaster_user_id,
            broadcaster_user_login: this.broadcaster_user_login,
            broadcaster_user_name: this.broadcaster_user_name,
            level: this.level,
            total: this.total,
            progress: this.progress,
            goal: this.goal,
            top_contributions: this.top_contributions,
            last_contribution: this.fakeLastContribution(),
            started_at: new Date().toISOString(),
            expires_at: new Date(new Date().getTime() + (8 * 1000)).toISOString()
        });
    }

    genFakeEndEvent(minutes: number = 60): mockup_EventSubChannelHypeTrainEndEvent {
        return new mockup_EventSubChannelHypeTrainEndEvent({
            id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
            broadcaster_user_id: this.broadcaster_user_id,
            broadcaster_user_login: this.broadcaster_user_login,
            broadcaster_user_name: this.broadcaster_user_name,
            level: this.level,
            total: this.total,
            top_contributions: this.top_contributions,
            started_at: new Date().toISOString(),
            ended_at: new Date(new Date().getTime() + (8 * 1000)).toISOString(),
            // now + 60
            cooldown_ends_at: new Date(new Date().getTime() + (minutes * 60 * 1000)).toISOString()
        });
    }

    randomType(): EventSubChannelHypeTrainContributionType {
        const types: EventSubChannelHypeTrainContributionType[] = ["bits", "subscription"];
        const randomIndex = Math.floor(Math.random() * types.length);
        return types[randomIndex];
    }

    randomTotal(type: EventSubChannelHypeTrainContributionType) {
        // If type is subscription, total is 500, 1000, or 2500 to represent tier 1, 2, or 3 subscriptions, respectively.
        if (type === "bits")
            // 100 till 10_000
            return this.randomInteger(100, 1_000)
        if (type === "subscription") {
            const tier = this.randomInteger(1, 3);
            const amount = this.randomInteger(1, 20);
            if (tier === 1) {
                return amount * 500;
            }
            if (tier === 2) {
                return amount * 1000;
            }
            if (tier === 2) {
                return amount * 2500;
            }
        }
        return 0;
    }

    randomInteger(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    fakeLastContribution() {
        const type = this.randomType();
        const total = this.randomTotal(type);
        this.total += total;
        this.level = Math.floor(this.total / 1000);
        const contribution: EventSubChannelHypeTrainContributionData = { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", type, total };
        return contribution
    }
}
