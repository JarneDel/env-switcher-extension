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

        if (currentUrlObj.hostname === envUrl.hostname) {
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

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
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
        await this.updateFavicons(environment.color);
        this.updateBodyBorder(environment.color);
      } else {
        this.restoreOriginalFavicons();
        this.restoreOriginalBodyBorder();
      }
    } catch (error) {
      this.restoreOriginalFavicons();
      this.restoreOriginalBodyBorder();
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

  private updateBodyBorder(borderColor: string) {
    try {
      document.documentElement.style.border = `3px solid ${borderColor}`;
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
  }
}

class ContentScript {
  private faviconUpdater: FaviconUpdater;

  constructor() {
    this.faviconUpdater = new FaviconUpdater();
  }

  private detectAlternateLanguages(): LanguageOption[] {
    const languages: LanguageOption[] = [];

    // Method 1: Check for <link rel="alternate"> tags
    const alternateLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    alternateLinks.forEach(link => {
      const hreflang = link.getAttribute('hreflang');
      const href = link.getAttribute('href');

      if (hreflang && href && hreflang !== 'x-default') {
        languages.push({
          code: hreflang,
          name: this.getLanguageName(hreflang),
          url: href
        });
      }
    });

    // Method 2: Check for language switcher elements (common patterns)
    if (languages.length === 0) {
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
              languages.push({
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
    if (languages.length === 0) {
      const currentLang = this.extractLanguageFromUrl(window.location.href);
      if (currentLang) {
        // Assume common languages exist
        const commonLangs = ['en', 'nl', 'fr', 'de'];
        commonLangs.forEach(lang => {
          if (lang !== currentLang) {
            const newUrl = this.switchLanguageInUrl(window.location.href, lang);
            languages.push({
              code: lang,
              name: this.getLanguageName(lang),
              url: newUrl
            });
          }
        });
      }
    }

    return languages;
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
