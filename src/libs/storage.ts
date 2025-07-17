import browser from 'webextension-polyfill';
import type { ExtensionConfig } from '../types';
import type {LMStudioConfig} from './aiUtils';

export interface StoredConfig extends ExtensionConfig {
  aiConfig?: LMStudioConfig;
}

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
      autoDetectLanguages: true
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
        return result.extensionConfig;
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
    const config = result.extensionConfig;

    if (!config) {
      return {
        projects: [],
        environments: [],
        autoDetectLanguages: true,
        aiConfig: {
          enabled: false,
          url: 'http://localhost:1234',
          model: ''
        }
      };
    }

    // Return the config with AI config added if it doesn't exist
    return {
      ...config,
      aiConfig: config.aiConfig || {
        enabled: false,
        url: 'http://localhost:1234',
        model: ''
      }
    };
  } catch (error) {
    console.error('Failed to load config:', error);
    return {
      projects: [],
      environments: [],
      autoDetectLanguages: true,
      aiConfig: {
        enabled: false,
        url: 'http://localhost:1234',
        model: ''
      }
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
