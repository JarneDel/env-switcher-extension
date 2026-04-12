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

export interface VisitedPage {
  /** Canonical dedup key: hostname + pathname (no search/hash) */
  key: string;
  /** Most recent full URL for actual navigation */
  url: string;
  title: string;
  projectId: string;
  language?: string;
  visitCount: number;
  lastVisited: number;
}

export interface FavoritePage {
  /** Canonical key: hostname + pathname (same as VisitedPage.key) */
  key: string;
  url: string;
  title: string;
  projectId: string;
  language?: string;
  addedAt: number;
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
  minimalBorderHeight?: number;
  recentEnvironmentIds?: string[];
  favorites?: FavoritePage[];
}

export interface TabInfo {
  url: string;
  currentEnvironment?: Environment;
  availableLanguages: LanguageOption[];
  currentLanguage?: string;
}
