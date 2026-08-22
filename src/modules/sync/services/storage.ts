import type { Environment, ExtensionConfig } from '@/types';

export type StoredConfig = ExtensionConfig;

export const GLOBAL_CONFIG_KEY = 'config_global';
export const PROJ_ENVS_PREFIX = 'proj_envs_';
export const LEGACY_CONFIG_KEY = 'extensionConfig';

const fallbackStorage = {
  get: async (key: any) => {
    try {
      if (key === null) {
        const res: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            try { res[k] = JSON.parse(localStorage.getItem(k) || ''); } catch { res[k] = localStorage.getItem(k); }
          }
        }
        return res;
      }
      if (typeof key === 'string') {
        const item = localStorage.getItem(key);
        return item ? { [key]: JSON.parse(item) } : {};
      }
      return {};
    } catch {
      return {};
    }
  },
  set: async (items: Record<string, any>) => {
    try {
      for (const [k, v] of Object.entries(items)) {
        localStorage.setItem(k, JSON.stringify(v));
      }
    } catch { /* ignore */ }
  },
  remove: async (keys: any) => {
    try {
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }
};

// Choose between sync and local storage
const getStorageArea = (sync = true): Browser.Storage.StorageArea => {
  if (sync && typeof browser !== 'undefined' && browser.storage?.sync) {
    return browser.storage.sync;
  }
  if (typeof browser !== 'undefined' && browser.storage?.local) {
    return browser.storage.local;
  }
  return fallbackStorage as any;
};

// ── in-memory cache ───────────────────────────────────────────────────────────
// loadConfig() reads and deserialises the whole storage area. That runs on hot
// paths (every tab switch, every omnibox keystroke, every favicon refresh), so
// each extension context keeps its own copy and drops it as soon as the stored
// data actually changes — including changes made by another context.

interface CacheEntry {
  config: StoredConfig;
  /** Every key present in the area at the time of the read. */
  keys: Set<string>;
}

const configCache = new Map<boolean, CacheEntry>();

let cacheInvalidationWired = false;
const wireCacheInvalidation = (): void => {
  if (cacheInvalidationWired) return;
  cacheInvalidationWired = true;
  try {
    browser.storage.onChanged.addListener(() => configCache.clear());
  } catch {
    // storage.onChanged is unavailable (e.g. the localStorage fallback) — the
    // cache then only lives for as long as nothing writes through this module.
  }
};

/** Drop the cached config for every area. Exported for tests and manual resets. */
export const invalidateConfigCache = (): void => {
  configCache.clear();
};

export const loadConfig = async (sync = true): Promise<StoredConfig> => {
  const defaultStoredConfig: StoredConfig = {
    projects: [],
    environments: [],
    autoDetectLanguages: true,
    faviconEnabled: false,
    borderEnabled: false,
    borderHeight: 3,
    minimalBorderEnabled: false,
    minimalBorderHeight: 4,
    bookmarksEnabled: false,
    favorites: [],
    hasVisitedDisplaySettings: false,
    recentsProjectScoped: false,
    healthChecksEnabled: true,
  };

  wireCacheInvalidation();

  const cached = configCache.get(sync);
  if (cached) return cached.config;

  try {
    const storage = getStorageArea(sync);
    const allData = await storage.get(null);

    if (!allData || typeof allData !== 'object') {
      return defaultStoredConfig;
    }

    const keys = new Set(Object.keys(allData));
    const remember = (config: StoredConfig): StoredConfig => {
      configCache.set(sync, { config, keys });
      return config;
    };

    // 1. Check if new format (config_global) exists
    if (allData[GLOBAL_CONFIG_KEY] && typeof allData[GLOBAL_CONFIG_KEY] === 'object') {
      const global = allData[GLOBAL_CONFIG_KEY];
      const projects = Array.isArray(global.projects) ? global.projects : [];
      
      const environments: Environment[] = [];
      const projectIds = new Set(projects.map((p: any) => p.id));

      // Collect environments in project order
      for (const project of projects) {
        const envs = allData[`${PROJ_ENVS_PREFIX}${project.id}`];
        if (Array.isArray(envs)) {
          environments.push(...envs);
        }
      }

      // Collect any orphan/unassigned environment keys
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(PROJ_ENVS_PREFIX)) {
          const projId = key.slice(PROJ_ENVS_PREFIX.length);
          if (!projectIds.has(projId) && Array.isArray(value)) {
            environments.push(...value);
          }
        }
      }

      return remember({
        projects,
        environments,
        autoDetectLanguages: typeof global.autoDetectLanguages === 'boolean' ? global.autoDetectLanguages : true,
        faviconEnabled: typeof global.faviconEnabled === 'boolean' ? global.faviconEnabled : false,
        borderEnabled: typeof global.borderEnabled === 'boolean' ? global.borderEnabled : false,
        borderHeight: typeof global.borderHeight === 'number' ? global.borderHeight : 3,
        minimalBorderEnabled: typeof global.minimalBorderEnabled === 'boolean' ? global.minimalBorderEnabled : false,
        minimalBorderHeight: typeof global.minimalBorderHeight === 'number' ? global.minimalBorderHeight : 4,
        bookmarksEnabled: typeof global.bookmarksEnabled === 'boolean' ? global.bookmarksEnabled : false,
        currentEnvironment: global.currentEnvironment,
        recentEnvironmentIds: Array.isArray(global.recentEnvironmentIds) ? global.recentEnvironmentIds : [],
        favorites: Array.isArray(global.favorites) ? global.favorites : [],
        hasVisitedDisplaySettings: typeof global.hasVisitedDisplaySettings === 'boolean' ? global.hasVisitedDisplaySettings : false,
        recentsProjectScoped: typeof global.recentsProjectScoped === 'boolean' ? global.recentsProjectScoped : false,
        healthChecksEnabled: typeof global.healthChecksEnabled === 'boolean' ? global.healthChecksEnabled : true,
      });
    }

    // 2. Check legacy format (extensionConfig) for automatic migration
    const legacyConfig = allData[LEGACY_CONFIG_KEY];
    if (legacyConfig && typeof legacyConfig === 'object') {
      return remember({
        projects: Array.isArray(legacyConfig.projects) ? legacyConfig.projects : [],
        environments: Array.isArray(legacyConfig.environments) ? legacyConfig.environments : [],
        autoDetectLanguages: typeof legacyConfig.autoDetectLanguages === 'boolean' ? legacyConfig.autoDetectLanguages : true,
        faviconEnabled: typeof legacyConfig.faviconEnabled === 'boolean' ? legacyConfig.faviconEnabled : false,
        borderEnabled: typeof legacyConfig.borderEnabled === 'boolean' ? legacyConfig.borderEnabled : false,
        borderHeight: typeof legacyConfig.borderHeight === 'number' ? legacyConfig.borderHeight : 3,
        minimalBorderEnabled: typeof legacyConfig.minimalBorderEnabled === 'boolean' ? legacyConfig.minimalBorderEnabled : false,
        minimalBorderHeight: typeof legacyConfig.minimalBorderHeight === 'number' ? legacyConfig.minimalBorderHeight : 4,
        bookmarksEnabled: typeof legacyConfig.bookmarksEnabled === 'boolean' ? legacyConfig.bookmarksEnabled : false,
        currentEnvironment: legacyConfig.currentEnvironment,
        recentEnvironmentIds: Array.isArray(legacyConfig.recentEnvironmentIds) ? legacyConfig.recentEnvironmentIds : [],
        favorites: Array.isArray(legacyConfig.favorites) ? legacyConfig.favorites : [],
        hasVisitedDisplaySettings: typeof legacyConfig.hasVisitedDisplaySettings === 'boolean' ? legacyConfig.hasVisitedDisplaySettings : false,
        recentsProjectScoped: typeof legacyConfig.recentsProjectScoped === 'boolean' ? legacyConfig.recentsProjectScoped : false,
        healthChecksEnabled: typeof legacyConfig.healthChecksEnabled === 'boolean' ? legacyConfig.healthChecksEnabled : true,
      });
    }

    return remember(defaultStoredConfig);
  } catch (error) {
    console.error('Failed to load config:', error);
    return defaultStoredConfig;
  }
};

export const saveConfig = async (config: StoredConfig, sync = true): Promise<void> => {
  try {
    const storage = getStorageArea(sync);

    const globalData = {
      projects: config.projects,
      autoDetectLanguages: config.autoDetectLanguages,
      faviconEnabled: config.faviconEnabled,
      borderEnabled: config.borderEnabled,
      borderHeight: config.borderHeight,
      minimalBorderEnabled: config.minimalBorderEnabled,
      minimalBorderHeight: config.minimalBorderHeight,
      bookmarksEnabled: config.bookmarksEnabled,
      currentEnvironment: config.currentEnvironment,
      recentEnvironmentIds: config.recentEnvironmentIds,
      favorites: config.favorites,
      hasVisitedDisplaySettings: config.hasVisitedDisplaySettings,
      recentsProjectScoped: config.recentsProjectScoped,
      healthChecksEnabled: config.healthChecksEnabled,
    };

    const payload: Record<string, any> = {
      [GLOBAL_CONFIG_KEY]: globalData,
    };

    // Group environments by project
    const activeProjectIds = new Set(config.projects.map(p => p.id));
    for (const project of config.projects) {
      const projectEnvs = config.environments.filter(e => e.projectId === project.id);
      payload[`${PROJ_ENVS_PREFIX}${project.id}`] = projectEnvs;
    }

    // Handle any unassigned environments without matching projectId
    const unassignedEnvs = config.environments.filter(e => !activeProjectIds.has(e.projectId));
    if (unassignedEnvs.length > 0) {
      payload[`${PROJ_ENVS_PREFIX}unassigned`] = unassignedEnvs;
    }

    // Identify keys to remove (deleted projects and legacy single key). The key
    // set is usually already known from the preceding loadConfig(), which saves
    // a second full read of the area on the common save path.
    const storedKeys = configCache.get(sync)?.keys ?? new Set(Object.keys(await storage.get(null)));
    const keysToRemove: string[] = [];

    if (storedKeys.has(LEGACY_CONFIG_KEY)) {
      keysToRemove.push(LEGACY_CONFIG_KEY);
    }

    for (const key of storedKeys) {
      if (key.startsWith(PROJ_ENVS_PREFIX)) {
        const projId = key.slice(PROJ_ENVS_PREFIX.length);
        if (projId !== 'unassigned' && !activeProjectIds.has(projId)) {
          keysToRemove.push(key);
        } else if (projId === 'unassigned' && unassignedEnvs.length === 0) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await storage.remove(keysToRemove);
    }

    await storage.set(payload);
    configCache.delete(sync);
  } catch (error) {
    configCache.delete(sync);
    console.error('Failed to save config:', error);
    throw error;
  }
};

/**
 * Write a handful of fields on the global config blob without rewriting the
 * per-project environment keys. Only fields that live in the global blob may be
 * patched this way (i.e. anything except `environments`).
 *
 * Falls back to a full save when no global blob exists yet, so a fresh install
 * or a pre-migration legacy config still gets written out correctly.
 */
export const updateGlobalConfig = async (
  patch: Partial<Omit<StoredConfig, 'environments'>>,
  sync = true
): Promise<void> => {
  try {
    const storage = getStorageArea(sync);
    const data = await storage.get(GLOBAL_CONFIG_KEY);
    const current = data?.[GLOBAL_CONFIG_KEY];

    if (!current || typeof current !== 'object') {
      const config = await loadConfig(sync);
      await saveConfig({ ...config, ...patch }, sync);
      return;
    }

    await storage.set({ [GLOBAL_CONFIG_KEY]: { ...current, ...patch } });
    configCache.delete(sync);
  } catch (error) {
    configCache.delete(sync);
    console.error('Failed to update config:', error);
    throw error;
  }
};

export class ExtensionStorage {
  static async getConfig(sync = true): Promise<ExtensionConfig> {
    return loadConfig(sync);
  }

  static async saveConfig(config: ExtensionConfig, sync = true): Promise<void> {
    return saveConfig(config, sync);
  }

  static async getCurrentEnvironment(sync = true): Promise<string | undefined> {
    const config = await this.getConfig(sync);
    return config.currentEnvironment;
  }

  static async setCurrentEnvironment(envId: string, sync = true): Promise<void> {
    await updateGlobalConfig({ currentEnvironment: envId }, sync);
  }

  static async isConfigured(sync = true): Promise<boolean> {
    const config = await this.getConfig(sync);
    return (config.environments?.length ?? 0) > 0;
  }
}
