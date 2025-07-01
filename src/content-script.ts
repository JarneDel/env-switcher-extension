import {type LanguageOption} from './types';

class ContentScript {
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
      console.error('Error extracting language from URL:', error);
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
      console.error('Error switching language:', error);
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
        }
        return true;
      });
    }
  }
}

// Initialize content script
const contentScript = new ContentScript();
contentScript.init();
