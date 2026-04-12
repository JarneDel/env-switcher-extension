// Use chrome API directly instead of webextension-polyfill for background script
declare const chrome: any;

// ** Import your storage class **
import { ExtensionStorage } from './libs/storage.ts';

class Background {
    init() {
        // Handle extension install
        chrome.runtime.onInstalled.addListener(() => {
            // Environment Switcher extension installed - silently handle
        });

        // Handle tab activation
        chrome.tabs.onActivated.addListener(async (activeInfo: any) => {
            await this.refreshFaviconForTab(activeInfo.tabId);
        });

        // Handle window focus changes
        chrome.windows.onFocusChanged.addListener(async (windowId: number) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) return;
            try {
                const tabs = await chrome.tabs.query({ active: true, windowId });
                if (tabs.length > 0 && tabs[0].id) {
                    await this.refreshFaviconForTab(tabs[0].id);
                }
            } catch (e) { /* Silently handle */ }
        });

        // --- **UPDATED MESSAGE LISTENER** ---
        chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response: any) => void) => {
            // Handle environment configuration changes
            if (request.action === 'environmentChanged') {
                this.refreshAllTabFavicons();
            }

            // Handle request for environments from the content script popup
            else if (request.action === 'getEnvironmentsForPopup') {
                // Use an async IIFE to handle the promise-based storage call
                (async () => {
                    try {
                        const config = await ExtensionStorage.getConfig();
                        sendResponse({ success: true, environments: config.environments || [] });
                    } catch (error) {
                        console.error('Background: Failed to get config from storage:', error);
                        sendResponse({ success: false, error: 'Could not load configuration from storage.' });
                    }
                })();

                // Return true to indicate you will send a response asynchronously
                return true;
            }
        });
    }

    private async sendMessageSafely(tabId: number, message: any): Promise<void> {
        try {
            await chrome.tabs.sendMessage(tabId, message);
        } catch (error: any) {
            // This often fails if the content script isn't injected yet, which is normal.
            // Silently handle the error.
        }
    }

    private async refreshFaviconForTab(tabId: number): Promise<void> {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.url && !tab.url.startsWith('chrome')) {
                await this.sendMessageSafely(tabId, { action: 'refreshFavicon' });
            }
        } catch (e) { /* Silently handle */ }
    }

    private async refreshAllTabFavicons(): Promise<void> {
        try {
            const tabs = await chrome.tabs.query({});
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

// Initialize background script
const backgroundScript = new Background();
backgroundScript.init();