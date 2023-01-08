import { DataObject, rawDataSymbol } from "@twurple/common";
export class mockup_EventSubChannelHypeTrainEndEvent extends DataObject {
    constructor(data) {
        super(data);
    }
    get id() {
        return this[rawDataSymbol].id;
    }
    get broadcasterId() {
        return this[rawDataSymbol].broadcaster_user_id;
    }
    get broadcasterName() {
        return this[rawDataSymbol].broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this[rawDataSymbol].broadcaster_user_name;
    }
    get level() {
        return this[rawDataSymbol].level;
    }
    get total() {
        return this[rawDataSymbol].total;
    }
    get topContributors() {
        return (this[rawDataSymbol].top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get startDate() {
        return new Date(this[rawDataSymbol].started_at);
    }
    get endDate() {
        return new Date(this[rawDataSymbol].ended_at);
    }
    get cooldownEndDate() {
        return new Date(this[rawDataSymbol].cooldown_ends_at);
    }
}
class EventSubChannelHypeTrainContribution extends DataObject {
    constructor(data) {
        super(data);
    }
    get userId() {
        return this[rawDataSymbol].user_id;
    }
    get userName() {
        return this[rawDataSymbol].user_login;
    }
    get userDisplayName() {
        return this[rawDataSymbol].user_name;
    }
    get type() {
        return this[rawDataSymbol].type;
    }
    get total() {
        return this[rawDataSymbol].total;
    }
}
export class mockup_EventSubChannelHypeTrainBeginEvent extends DataObject {
    constructor(data) {
        super(data);
    }
    get id() {
        return this[rawDataSymbol].id;
    }
    get broadcasterId() {
        return this[rawDataSymbol].broadcaster_user_id;
    }
    get broadcasterName() {
        return this[rawDataSymbol].broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this[rawDataSymbol].broadcaster_user_name;
    }
    get level() {
        return this[rawDataSymbol].level;
    }
    get total() {
        return this[rawDataSymbol].total;
    }
    get progress() {
        return this[rawDataSymbol].progress;
    }
    get goal() {
        return this[rawDataSymbol].goal;
    }
    get topContributors() {
        return (this[rawDataSymbol].top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get lastContribution() {
        return new EventSubChannelHypeTrainContribution(this[rawDataSymbol].last_contribution);
    }
    get startDate() {
        return new Date(this[rawDataSymbol].started_at);
    }
    get expiryDate() {
        return new Date(this[rawDataSymbol].expires_at);
    }
}
export class mockup_EventSubChannelHypeTrainProgressEvent extends DataObject {
    constructor(data) {
        super(data);
    }
    get id() {
        return this[rawDataSymbol].id;
    }
    get broadcasterId() {
        return this[rawDataSymbol].broadcaster_user_id;
    }
    get broadcasterName() {
        return this[rawDataSymbol].broadcaster_user_login;
    }
    get broadcasterDisplayName() {
        return this[rawDataSymbol].broadcaster_user_name;
    }
    get level() {
        return this[rawDataSymbol].level;
    }
    get total() {
        return this[rawDataSymbol].total;
    }
    get progress() {
        return this[rawDataSymbol].progress;
    }
    get goal() {
        return this[rawDataSymbol].goal;
    }
    get topContributors() {
        return (this[rawDataSymbol].top_contributions?.map(data => new EventSubChannelHypeTrainContribution(data)) ?? []);
    }
    get lastContribution() {
        return new EventSubChannelHypeTrainContribution(this[rawDataSymbol].last_contribution);
    }
    get startDate() {
        return new Date(this[rawDataSymbol].started_at);
    }
    get expiryDate() {
        return new Date(this[rawDataSymbol].expires_at);
    }
}
