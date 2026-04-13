import browser from 'webextension-polyfill';
import type { ExtensionConfig } from '@/types';

export type StoredConfig = ExtensionConfig;

export class ExtensionStorage {
  private static isValidConfig(config: any): config is ExtensionConfig {
    return (
      config &&
      typeof config === 'object' &&
      Array.isArray(config.environments) &&
      Array.isArray(config.projects) &&
      typeof config.autoDetectLanguages === 'boolean'
    );
  }

  private static getDefaultConfig(): ExtensionConfig {
    return {
      environments: [],
      projects: [],
      autoDetectLanguages: true,
      faviconEnabled: false,
      borderEnabled: false,
      borderHeight: 3,
      minimalBorderEnabled: false,
      minimalBorderHeight: 4,
      favorites: [],
      hasVisitedDisplaySettings: false,
      recentsProjectScoped: false,
    };
  }

  // Choose between sync and local storage
  private static async getStorage(sync = true): Promise<browser.Storage.StorageArea> {
    if (sync && browser.storage.sync) {
      return browser.storage.sync;
    }
    return browser.storage.local;
  }

  static async getConfig(sync = true): Promise<ExtensionConfig> {
    try {
      const storage = await this.getStorage(sync);
      const result = await storage.get('extensionConfig');
      if (this.isValidConfig(result.extensionConfig)) {
        return { ...this.getDefaultConfig(), ...result.extensionConfig };
      }
      return this.getDefaultConfig();
    } catch (error) {
      console.error('Error getting config:', error);
      return this.getDefaultConfig();
    }
  }

  static async saveConfig(config: ExtensionConfig, sync = true): Promise<void> {
    try {
      const storage = await this.getStorage(sync);
      await storage.set({ extensionConfig: config });
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  static async getCurrentEnvironment(sync = true): Promise<string | undefined> {
    const config = await this.getConfig(sync);
    return config.currentEnvironment;
  }

  static async setCurrentEnvironment(envId: string, sync = true): Promise<void> {
    const config = await this.getConfig(sync);
    config.currentEnvironment = envId;
    await this.saveConfig(config, sync);
  }

  static async isConfigured(sync = true): Promise<boolean> {
    const config = await this.getConfig(sync);
    return config.environments.length > 0;
  }
}

// AI-aware storage functions that work with the same storage location
export const loadConfig = async (): Promise<StoredConfig> => {
  try {
    const storage = await browser.storage.sync || browser.storage.local;
    const result = await storage.get('extensionConfig');
    const config = result.extensionConfig as any;

    const defaultStoredConfig: StoredConfig = {
      projects: [],
      environments: [],
      autoDetectLanguages: true,
      faviconEnabled: false,
      borderEnabled: false,
      borderHeight: 3,
      minimalBorderEnabled: false,
      minimalBorderHeight: 4,
      favorites: [],
      hasVisitedDisplaySettings: false,
      recentsProjectScoped: false,
    };

    if (!config || typeof config !== 'object') {
      return defaultStoredConfig;
    }

    return {
      projects: Array.isArray(config.projects) ? config.projects : [],
      environments: Array.isArray(config.environments) ? config.environments : [],
      autoDetectLanguages: typeof config.autoDetectLanguages === 'boolean' ? config.autoDetectLanguages : true,
      faviconEnabled: typeof config.faviconEnabled === 'boolean' ? config.faviconEnabled : false,
      borderEnabled: typeof config.borderEnabled === 'boolean' ? config.borderEnabled : false,
      borderHeight: typeof config.borderHeight === 'number' ? config.borderHeight : 3,
      minimalBorderEnabled: typeof config.minimalBorderEnabled === 'boolean' ? config.minimalBorderEnabled : false,
      minimalBorderHeight: typeof config.minimalBorderHeight === 'number' ? config.minimalBorderHeight : 4,
      currentEnvironment: config.currentEnvironment,
      recentEnvironmentIds: Array.isArray(config.recentEnvironmentIds) ? config.recentEnvironmentIds : [],
      favorites: Array.isArray(config.favorites) ? config.favorites : [],
      hasVisitedDisplaySettings: typeof config.hasVisitedDisplaySettings === 'boolean' ? config.hasVisitedDisplaySettings : false,
      recentsProjectScoped: typeof config.recentsProjectScoped === 'boolean' ? config.recentsProjectScoped : false,
    };
  } catch (error) {
    console.error('Failed to load config:', error);
    return {
      projects: [],
      environments: [],
      autoDetectLanguages: true,
    };
  }
};

export const saveConfig = async (config: StoredConfig): Promise<void> => {
  try {
    const storage = await browser.storage.sync || browser.storage.local;
    await storage.set({ extensionConfig: config });
  } catch (error) {
    console.error('Failed to save config:', error);
    throw error;
  }
};
