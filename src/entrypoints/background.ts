import { ExtensionStorage } from '../libs/storage.ts';

class Background {
    init() {
        // Handle extension install
        browser.runtime.onInstalled.addListener(() => {
            // Environment Switcher extension installed - silently handle
        });

        // Handle tab activation
        browser.tabs.onActivated.addListener(async (activeInfo) => {
            await this.refreshFaviconForTab(activeInfo.tabId);
        });

        // Handle window focus changes
        browser.windows.onFocusChanged.addListener(async (windowId) => {
            if (windowId === browser.windows.WINDOW_ID_NONE) return;
            try {
                const tabs = await browser.tabs.query({ active: true, windowId });
                if (tabs.length > 0 && tabs[0].id) {
                    await this.refreshFaviconForTab(tabs[0].id);
                }
            } catch (e) { /* Silently handle */ }
        });

        browser.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
            if (request.action === 'environmentChanged') {
                this.refreshAllTabFavicons();
            } else if (request.action === 'getEnvironmentsForPopup') {
                (async () => {
                    try {
                        const config = await ExtensionStorage.getConfig();
                        sendResponse({ success: true, environments: config.environments || [] });
                    } catch (error) {
                        sendResponse({ success: false, error: 'Could not load configuration from storage.' });
                    }
                })();
                return true;
            }
        });
    }

    private async sendMessageSafely(tabId: number, message: any): Promise<void> {
        try {
            await browser.tabs.sendMessage(tabId, message);
        } catch (error: any) {
            // Silently handle — content script may not be injected yet
        }
    }

    private async refreshFaviconForTab(tabId: number): Promise<void> {
        try {
            const tab = await browser.tabs.get(tabId);
            if (tab.url && !tab.url.startsWith('chrome')) {
                await this.sendMessageSafely(tabId, { action: 'refreshFavicon' });
            }
        } catch (e) { /* Silently handle */ }
    }

    private async refreshAllTabFavicons(): Promise<void> {
        try {
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                if (tab.id) {
                    await this.refreshFaviconForTab(tab.id);
                }
            }
        } catch (error) {
            // Failed to refresh all tab favicons - silently handle
        }
    }
}

export default defineBackground(() => {
    new Background().init();
});
