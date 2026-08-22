import { ExtensionStorage, GLOBAL_CONFIG_KEY, PROJ_ENVS_PREFIX } from '@/modules/sync';
import { Omnibox } from '@/shared/extension';
import {
  HEALTH_DIRTY_RUN_INTERVAL_MS,
  HEALTH_LAST_RUN_KEY,
  HEALTH_MIN_RUN_INTERVAL_MS,
  HEALTH_STORAGE_KEY,
  clearHealthData,
  loadHealthMap,
  runHealthChecks,
  saveHealthMap,
} from '@/modules/health';
import type { ExtensionConfig, HealthMap } from '@/types';

class Background {
    private healthRunning = false;

    init() {
        // Register the address bar (omnibox) keyword handler
        new Omnibox().init();

        // Handle tab activation
        browser.tabs.onActivated.addListener(async (activeInfo) => {
            await this.refreshFaviconForTab(activeInfo.tabId);
        });

        // Handle in-page navigations (including SPA history changes). The
        // content script used to watch for these with a document-wide
        // MutationObserver, which made every DOM change on every page cost
        // something; the browser already reports them here for free.
        browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (!changeInfo.url) return;
            void this.sendMessageSafely(tabId, { action: 'refreshFavicon' });
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

        // Keep health statuses in sync with config changes. Every config write
        // lands here, so bail out before reading the config unless something
        // health-related actually moved.
        browser.storage.onChanged.addListener((changes: Record<string, any>, area) => {
            if (area !== 'sync') return;

            const globalChange = changes[GLOBAL_CONFIG_KEY];
            const healthToggled = !!globalChange &&
                globalChange.oldValue?.healthChecksEnabled !== globalChange.newValue?.healthChecksEnabled;
            const environmentsChanged = Object.keys(changes).some(key => key.startsWith(PROJ_ENVS_PREFIX));

            if (!healthToggled && !environmentsChanged) return;
            void this.onConfigChanged(healthToggled);
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
            } else if (request.action === 'healthRefresh') {
                // Throttled inside maybeRunHealthChecks — safe to call on popup open.
                void this.maybeRunHealthChecks();
                sendResponse({ success: true });
            } else if (request.action === 'getHealthStatus') {
                (async () => {
                    try {
                        sendResponse({ success: true, health: await loadHealthMap() });
                    } catch (error) {
                        sendResponse({ success: false });
                    }
                })();
                return true;
            }
        });

        void this.onConfigChanged(true);
    }

    /**
     * Single entry point for config-driven health work, so one config read
     * serves both the enabled check and the run itself.
     */
    private async onConfigChanged(healthMayHaveBeenDisabled: boolean): Promise<void> {
        try {
            const config = await ExtensionStorage.getConfig();
            if (config.healthChecksEnabled === false) {
                if (healthMayHaveBeenDisabled) await clearHealthData();
                return;
            }
            await this.maybeRunHealthChecks(config);
        } catch (e) { /* Silently handle */ }
    }

    // ── health checks (on-demand / lazy) ───────────────────────────────────

    /**
     * Run a health check pass unless one is already running or the throttle
     * window hasn't elapsed. Runs are bounded by:
     * - a minimum interval between runs (HEALTH_MIN_RUN_INTERVAL_MS, 15 min),
     * - a shorter interval reserved for newly added/changed environments.
     */
    private async maybeRunHealthChecks(preloadedConfig?: ExtensionConfig): Promise<void> {
        if (this.healthRunning) return;

        try {
            const config = preloadedConfig ?? await ExtensionStorage.getConfig();
            if (config.healthChecksEnabled === false) return;
            const envs = config.environments.filter(e => e.baseUrl);
            if (envs.length === 0) return;

            const stored = await browser.storage.local.get([HEALTH_LAST_RUN_KEY, HEALTH_STORAGE_KEY]);
            const lastRun = typeof stored[HEALTH_LAST_RUN_KEY] === 'number' ? stored[HEALTH_LAST_RUN_KEY] : 0;
            const existing: HealthMap = stored[HEALTH_STORAGE_KEY] ?? {};
            const now = Date.now();

            // Re-check soon after environments are added or their URL changes.
            const hasDirtyEntries = envs.some(e => {
                const entry = existing[e.id];
                return !entry || entry.baseUrl !== e.baseUrl;
            });
            const due =
                lastRun === 0 ||
                now - lastRun >= HEALTH_MIN_RUN_INTERVAL_MS ||
                (hasDirtyEntries && now - lastRun >= HEALTH_DIRTY_RUN_INTERVAL_MS);
            if (!due) return;

            this.healthRunning = true;
            try {
                await browser.storage.local.set({ [HEALTH_LAST_RUN_KEY]: now });
                const next = await runHealthChecks(envs, {
                    existing,
                    minAgeMs: HEALTH_MIN_RUN_INTERVAL_MS,
                });
                await saveHealthMap(next);
            } finally {
                this.healthRunning = false;
            }
        } catch (e) { /* Silently handle */ }
    }

    // ── favicon refresh ─────────────────────────────────────────────────────

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
            // query() already carries each tab's url, so this needs no per-tab
            // tabs.get(), and the sends run concurrently rather than serially.
            const tabs = await browser.tabs.query({});
            await Promise.allSettled(
                tabs
                    .filter(tab => typeof tab.id === 'number' && tab.url && /^https?:/.test(tab.url))
                    .map(tab => this.sendMessageSafely(tab.id!, { action: 'refreshFavicon' }))
            );
        } catch (error) {
            // Failed to refresh all tab favicons - silently handle
        }
    }
}

export default defineBackground(() => {
    new Background().init();
});
