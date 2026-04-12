import {FaviconUpdater} from "./content/favicon-updater";
import {PopupController} from "./content/popup-controller";
import {LanguageDetector} from "./content/language-detector";

class ContentScript {
    private readonly faviconUpdater: FaviconUpdater;
    private readonly languageDetector: LanguageDetector;

    constructor() {
        this.faviconUpdater = new FaviconUpdater();
        this.languageDetector = new LanguageDetector();
    }

    /**
     * Handles incoming messages from other parts of the extension.
     */
    private handleMessages = (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
        switch (request.action) {
            case 'getLanguages': {
                const languages = this.languageDetector.detect();
                const currentLanguage = this.languageDetector.getCurrentLanguage();
                sendResponse({
                    languages,
                    currentLanguage,
                    url: window.location.href
                });
                break;
            }
            case 'refreshFavicon': {
                this.faviconUpdater.refresh()
                    .then(() => sendResponse({success: true}))
                    .catch(error => sendResponse({success: false, error: error.message}));
                return true; // Indicates an async response
            }
            case 'showShortcutPopup': {
                PopupController.show();
                sendResponse({success: true});
                break;
            }
            default:
                // Optional: handle unknown actions
                break;
        }
        return true;
    }

    /**
     * Observes URL changes in Single Page Applications.
     */
    private observeUrlChanges(): void {
        let lastUrl = window.location.href;
        const observer = new MutationObserver(async () => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                await this.faviconUpdater.refresh();
            }
        });
        observer.observe(document, {subtree: true, childList: true});
    }

    /**
     * Initializes the content script.
     */
    public init(): void {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(this.handleMessages);
        }
        this.observeUrlChanges();
    }
}

new ContentScript().init();