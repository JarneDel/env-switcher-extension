import { type Environment, type LanguageOption } from '../types';

export class URLUtils {
  static detectCurrentEnvironment(url: string, environments: Environment[]): Environment | undefined {
    const urlObj = new URL(url);
    return environments.find(env => {
      const envUrl = new URL(env.baseUrl);
      return urlObj.hostname === envUrl.hostname;
    });
  }

  static switchEnvironment(currentUrl: string, targetEnv: Environment, currentEnv?: Environment): string {
    try {
      const url = new URL(currentUrl);
      const targetUrl = new URL(targetEnv.baseUrl);
      
      // Handle special case for production URLs
      if (targetEnv.id === 'production') {
        // Replace events-v2 with agenda for production
        const pathname = url.pathname.replace('/events-v2', '/agenda');
        return `${targetUrl.origin}${pathname}${url.search}${url.hash}`;
      }
      
      // For other environments, keep the same path structure
      return `${targetUrl.origin}${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
      console.error('Error switching environment:', error);
      return currentUrl;
    }
  }

  static extractLanguageFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Check if first path segment is a language code (2-3 letters) or locale (nl-BE, fr-BE)
      if (pathParts.length > 0 && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(pathParts[0])) {
        // Normalize locale codes to just the language part (nl-BE -> nl, fr-BE -> fr)
        const langCode = pathParts[0].split('-')[0];
        return langCode;
      }
    } catch (error) {
      console.error('Error extracting language:', error);
    }
    return undefined;
  }

  static switchLanguage(currentUrl: string, targetLang: string): string {
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
      console.error('Error switching language:', error);
      return currentUrl;
    }
  }
}

/**
 * Extract the base domain from a URL
 * @param url - Full URL string
 * @returns Base domain (protocol + hostname + port if non-standard)
 */
export const extractBaseDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Include port if it's not the default for the protocol
    const port = urlObj.port &&
      ((urlObj.protocol === 'https:' && urlObj.port !== '443') ||
       (urlObj.protocol === 'http:' && urlObj.port !== '80'))
      ? `:${urlObj.port}` : '';

    return `${urlObj.protocol}//${urlObj.hostname}${port}`;
  } catch (error) {
    throw new Error('Invalid URL provided');
  }
};

/**
 * Get the current tab's URL from the browser
 * @returns Promise that resolves to the current tab's URL
 */
export const getCurrentTabUrl = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const currentTab = tabs[0];
        if (currentTab?.url) {
          resolve(currentTab.url);
        } else {
          reject(new Error('Could not get current tab URL'));
        }
      });
    } else {
      // Fallback for development or non-extension environment
      resolve(window.location.href);
    }
  });
};
