import type { Environment, HealthEntry, HealthMap } from '@/types';

// ── constants ─────────────────────────────────────────────────────────────────

export const HEALTH_STORAGE_KEY = 'health_status';
export const HEALTH_LAST_RUN_KEY = 'health_last_run';
export const HEALTH_ALARM_NAME = 'health-check';

/** How often the periodic alarm fires (also the staleness threshold). */
export const HEALTH_CHECK_PERIOD_MINUTES = 15;
/** Minimum time between any two check runs, regardless of what triggered them. */
export const HEALTH_MIN_RUN_INTERVAL_MS = HEALTH_CHECK_PERIOD_MINUTES * 60 * 1000;
/** New/changed environments may be checked this soon after a previous run. */
export const HEALTH_DIRTY_RUN_INTERVAL_MS = 60 * 1000;
/** Per-request timeout before an origin is considered unreachable. */
const PROBE_TIMEOUT_MS = 8_000;
/** Max parallel probes — keeps CPU/network use low with many environments. */
const PROBE_CONCURRENCY = 4;

// ── storage ───────────────────────────────────────────────────────────────────

export const loadHealthMap = async (): Promise<HealthMap> => {
  try {
    const data = await browser.storage.local.get(HEALTH_STORAGE_KEY);
    const raw = data[HEALTH_STORAGE_KEY];
    if (!raw || typeof raw !== 'object') return {};
    const map: HealthMap = {};
    for (const [id, entry] of Object.entries(raw as Record<string, any>)) {
      if (
        entry && typeof entry === 'object' &&
        (entry.status === 'up' || entry.status === 'down') &&
        typeof entry.lastChecked === 'number'
      ) {
        map[id] = {
          status: entry.status,
          lastChecked: entry.lastChecked,
          ...(typeof entry.latencyMs === 'number' ? { latencyMs: entry.latencyMs } : {}),
          ...(typeof entry.statusCode === 'number' ? { statusCode: entry.statusCode } : {}),
          ...(typeof entry.baseUrl === 'string' ? { baseUrl: entry.baseUrl } : {}),
        };
      }
    }
    return map;
  } catch {
    return {};
  }
};

export const saveHealthMap = async (map: HealthMap): Promise<void> => {
  try {
    await browser.storage.local.set({ [HEALTH_STORAGE_KEY]: map });
  } catch { /* storage full or unavailable — statuses are non-critical */ }
};

export const clearHealthData = async (): Promise<void> => {
  try {
    await browser.storage.local.remove([HEALTH_STORAGE_KEY, HEALTH_LAST_RUN_KEY]);
  } catch { /* ignore */ }
};

// ── probing ───────────────────────────────────────────────────────────────────

/**
 * Probe an origin with a plain GET request. Extension contexts with host
 * permissions bypass CORS, so the real HTTP status code is readable —
 * anything outside 2xx (e.g. a 502 error page served by a proxy) counts
 * as down. Fetch only rejects on network-level failures.
 */
export const probeOrigin = async (
  origin: string
): Promise<{ ok: boolean; latencyMs?: number; statusCode?: number }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(origin, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - started);
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, latencyMs, statusCode: res.status };
    }
    return { ok: false, statusCode: res.status };
  } catch {
    // Network failure, DNS error, or aborted by timeout.
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
};

// ── batch runner ──────────────────────────────────────────────────────────────

interface OriginGroup {
  origin: string;
  baseUrl: string;
  envIds: string[];
}

const isFresh = (entry: HealthEntry | undefined, baseUrl: string, now: number, minAgeMs: number): boolean =>
  !!entry && entry.baseUrl === baseUrl && now - entry.lastChecked < minAgeMs;

export interface HealthRunOptions {
  /** Skip entries checked more recently than this, unless their baseUrl changed. */
  minAgeMs: number;
  /** Previously known statuses; entries for removed environments are dropped. */
  existing?: HealthMap;
}

/**
 * Check environments for reachability. Probes are deduplicated per origin and
 * run with bounded concurrency; fresh entries are left untouched. Returns the
 * full merged map (a single storage write per run).
 */
export const runHealthChecks = async (
  environments: Environment[],
  options: HealthRunOptions
): Promise<HealthMap> => {
  const { minAgeMs, existing = {} } = options;
  const now = Date.now();

  const next: HealthMap = {};
  for (const [id, entry] of Object.entries(existing)) {
    if (environments.some(e => e.id === id)) next[id] = entry;
  }

  // Group environments by origin so shared hosts are only probed once.
  const pending: OriginGroup[] = [];
  const byOrigin = new Map<string, OriginGroup>();
  for (const env of environments) {
    if (isFresh(existing[env.id], env.baseUrl, now, minAgeMs)) continue;
    let origin: string;
    try { origin = new URL(env.baseUrl).origin; } catch { continue; }
    let group = byOrigin.get(origin);
    if (!group) {
      group = { origin, baseUrl: env.baseUrl, envIds: [] };
      byOrigin.set(origin, group);
      pending.push(group);
    }
    group.envIds.push(env.id);
  }

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < pending.length) {
      const group = pending[cursor++];
      const result = await probeOrigin(group.origin);
      const entry: HealthEntry = {
        status: result.ok ? 'up' : 'down',
        lastChecked: Date.now(),
        baseUrl: group.baseUrl,
        ...(result.latencyMs !== undefined ? { latencyMs: result.latencyMs } : {}),
        ...(result.statusCode !== undefined ? { statusCode: result.statusCode } : {}),
      };
      for (const id of group.envIds) next[id] = { ...entry };
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PROBE_CONCURRENCY, pending.length) }, () => worker())
  );

  return next;
};
