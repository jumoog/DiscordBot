type Probe = () => boolean;

type HealthSnapshot = {
    ok: boolean;
    ready: boolean;
    uptime: number;
    now: number;
    sources: Record<string, number>;
    probes: Record<string, boolean>;
}

const startedAt = Date.now();
let ready = false;
const sources: Record<string, number> = {};
const probes = new Map<string, Probe>();

/**
 * Record that `source` showed signs of life just now.
 */
export function touch(source = 'app') {
    sources[source] = Date.now();
}

export function setReady(value: boolean) {
    ready = value;
    touch('ready');
}

/**
 * Register a liveness check. The service is only reported healthy while every
 * registered probe returns true. Integrations register their probe once they
 * have actually started, so an intentionally disabled integration does not
 * make the whole bot look unhealthy.
 */
export function registerProbe(name: string, probe: Probe) {
    probes.set(name, probe);
}

/**
 * Probe that passes while `source` has been touched within `maxAgeMs`.
 */
export function heartbeatProbe(source: string, maxAgeMs = 120_000): Probe {
    return () => Date.now() - (sources[source] ?? 0) <= maxAgeMs;
}

export function snapshot(): HealthSnapshot {
    const results: Record<string, boolean> = {};
    for (const [name, probe] of probes) {
        try {
            results[name] = probe();
        } catch {
            results[name] = false;
        }
    }

    return {
        ok: Object.values(results).every(Boolean),
        ready,
        uptime: (Date.now() - startedAt) / 1000,
        now: Date.now(),
        sources: { ...sources },
        probes: results,
    };
}
