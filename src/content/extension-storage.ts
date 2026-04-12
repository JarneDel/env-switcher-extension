// Inline Storage for favicon functionality
import type {ExtensionConfig} from "../types/extension-config.ts";

export class ExtensionStorage {
    static async getConfig(): Promise<ExtensionConfig> {
        try {
            const result = await chrome.storage.sync.get('extensionConfig');
            if (result.extensionConfig && typeof result.extensionConfig === 'object') {
                return result.extensionConfig;
            }
            return {
                environments: [],
                projects: [],
                autoDetectLanguages: true
            };
        } catch (error) {
            return {
                environments: [],
                projects: [],
                autoDetectLanguages: true
            };
        }
    }
}