import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent } from "./mockup.js";
export class Simulation {
    broadcaster_user_id;
    broadcaster_user_login;
    broadcaster_user_name;
    level;
    total;
    progress;
    goal;
    top_contributions;
    last_contribution;
    constructor(broadcaster_user_id, broadcaster_user_login, broadcaster_user_name) {
        this.broadcaster_user_id = broadcaster_user_id;
        this.broadcaster_user_login = broadcaster_user_login;
        this.broadcaster_user_name = broadcaster_user_name;
        this.level = 0;
        this.total = 0;
        this.progress = 0;
        this.goal = 0;
        this.top_contributions = [];
        this.last_contribution = null;
    }
    genFakeBeginEvent(level) {
        this.progress = 0;
        this.total = 0;
        this.level = level;
        this.top_contributions = [this.fakeLastContribution(), this.fakeLastContribution()];
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
    genFakeProgressEvent() {
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
    genFakeEndEvent(minutes = 60) {
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
            cooldown_ends_at: new Date(new Date().getTime() + (minutes * 60 * 1000)).toISOString()
        });
    }
    randomType() {
        const types = ["bits", "subscription"];
        const randomIndex = Math.floor(Math.random() * types.length);
        return types[randomIndex];
    }
    randomTotal(type) {
        if (type === "bits")
            return this.randomInteger(100, 1000);
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
    randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    fakeLastContribution() {
        const type = this.randomType();
        const total = this.randomTotal(type);
        this.total += total;
        this.level = Math.floor(this.total / 1000);
        const contribution = { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", type, total };
        return contribution;
    }
}
