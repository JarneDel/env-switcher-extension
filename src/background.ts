import browser from 'webextension-polyfill';

class Background {
  init() {
    // Handle extension install
    browser.runtime.onInstalled.addListener(() => {
      console.log('Environment Switcher extension installed');
    });

    // Handle tab updates to detect environment changes
    browser.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Future: Add logic here to auto-detect and store current environment
        console.log('Tab updated:', tab.url);
      }
    });

    // Handle messages from content scripts

    browser.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
      console.log('Background received message:', request);
      // Handle any background-specific logic here
      return true;
    });
  }
}

// Initialize background script
const backgroundScript = new Background();
backgroundScript.init();