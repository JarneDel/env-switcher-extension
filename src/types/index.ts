export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  color: string;
  projectId: string; // New field to associate with a project
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
  projects: Project[]; // New field for projects
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