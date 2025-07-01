import browser from 'webextension-polyfill';
import type {ExtensionConfig} from '../types';

export class ExtensionStorage {
  private static isValidConfig(config: any): config is ExtensionConfig {
    return (
      config &&
      typeof config === 'object' &&
      Array.isArray(config.environments) &&
      typeof config.autoDetectLanguages === 'boolean'
    );
  }

  private static getDefaultConfig(): ExtensionConfig {
    return {
      environments: [],
      autoDetectLanguages: true
    };
  }

  private static async getStorage(): Promise<browser.Storage.StorageArea> {
    return browser.storage.local;
  }

  static async getConfig(): Promise<ExtensionConfig> {
    try {
      const storage = await this.getStorage();
      const result = await storage.get('extensionConfig');

      if (this.isValidConfig(result.extensionConfig)) {
        return result.extensionConfig;
      }

      // Return default configuration
      return this.getDefaultConfig();
    } catch (error) {
      console.error('Error getting config:', error);
      return this.getDefaultConfig();
    }
  }

  static async saveConfig(config: ExtensionConfig): Promise<void> {
    try {
      const storage = await this.getStorage();
      await storage.set({ extensionConfig: config });
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  static async getCurrentEnvironment(): Promise<string | undefined> {
    const config = await this.getConfig();
    return config.currentEnvironment;
  }

  static async setCurrentEnvironment(envId: string): Promise<void> {
    const config = await this.getConfig();
    config.currentEnvironment = envId;
    await this.saveConfig(config);
  }

  static async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.environments.length > 0;
  }
}