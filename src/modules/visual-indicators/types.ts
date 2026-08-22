export interface FaviconInfo {
  element: HTMLLinkElement;
  originalHref: string;
  originalOriginalHref?: string;
  type: 'icon' | 'shortcut icon' | 'apple-touch-icon';
  isModified: boolean;
}

export interface DisplaySettings {
  faviconEnabled?: boolean;
  borderEnabled?: boolean;
  borderHeight?: number;
  minimalBorderEnabled?: boolean;
  minimalBorderHeight?: number;
  bookmarksEnabled?: boolean;
  hasVisitedDisplaySettings?: boolean;
}
