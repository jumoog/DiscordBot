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
