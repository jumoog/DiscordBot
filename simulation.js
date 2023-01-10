import { mockup_EventSubChannelHypeTrainEndEvent, mockup_EventSubChannelHypeTrainBeginEvent, mockup_EventSubChannelHypeTrainProgressEvent, mockup_EventSubStreamOnlineEvent, mockup_EventSubStreamOfflineEvent } from "./mockup.js";
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
    genFakeProgressEvent(double = false) {
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
            last_contribution: (double ? this.last_contribution : this.fakeLastContribution()),
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
            const tier = 1;
            return tier * this.randomInteger(1, 20) * 500;
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
        this.levelCalculator();
        const contribution = { "user_id": "31378319", "user_login": "kilian_de", "user_name": "kilian_de", type, total };
        return contribution;
    }
    levelCalculator() {
        const points = [1600, 3400, 5500, 7800, 10800, 14500, 19200, 25100, 32300, 41100, 51700, 64300, 79000, 96100, 115800, 138200, 163600, 192200, 224200];
        for (let index = 0; index < points.length; index++) {
            const element = points[index];
            if (element > this.total) {
                this.level = index;
                break;
            }
        }
    }
    fakeOnline() {
        return new mockup_EventSubStreamOnlineEvent({
            "id": "9001",
            "broadcaster_user_id": this.broadcaster_user_id,
            "broadcaster_user_login": this.broadcaster_user_login,
            "broadcaster_user_name": this.broadcaster_user_name,
            "type": "live",
            "started_at": new Date().toISOString()
        });
    }
    fakeOffline() {
        return new mockup_EventSubStreamOfflineEvent({
            "broadcaster_user_id": this.broadcaster_user_id,
            "broadcaster_user_login": this.broadcaster_user_login,
            "broadcaster_user_name": this.broadcaster_user_name
        });
    }
}
