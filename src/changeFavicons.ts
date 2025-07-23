
// Define types inline instead of importing
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

// Inline the URLUtils functionality we need
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
        console.error('Error parsing URL:', error);
      }
    }
    return null;
  }
}

// Inline the ExtensionStorage functionality we need
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
      console.error('Error getting config:', error);
      return {
        environments: [],
        projects: [],
        autoDetectLanguages: true
      };
    }
  }
}

class FaviconUpdater {
  private originalFavicons: FaviconInfo[] = [];
  private currentEnvironment: Environment | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.init();
  }

  private async init() {
    // Store original favicons
    this.storeOriginalFavicons();

    // Get current environment and update favicon
    await this.updateFaviconForCurrentEnvironment();
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

  private async updateFaviconForCurrentEnvironment() {
    try {
      const config = await ExtensionStorage.getConfig();
      const currentUrl = window.location.href;

      // Find matching environment
      const environment = URLUtils.detectCurrentEnvironment(currentUrl, config.environments);

      if (environment && environment.color) {
        this.currentEnvironment = environment;
        await this.updateFavicons(environment.color);
      } else {
        // No matching environment, restore original favicons
        this.restoreOriginalFavicons();
      }
    } catch (error) {
      console.error('Error updating favicon for environment:', error);
      this.restoreOriginalFavicons();
    }
  }

  private async updateFavicons(borderColor: string) {
    for (const faviconInfo of this.originalFavicons) {
      try {
        faviconInfo.element.href = await this.addBorderToFavicon(faviconInfo.originalHref, borderColor);
      } catch (error) {
        console.error('Error modifying favicon:', error);
        // Keep original if modification fails
      }
    }
  }

  private async addBorderToFavicon(faviconUrl: string, borderColor: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          // Set canvas size (most favicons are 16x16 or 32x32)
          const size = Math.max(img.width, img.height, 32);
          this.canvas.width = size;
          this.canvas.height = size;

          // Clear canvas
          this.ctx.clearRect(0, 0, size, size);

          // Draw border
          const borderWidth = Math.max(2, Math.floor(size * 0.1));
          this.ctx.fillStyle = borderColor;
          this.ctx.fillRect(0, 0, size, size);

          // Create inner area (for the original favicon)
          const innerSize = size - (borderWidth * 2);
          this.ctx.clearRect(borderWidth, borderWidth, innerSize, innerSize);

          // Draw original favicon in the center
          const scale = Math.min(innerSize / img.width, innerSize / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = borderWidth + (innerSize - scaledWidth) / 2;
          const y = borderWidth + (innerSize - scaledHeight) / 2;

          this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          // Convert to data URL
          const dataUrl = this.canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        // If image fails to load, create a colored square favicon
        this.createColoredFavicon(borderColor);
        resolve(this.canvas.toDataURL('image/png'));
      };

      // Handle data URLs and relative URLs
      if (faviconUrl.startsWith('data:')) {
        img.src = faviconUrl;
      } else if (faviconUrl.startsWith('//')) {
        img.src = window.location.protocol + faviconUrl;
      } else if (faviconUrl.startsWith('/')) {
        img.src = window.location.origin + faviconUrl;
      } else if (!faviconUrl.startsWith('http')) {
        img.src = new URL(faviconUrl, window.location.href).href;
      } else {
        img.src = faviconUrl;
      }
    });
  }

  private createColoredFavicon(color: string) {
    const size = 32;
    this.canvas.width = size;
    this.canvas.height = size;

    // Clear canvas
    this.ctx.clearRect(0, 0, size, size);

    // Fill with environment color
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, size, size);

    // Add a subtle inner shadow for depth
    const gradient = this.ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, size, size);
  }

  private restoreOriginalFavicons() {
    this.originalFavicons.forEach(faviconInfo => {
      faviconInfo.element.href = faviconInfo.originalHref;
    });
  }

  // Public method to manually update favicon (called from background script)
  public async refresh() {
    await this.updateFaviconForCurrentEnvironment();
  }
}

// Initialize favicon updater when content script loads
const faviconUpdater = new FaviconUpdater();

// Listen for messages from background script to refresh favicon
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'refreshFavicon') {
      faviconUpdater.refresh().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('Error refreshing favicon:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Will respond asynchronously
    }
  });
}

// Also listen for URL changes (for SPAs)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    faviconUpdater.refresh();
  }
});

observer.observe(document, { subtree: true, childList: true });

// Export for potential external use
(window as any).faviconUpdater = faviconUpdater;