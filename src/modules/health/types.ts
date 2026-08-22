export type HealthStatus = 'up' | 'down';

export interface HealthEntry {
  status: HealthStatus;
  /** Final HTTP status code of the check, when a response was received */
  statusCode?: number;
  latencyMs?: number;
  lastChecked: number;
  /** baseUrl the entry was checked against — entries are re-checked when it changes */
  baseUrl?: string;
}

/** Environment id → last known reachability, stored in storage.local */
export type HealthMap = Record<string, HealthEntry>;
