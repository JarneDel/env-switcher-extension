import { FaviconUpdater } from '@/modules/visual-indicators';
import { PopupController } from '@/modules/quick-access';
import { LanguageDetector } from '@/modules/language';

class ContentScript {
    private readonly faviconUpdater: FaviconUpdater;
    private readonly languageDetector: LanguageDetector;

    constructor() {
        this.faviconUpdater = new FaviconUpdater();
        this.languageDetector = new LanguageDetector();
    }

    private handleMessages = (request: any, _sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined => {
        switch (request.action) {
            case 'getLanguages': {
                const languages = this.languageDetector.detect();
                const currentLanguage = this.languageDetector.getCurrentLanguage();
                sendResponse({ languages, currentLanguage, url: window.location.href });
                return undefined;
            }
            case 'refreshFavicon': {
                this.faviconUpdater.refresh()
                    .then(() => sendResponse({ success: true }))
                    .catch((error: Error) => sendResponse({ success: false, error: error.message }));
                // Only this branch answers asynchronously. Returning true for the
                // others kept the message channel open for a reply that never
                // came, leaking the port and hanging the sender's promise.
                return true;
            }
            case 'showShortcutPopup': {
                PopupController.show();
                sendResponse({ success: true });
                return undefined;
            }
            default:
                return undefined;
        }
    }

    public init(): void {
        browser.runtime.onMessage.addListener(this.handleMessages);
    }
}

export default defineContentScript({
    matches: ['http://*/*', 'https://*/*'],
    runAt: 'document_end',
    main() {
        new ContentScript().init();
    },
});
