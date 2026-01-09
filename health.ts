type HealthSnapshot = {
    ok: boolean;
    ready: boolean;
    uptime: number;
    now: number;
    lastHeartbeat: number;
    maxAgeMs: number;
    sources: Record<string, number>;
}

const startedAt = Date.now();
let ready = false;
let lastHeartbeat = Date.now();
const sources: Record<string, number> = {};

export function touch(source = 'app') {
    const now = Date.now();
    lastHeartbeat = now;
    sources[source] = now;
}

export function setReady(value: boolean) {
    ready = value;
    touch('ready');
}

export function snapshot(maxAgeMs = 120_000): HealthSnapshot {
    const now = Date.now();
    const healthy = now - lastHeartbeat <= maxAgeMs;

    return {
        ok: healthy,
        ready,
        uptime: (now - startedAt) / 1000,
        now,
        lastHeartbeat,
        maxAgeMs,
        sources: { ...sources },
    };
}
