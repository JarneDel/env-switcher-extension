import browser from 'webextension-polyfill';
import type { ExtensionConfig } from '../types';

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