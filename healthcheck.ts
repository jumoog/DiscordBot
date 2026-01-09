const port = Number(process.env.HEALTH_PORT ?? 3000);
const url = `http://127.0.0.1:${port}/health`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 3_000);

try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    process.exit(res.ok ? 0 : 1);
} catch {
    clearTimeout(timeout);
    process.exit(1);
}