import { FaviconUpdater } from '../content/favicon-updater';
import { PopupController } from '../content/popup-controller';
import { LanguageDetector } from '../content/language-detector';

class ContentScript {
    private readonly faviconUpdater: FaviconUpdater;
    private readonly languageDetector: LanguageDetector;

    constructor() {
        this.faviconUpdater = new FaviconUpdater();
        this.languageDetector = new LanguageDetector();
    }

    private handleMessages = (request: any, _sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
        switch (request.action) {
            case 'getLanguages': {
                const languages = this.languageDetector.detect();
                const currentLanguage = this.languageDetector.getCurrentLanguage();
                sendResponse({ languages, currentLanguage, url: window.location.href });
                break;
            }
            case 'refreshFavicon': {
                this.faviconUpdater.refresh()
                    .then(() => sendResponse({ success: true }))
                    .catch((error: Error) => sendResponse({ success: false, error: error.message }));
                return true;
            }
            case 'showShortcutPopup': {
                PopupController.show();
                sendResponse({ success: true });
                break;
            }
            default:
                break;
        }
        return true;
    }

    private observeUrlChanges(): void {
        let lastUrl = window.location.href;
        const observer = new MutationObserver(async () => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                await this.faviconUpdater.refresh();
            }
        });
        observer.observe(document, { subtree: true, childList: true });
    }

    public init(): void {
        browser.runtime.onMessage.addListener(this.handleMessages);
        this.observeUrlChanges();
    }
}

export default defineContentScript({
    matches: ['http://*/*', 'https://*/*'],
    runAt: 'document_end',
    main() {
        new ContentScript().init();
    },
});
