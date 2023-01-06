export class mockup_EventSubChannelHypeTrainEndEvent {
    data;
    constructor(data) {
        this.data = data;
    }
    get id() {
        return this.data.id;
    }
    get broadcasterId() {
        return this.data.broadcaster_user_id;
    }
    get broadcasterName() {
        return this.data.broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this.data.broadcaster_user_name;
    }
    get level() {
        return this.data.level;
    }
    get total() {
        return this.data.total;
    }
    get topContributors() {
        return (this.data.top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get startDate() {
        return new Date(this.data.started_at);
    }
    get endDate() {
        return new Date(this.data.ended_at);
    }
    get cooldownEndDate() {
        return new Date(this.data.cooldown_ends_at);
    }
}
class EventSubChannelHypeTrainContribution {
    data;
    constructor(data) {
        this.data = data;
    }
    get userId() {
        return this.data.user_id;
    }
    get userName() {
        return this.data.user_login;
    }
    get userDisplayName() {
        return this.data.user_name;
    }
    get type() {
        return this.data.type;
    }
    get total() {
        return this.data.total;
    }
}
export class mockup_EventSubChannelHypeTrainBeginEvent {
    data;
    constructor(data) {
        this.data = data;
    }
    get id() {
        return this.data.id;
    }
    get broadcasterId() {
        return this.data.broadcaster_user_id;
    }
    get broadcasterName() {
        return this.data.broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this.data.broadcaster_user_name;
    }
    get level() {
        return this.data.level;
    }
    get total() {
        return this.data.total;
    }
    get progress() {
        return this.data.progress;
    }
    get goal() {
        return this.data.goal;
    }
    get topContributors() {
        return (this.data.top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get lastContribution() {
        return new EventSubChannelHypeTrainContribution(this.data.last_contribution);
    }
    get startDate() {
        return new Date(this.data.started_at);
    }
    get expiryDate() {
        return new Date(this.data.expires_at);
    }
}
export class mockup_EventSubChannelHypeTrainProgressEvent {
    data;
    constructor(data) {
        this.data = data;
    }
    get id() {
        return this.data.id;
    }
    get broadcasterId() {
        return this.data.broadcaster_user_id;
    }
    get broadcasterName() {
        return this.data.broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this.data.broadcaster_user_name;
    }
    get level() {
        return this.data.level;
    }
    get total() {
        return this.data.total;
    }
    get progress() {
        return this.data.progress;
    }
    get goal() {
        return this.data.goal;
    }
    get topContributors() {
        return (this.data.top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get lastContribution() {
        return new EventSubChannelHypeTrainContribution(this.data.last_contribution);
    }
    get startDate() {
        return new Date(this.data.started_at);
    }
    get expiryDate() {
        return new Date(this.data.expires_at);
    }
}
export function genFakeEndEvent(minutes = 60, level = 2) {
    return new mockup_EventSubChannelHypeTrainEndEvent({
        id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
        broadcaster_user_id: "1337",
        broadcaster_user_login: "cool_user",
        broadcaster_user_name: "Cool_User",
        level,
        total: 137,
        top_contributions: [
            { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
            { "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
        ],
        started_at: new Date().toISOString(),
        ended_at: new Date(new Date().getTime() + (8 * 1000)).toISOString(),
        cooldown_ends_at: new Date(new Date().getTime() + (minutes * 60 * 1000)).toISOString()
    });
}
export function genFakeBeginEvent(level) {
    return new mockup_EventSubChannelHypeTrainBeginEvent({
        id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
        broadcaster_user_id: "1337",
        broadcaster_user_login: "cool_user",
        broadcaster_user_name: "Cool_User",
        total: 137,
        progress: 137,
        goal: 500,
        top_contributions: [
            { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
            { "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
        ],
        last_contribution: { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
        level,
        started_at: new Date().toISOString(),
        expires_at: new Date(new Date().getTime() + (8 * 1000)).toISOString()
    });
}
export function genFakeProgressEvent(level) {
    return new mockup_EventSubChannelHypeTrainProgressEvent({
        id: "1b0AsbInCHZW2SQFQkCzqN07Ib2",
        broadcaster_user_id: "1337",
        broadcaster_user_login: "cool_user",
        broadcaster_user_name: "Cool_User",
        level,
        total: 700,
        progress: 200,
        goal: 1000,
        top_contributions: [
            { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
            { "user_id": "456", "user_login": "kappa", "user_name": "Kappa", "type": "subscription", "total": 45 }
        ],
        last_contribution: { "user_id": "123", "user_login": "pogchamp", "user_name": "PogChamp", "type": "bits", "total": 50 },
        started_at: new Date().toISOString(),
        expires_at: new Date(new Date().getTime() + (8 * 1000)).toISOString()
    });
}
