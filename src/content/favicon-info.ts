export interface FaviconInfo {
    element: HTMLLinkElement;
    originalHref: string;
    type: 'icon' | 'shortcut icon' | 'apple-touch-icon';
    isModified?: boolean;
    originalOriginalHref?: string; // Track the very original URL
}