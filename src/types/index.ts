export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  color: string;
  isActive?: boolean;
}

export interface LanguageOption {
  code: string;
  name: string;
  url?: string;
}

export interface ExtensionConfig {
  environments: Environment[];
  currentEnvironment?: string;
  autoDetectLanguages: boolean;
}

export interface TabInfo {
  url: string;
  currentEnvironment?: Environment;
  availableLanguages: LanguageOption[];
  currentLanguage?: string;
}

// Remove the DEFAULT_ENVIRONMENTS - everything will be user-configured