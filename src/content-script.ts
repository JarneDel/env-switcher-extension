import {type LanguageOption} from './types';

// Define types inline for favicon functionality
interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  color: string;
  projectId: string;
}

interface ExtensionConfig {
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

interface FaviconInfo {
  element: HTMLLinkElement;
  originalHref: string;
  type: 'icon' | 'shortcut icon' | 'apple-touch-icon';
}

// Inline URL Utils for favicon functionality
class URLUtils {
  static detectCurrentEnvironment(currentUrl: string, environments: Environment[]): Environment | null {
    for (const env of environments) {
      try {
        const envUrl = new URL(env.baseUrl);
        const currentUrlObj = new URL(currentUrl);

        // Compare both hostname and port to properly distinguish localhost environments
        if (currentUrlObj.hostname === envUrl.hostname && currentUrlObj.port === envUrl.port) {
          return env;
        }
      } catch (error) {
        // Silent error handling
      }
    }
    return null;
  }
}

// Inline Storage for favicon functionality
class ExtensionStorage {
  static async getConfig(): Promise<ExtensionConfig> {
    try {
      const result = await chrome.storage.sync.get('extensionConfig');
      if (result.extensionConfig && typeof result.extensionConfig === 'object') {
        return result.extensionConfig;
      }
      return {
        environments: [],
        projects: [],
        autoDetectLanguages: true
      };
    } catch (error) {
      return {
        environments: [],
        projects: [],
        autoDetectLanguages: true
      };
    }
  }
}

// Favicon Updater Class
class FaviconUpdater {
  private originalFavicons: FaviconInfo[] = [];
  private currentEnvironment: Environment | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalBodyBorder: string = '';
  private bodyBorderApplied: boolean = false;
  private minimalBorderManager: MinimalBorderManager;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.minimalBorderManager = new MinimalBorderManager();
    this.init();
  }

  private async init() {
    // Store original states
    this.storeOriginalFavicons();
    this.storeOriginalBodyBorder();

    // Apply environment styling
    await this.updateForCurrentEnvironment();
  }

  private storeOriginalFavicons() {
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]'
    ];

    faviconSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLLinkElement>;
      elements.forEach(element => {
        const type = element.rel as FaviconInfo['type'];
        this.originalFavicons.push({
          element,
          originalHref: element.href,
          type
        });
      });
    });

    // If no favicons found, create a default one
    if (this.originalFavicons.length === 0) {
      this.createDefaultFavicon();
    }
  }

  private storeOriginalBodyBorder() {
    this.originalBodyBorder = document.documentElement.style.border || '';
  }

  private createDefaultFavicon() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    document.head.appendChild(link);

    this.originalFavicons.push({
      element: link,
      originalHref: link.href,
      type: 'icon'
    });
  }

  private async updateForCurrentEnvironment() {
    try {
      const config = await ExtensionStorage.getConfig();
      const currentUrl = window.location.href;

      const environment = URLUtils.detectCurrentEnvironment(currentUrl, config.environments);

      if (environment && environment.color) {
        this.currentEnvironment = environment;

        // Only update favicon if enabled in settings
        if (config.faviconEnabled !== false) {
          await this.updateFavicons(environment.color);
        }

        // Only update border if enabled in settings
        if (config.borderEnabled !== false) {
          const borderHeight = config.borderHeight || 3; // Default to 3px if not specified
          this.updateBodyBorder(environment.color, borderHeight);
        }

        // Only update minimal border if enabled in settings
        if (config.minimalBorderEnabled === true) {
          const height = config.minimalBorderHeight || 4; // Default to 4px if not specified
          this.minimalBorderManager.show(environment.color, height);
        } else {
          this.minimalBorderManager.hide();
        }
      } else {
        this.restoreOriginalFavicons();
        this.restoreOriginalBodyBorder();
        this.minimalBorderManager.hide();
      }
    } catch (error) {
      this.restoreOriginalFavicons();
      this.restoreOriginalBodyBorder();
      this.minimalBorderManager.hide();
    }
  }

  private async updateFavicons(borderColor: string) {
    for (let i = 0; i < this.originalFavicons.length; i++) {
      const faviconInfo = this.originalFavicons[i];
      try {
        const newHref = await this.addBorderToFavicon(faviconInfo.originalHref, borderColor);
        faviconInfo.element.href = newHref;

        // Force favicon refresh by removing and re-adding
        const parent = faviconInfo.element.parentNode;
        if (parent) {
          parent.removeChild(faviconInfo.element);
          parent.appendChild(faviconInfo.element);
        }
      } catch (error) {
        // Try creating a colored favicon as fallback
        try {
          this.createColoredFavicon(borderColor);
          faviconInfo.element.href = this.canvas.toDataURL('image/png');
        } catch (fallbackError) {
          // Silent fallback error handling
        }
      }
    }
  }

  private updateBodyBorder(borderColor: string, borderHeight: number = 3) {
    try {
      document.documentElement.style.border = `${borderHeight}px solid ${borderColor}`;
      document.documentElement.style.boxSizing = 'border-box';
      this.bodyBorderApplied = true;
    } catch (error) {
      // Silent error handling
    }
  }

  private restoreOriginalBodyBorder() {
    try {
      if (this.bodyBorderApplied) {
        document.documentElement.style.border = this.originalBodyBorder;
        if (!this.originalBodyBorder) {
          document.documentElement.style.removeProperty('border');
          document.documentElement.style.removeProperty('box-sizing');
        }
        this.bodyBorderApplied = false;
      }
    } catch (error) {
      // Silent error handling
    }
  }

  private async addBorderToFavicon(faviconUrl: string, borderColor: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const size = Math.max(img.width, img.height, 32);
          this.canvas.width = size;
          this.canvas.height = size;

          this.ctx.clearRect(0, 0, size, size);

          const borderWidth = Math.max(2, Math.floor(size * 0.1));
          this.ctx.fillStyle = borderColor;
          this.ctx.fillRect(0, 0, size, size);

          const innerSize = size - (borderWidth * 2);
          this.ctx.clearRect(borderWidth, borderWidth, innerSize, innerSize);

          const scale = Math.min(innerSize / img.width, innerSize / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = borderWidth + (innerSize - scaledWidth) / 2;
          const y = borderWidth + (innerSize - scaledHeight) / 2;

          this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          const dataUrl = this.canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = (error) => {
        try {
          this.createColoredFavicon(borderColor);
          resolve(this.canvas.toDataURL('image/png'));
        } catch (fallbackError) {
          reject(fallbackError);
        }
      };

      // Handle different URL formats
      let finalUrl = faviconUrl;

      if (faviconUrl.startsWith('data:')) {
        finalUrl = faviconUrl;
      } else if (faviconUrl.startsWith('//')) {
        finalUrl = window.location.protocol + faviconUrl;
      } else if (faviconUrl.startsWith('/')) {
        finalUrl = window.location.origin + faviconUrl;
      } else if (!faviconUrl.startsWith('http')) {
        finalUrl = new URL(faviconUrl, window.location.href).href;
      } else {
        finalUrl = faviconUrl;
      }

      img.src = finalUrl;
    });
  }

  private createColoredFavicon(color: string) {
    const size = 32;
    this.canvas.width = size;
    this.canvas.height = size;

    this.ctx.clearRect(0, 0, size, size);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, size, size);

    const gradient = this.ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, size, size);
  }

  private restoreOriginalFavicons() {
    this.originalFavicons.forEach((faviconInfo, index) => {
      faviconInfo.element.href = faviconInfo.originalHref;
    });
  }

  public async refresh() {
    await this.updateForCurrentEnvironment();
    this.minimalBorderManager.refresh();
  }
}

// Minimal Border Manager Class
class MinimalBorderManager {
  private borderElement: HTMLDivElement | null = null;
  private isActive: boolean = false;
  private currentColor: string = '';
  private height: number = 4; // Default height

  constructor() {
    this.createBorderElement();
  }

  private createBorderElement() {
    // Create a persistent border element
    this.borderElement = document.createElement('div');
    this.borderElement.id = 'env-switcher-minimal-border';
    this.borderElement.style.cssText = `
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: ${this.height}px !important;
      background-color: transparent !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      display: none !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    `;

    // Add to document immediately when DOM is ready
    if (document.body) {
      document.body.appendChild(this.borderElement);
    } else {
      // Wait for DOM to be ready
      const addWhenReady = () => {
        if (document.body) {
          document.body.appendChild(this.borderElement!);
        } else {
          setTimeout(addWhenReady, 10);
        }
      };
      addWhenReady();
    }

    // Ensure the border stays in place even when DOM changes
    this.setupMutationObserver();
  }

  private setupMutationObserver() {
    const observer = new MutationObserver(() => {
      // Re-attach the border element if it gets removed
      if (this.borderElement && !document.contains(this.borderElement)) {
        if (document.body) {
          document.body.appendChild(this.borderElement);
        }
      }
    });

    // Start observing when DOM is ready
    const startObserving = () => {
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } else {
        setTimeout(startObserving, 10);
      }
    };
    startObserving();
  }

  public show(color: string, height?: number) {
    if (!this.borderElement) return;

    this.currentColor = color;
    this.isActive = true;
    if (height !== undefined) {
      this.height = height;
    }

    this.borderElement.style.backgroundColor = `${color} !important`;
    this.borderElement.style.height = `${this.height}px !important`;
    this.borderElement.style.display = 'block !important';

    // Ensure it stays visible by re-applying styles
    this.ensureVisibility();
  }

  public hide() {
    if (!this.borderElement) return;

    this.isActive = false;
    this.borderElement.style.display = 'none !important';
    this.borderElement.style.backgroundColor = 'transparent !important';
  }

  private ensureVisibility() {
    if (!this.isActive || !this.borderElement) return;

    // Periodically ensure the border stays visible and properly styled
    const ensureStyles = () => {
      if (this.borderElement && this.isActive) {
        this.borderElement.style.cssText = `
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: ${this.height}px !important;
          background-color: ${this.currentColor} !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          display: block !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        `;
      }
    };

    // Apply styles immediately and periodically
    ensureStyles();
    setTimeout(ensureStyles, 100);
    setTimeout(ensureStyles, 500);
  }

  public refresh() {
    if (this.isActive && this.currentColor) {
      this.show(this.currentColor, this.height);
    }
  }
}

class ContentScript {
  private faviconUpdater: FaviconUpdater;

  constructor() {
    this.faviconUpdater = new FaviconUpdater();
  }

  private detectAlternateLanguages(): LanguageOption[] {
    const languagesMap = new Map<string, LanguageOption>();

    // Method 1: Check for <link rel="alternate"> tags
    const alternateLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    alternateLinks.forEach(link => {
      const hreflang = link.getAttribute('hreflang');
      const href = link.getAttribute('href');

      if (hreflang && href && hreflang !== 'x-default') {
        languagesMap.set(hreflang, {
          code: hreflang,
          name: this.getLanguageName(hreflang),
          url: href
        });
      }
    });

    // Method 2: Check for language switcher elements (common patterns)
    if (languagesMap.size === 0) {
      const langSwitchers = document.querySelectorAll(
          '[class*="lang"], [class*="language"], [id*="lang"], [id*="language"]'
      );

      langSwitchers.forEach(element => {
        const links = element.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();

          if (href && text) {
            // Try to extract language code from URL or text
            const langCode = this.extractLanguageCode(href, text);
            if (langCode) {
              languagesMap.set(langCode, {
                code: langCode,
                name: text,
                url: href
              });
            }
          }
        });
      });
    }

    // Method 3: Extract from current URL structure
    if (languagesMap.size === 0) {
      const currentLang = this.extractLanguageFromUrl(window.location.href);
      if (currentLang) {
        // Assume common languages exist
        const commonLangs = ['en', 'nl', 'fr', 'de'];
        commonLangs.forEach(lang => {
          if (lang !== currentLang) {
            const newUrl = this.switchLanguageInUrl(window.location.href, lang);
            languagesMap.set(lang, {
              code: lang,
              name: this.getLanguageName(lang),
              url: newUrl
            });
          }
        });
      }
    }

    console.log('Detected languages:', Array.from(languagesMap.values()));
    return Array.from(languagesMap.values());
  }

  private getLanguageName(code: string): string {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'nl': 'Nederlands',
      'fr': 'Français',
      'de': 'Deutsch',
      'es': 'Español',
      'it': 'Italiano',
      'pt': 'Português'
    };

    return languageNames[code] || code.toUpperCase();
  }

  private extractLanguageCode(href: string, text: string): string | undefined {
    // Try to extract from URL first
    const urlLang = this.extractLanguageFromUrl(href);
    if (urlLang) return urlLang;

    // Try to extract from text
    const textLower = text.toLowerCase();
    if (textLower.length === 2 && /^[a-z]{2}$/.test(textLower)) {
      return textLower;
    }

    return undefined;
  }

  private extractLanguageFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length > 0 && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(pathParts[0])) {
        // Normalize locale codes to just the language part (nl-BE -> nl, fr-BE -> fr)
        return pathParts[0].split('-')[0];
      }
    } catch (error) {
      // Silent error handling
    }
    return undefined;
  }

  private switchLanguageInUrl(currentUrl: string, targetLang: string): string {
    try {
      const url = new URL(currentUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Remove current language if present
      if (pathParts.length > 0 && /^[a-z]{2,3}$/.test(pathParts[0])) {
        pathParts.shift();
      }

      // Add new language
      pathParts.unshift(targetLang);

      return `${url.origin}/${pathParts.join('/')}${url.search}${url.hash}`;
    } catch (error) {
      return currentUrl;
    }
  }

  init() {
    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getLanguages') {
          const languages = this.detectAlternateLanguages();
          const currentLang = this.extractLanguageFromUrl(window.location.href);

          sendResponse({
            languages,
            currentLanguage: currentLang,
            url: window.location.href
          });
        } else if (request.action === 'refreshFavicon') {
          this.faviconUpdater.refresh().then(() => {
            sendResponse({ success: true });
          }).catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // Will respond asynchronously
        }
        return true;
      });
    }

    // Listen for URL changes (for SPAs)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.faviconUpdater.refresh();
      }
    });

    observer.observe(document, { subtree: true, childList: true });
  }
}

// Initialize content script
new ContentScript().init();