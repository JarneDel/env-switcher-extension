import type {Environment} from "./environment.ts";

export interface ExtensionConfig {
    environments: Environment[];
    projects: any[];
    autoDetectLanguages: boolean;
    faviconEnabled?: boolean;
    borderEnabled?: boolean;
    borderHeight?: number;
    minimalBorderEnabled?: boolean;
    minimalBorderHeight?: number;
    currentEnvironment?: string;
}