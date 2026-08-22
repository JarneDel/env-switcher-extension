/**
 * Helpers for telling apart the two ways the extension UI can be shown:
 * the toolbar popup, and the same page opened as a normal browser tab.
 *
 * This matters for anything that opens an OS-level dialog. Chrome tears the
 * popup down the moment it loses focus, so a file picker opened from the
 * popup destroys the page (and its state) before the user has chosen a file.
 * Those flows have to run in a tab instead.
 */

/** Path of the built extension page that hosts the popup UI. */
const EXTENSION_PAGE = 'popup.html';

/**
 * True when this document is a tab, false when it is the toolbar popup.
 * `tabs.getCurrent()` resolves to undefined for popups and background pages.
 */
export const isRunningInTab = async (): Promise<boolean> => {
  try {
    return Boolean(await browser.tabs.getCurrent());
  } catch {
    return false;
  }
};

/** Opens the extension UI in a new tab, deep-linked to a hash route. */
export const openInTab = async (route: string): Promise<void> => {
  const url = browser.runtime.getURL(`/${EXTENSION_PAGE}#${route}` as `/${string}`);
  await browser.tabs.create({ url });
};
