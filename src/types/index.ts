export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  color: string;
  projectId: string;
  isActive?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  url?: string;
}

export interface ExtensionConfig {
  environments: Environment[];
  projects: Project[];
  currentEnvironment?: string;
  autoDetectLanguages: boolean;
  faviconEnabled?: boolean;
  borderEnabled?: boolean;
  borderHeight?: number;
  minimalBorderEnabled?: boolean;
  minimalBorderHeight?: number; //
}

export interface TabInfo {
  url: string;
  currentEnvironment?: Environment;
  availableLanguages: LanguageOption[];
  currentLanguage?: string;
}
