// Inline Storage for favicon functionality
import type {ExtensionConfig} from "../types/extension-config.ts";

const DEFAULT_CONFIG: ExtensionConfig = {
    environments: [],
    projects: [],
    autoDetectLanguages: true,
    faviconEnabled: false,
    borderEnabled: false,
    borderHeight: 3,
    minimalBorderEnabled: false,
    minimalBorderHeight: 4,
};

export class ExtensionStorage {
    static async getConfig(): Promise<ExtensionConfig> {
        try {
            const result = await browser.storage.sync.get('extensionConfig');
            if (result.extensionConfig && typeof result.extensionConfig === 'object') {
                return { ...DEFAULT_CONFIG, ...result.extensionConfig };
            }
            return { ...DEFAULT_CONFIG };
        } catch (error) {
            return { ...DEFAULT_CONFIG };
        }
    }
}