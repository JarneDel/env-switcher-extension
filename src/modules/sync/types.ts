import type { Environment, Project } from '@/modules/environments/types';
import type { FavoritePage } from '@/modules/pages/types';

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
  bookmarksEnabled?: boolean;
  recentEnvironmentIds?: string[];
  favorites?: FavoritePage[];
  hasVisitedDisplaySettings?: boolean;
  recentsProjectScoped?: boolean;
  healthChecksEnabled?: boolean;
}
