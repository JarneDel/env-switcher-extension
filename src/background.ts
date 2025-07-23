// Use chrome API directly instead of webextension-polyfill for background script
declare const chrome: any;

class Background {
  init() {
    // Handle extension install
    chrome.runtime.onInstalled.addListener(() => {
      console.debug('Environment Switcher extension installed');
    });

    // Handle tab updates to inject favicon script and refresh favicons
    chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Skip chrome:// and other extension pages
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('moz-extension://') || tab.url.startsWith('chrome-extension://')) {
          return;
        }

        try {
          // Inject the favicon content script
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['changeFavicons.js']
          });
        } catch (error) {
          console.error('Failed to inject favicon script:', error);
        }
      }
    });

    // Handle tab activation (when switching between tabs)
    chrome.tabs.onActivated.addListener(async (activeInfo: any) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://') && !tab.url.startsWith('chrome-extension://')) {
          // Send message to refresh favicon when switching tabs
          await this.sendMessageSafely(activeInfo.tabId, { action: 'refreshFavicon' });
        }
      } catch (error) {
        console.error('Failed to refresh favicon on tab activation:', error);
      }
    });

    // Handle window focus changes
    chrome.windows.onFocusChanged.addListener(async (windowId: number) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return; // No window focused
      }

      try {
        const tabs = await chrome.tabs.query({ active: true, windowId });
        if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
          const tab = tabs[0];
          if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://') && !tab.url.startsWith('chrome-extension://')) {
            await this.sendMessageSafely(tab.id!, { action: 'refreshFavicon' });
          }
        }
      } catch (error) {
        console.error('Failed to refresh favicon on window focus:', error);
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request: any) => {
      // Handle environment switch requests
      if (request.action === 'environmentChanged') {
        // Refresh favicons on all tabs when environment configuration changes
        this.refreshAllTabFavicons();
      }

      return true;
    });
  }

  private async sendMessageSafely(tabId: number, message: any): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error: any) {
      // Ignore connection errors - the tab might not have content scripts loaded
      console.debug('Could not send message to tab:', tabId, error.message);
    }
  }

  private async refreshAllTabFavicons() {
    try {
      const tabs = await chrome.tabs.query({});

      for (const tab of tabs) {
        if (tab.id && tab.url &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('moz-extension://') &&
            !tab.url.startsWith('chrome-extension://')) {
          await this.sendMessageSafely(tab.id, { action: 'refreshFavicon' });
        }
      }
    } catch (error) {
      console.error('Failed to refresh all tab favicons:', error);
    }
  }
}

// Initialize background script
const backgroundScript = new Background();
backgroundScript.init();