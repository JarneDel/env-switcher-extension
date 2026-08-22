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

export interface TabInfo {
  url: string;
  currentEnvironment?: Environment;
  availableLanguages: Array<{ code: string; name: string; url?: string }>;
  currentLanguage?: string;
}
