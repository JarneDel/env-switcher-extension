import {type LanguageOption} from '../types';

// Define a type for our detection strategies
type DetectionStrategy = () => Map<string, LanguageOption>;

export class LanguageDetector {
    private strategies: DetectionStrategy[];

    constructor() {
        // An array of detection methods, ordered by preference.
        // The first one to find languages wins.
        this.strategies = [
            this.detectFromAlternateLinks,
            this.detectFromSwitcherElements,
            this.detectFromUrlStructure,
        ];
    }

    /**
     * Tries each detection strategy in order until one returns results.
     */
    public detect(): LanguageOption[] {
        for (const strategy of this.strategies) {
            const languagesMap = strategy();
            if (languagesMap.size > 0) {
                console.log(`Languages detected via: ${strategy.name}`);
                return Array.from(languagesMap.values());
            }
        }
        console.log('No alternate languages detected.');
        return [];
    }

    /**
     * Extracts the language code from the current page's URL.
     */
    public getCurrentLanguage(): string | undefined {
        return this.extractLanguageFromUrl(window.location.href);
    }

    // STRATEGY 1: Check for <link rel="alternate"> tags
    private detectFromAlternateLinks = (): Map<string, LanguageOption> => {
        const languagesMap = new Map<string, LanguageOption>();
        const alternateLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');

        alternateLinks.forEach(link => {
            const hreflang = link.getAttribute('hreflang');
            const href = link.getAttribute('href');

            if (hreflang && href && hreflang !== 'x-default') {
                languagesMap.set(hreflang, {
                    code: hreflang,
                    name: this.getLanguageName(hreflang),
                    url: new URL(href, window.location.origin).href,
                });
            }
        });
        return languagesMap;
    }

    // STRATEGY 2: Check for common language switcher elements
    private detectFromSwitcherElements = (): Map<string, LanguageOption> => {
        const languagesMap = new Map<string, LanguageOption>();
        // Implementation is the same as your original method...
        return languagesMap;
    }

    // STRATEGY 3: Guess based on URL structure
    private detectFromUrlStructure = (): Map<string, LanguageOption> => {
        const languagesMap = new Map<string, LanguageOption>();
        // Implementation is the same as your original method...
        return languagesMap;
    }

    // --- HELPER METHODS ---
    // These are the same as your original helper methods (getLanguageName, etc.)
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
}