import { ExtensionStorage } from '../libs/storage.ts';
import { Omnibox } from '../libs/omnibox.ts';
import { URLUtils } from '../libs/urlUtils.ts';
import {
  HEALTH_ALARM_NAME,
  HEALTH_CHECK_PERIOD_MINUTES,
  HEALTH_DIRTY_RUN_INTERVAL_MS,
  HEALTH_LAST_RUN_KEY,
  HEALTH_MIN_RUN_INTERVAL_MS,
  HEALTH_STORAGE_KEY,
  clearHealthData,
  loadHealthMap,
  runHealthChecks,
  saveHealthMap,
} from '../libs/healthCheck.ts';
import type { ExtensionConfig, HealthMap } from '@/types';

const MENU_ROOT_ID = 'env-switcher-root';
const MENU_ID_PREFIX = 'env-switch:';
const MENU_REBUILD_DEBOUNCE_MS = 300;
const MAX_RECENTS = 5;

class Background {
    private menuRebuildTimer: ReturnType<typeof setTimeout> | null = null;
    private healthRunning = false;

    init() {
        // Handle extension install
        browser.runtime.onInstalled.addListener(() => {
            void this.rebuildContextMenus();
        });

        // Register the address bar (omnibox) keyword handler
        new Omnibox().init();

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

        // Keep context menus and health statuses in sync with config changes
        browser.storage.onChanged.addListener((_changes, area) => {
            if (area !== 'sync') return;
            this.scheduleContextMenuRebuild();
            void this.syncHealthEnabled();
            void this.maybeRunHealthChecks();
        });

        // Periodic health checks (alarm survives service worker suspension)
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === HEALTH_ALARM_NAME) void this.maybeRunHealthChecks();
        });

        browser.contextMenus.onClicked.addListener((info, tab) => {
            void this.handleMenuClick(info, tab);
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
                // Throttled inside maybeRunHealthChecks — safe to call on every popup open.
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

        void this.rebuildContextMenus();
        void this.syncHealthEnabled().then(() => this.maybeRunHealthChecks());
    }

    // ── context menus ───────────────────────────────────────────────────────

    private scheduleContextMenuRebuild(): void {
        if (this.menuRebuildTimer) clearTimeout(this.menuRebuildTimer);
        this.menuRebuildTimer = setTimeout(() => {
            void this.rebuildContextMenus();
        }, MENU_REBUILD_DEBOUNCE_MS);
    }

    private async rebuildContextMenus(): Promise<void> {
        try {
            const config = await ExtensionStorage.getConfig();
            await browser.contextMenus.removeAll();

            const envs = config.environments.filter(e => {
                try { new URL(e.baseUrl); return true; } catch { return false; }
            });
            if (envs.length === 0) return;

            // Disambiguate duplicate environment names with their project name.
            const nameCounts = new Map<string, number>();
            for (const env of envs) {
                const key = env.name.trim().toLowerCase();
                nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
            }

            browser.contextMenus.create({
                id: MENU_ROOT_ID,
                title: 'Environment Switcher',
                contexts: ['page', 'link'],
            });

            for (const env of envs) {
                const isDuplicate = nameCounts.get(env.name.trim().toLowerCase())! > 1;
                const project = isDuplicate
                    ? config.projects.find(p => p.id === env.projectId)
                    : undefined;
                const title = project && project.name
                    ? `${env.name} — ${project.name}`
                    : env.name;

                browser.contextMenus.create({
                    id: `${MENU_ID_PREFIX}${env.id}`,
                    parentId: MENU_ROOT_ID,
                    title: title || 'Unnamed',
                });
            }
        } catch (e) { /* Silently handle */ }
    }

    private async handleMenuClick(info: Browser.contextMenus.OnClickData, tab?: Browser.tabs.Tab): Promise<void> {
        const id = String(info.menuItemId);
        if (!id.startsWith(MENU_ID_PREFIX)) return;

        try {
            const config = await ExtensionStorage.getConfig();
            const target = config.environments.find(e => e.id === id.slice(MENU_ID_PREFIX.length));
            if (!target) return;

            // Right-clicked a link → open that link on the target environment in a
            // new tab; otherwise switch the current page in place.
            if (info.linkUrl) {
                const newUrl = URLUtils.switchEnvironment(info.linkUrl, target);
                const options: Browser.tabs.CreateProperties = { url: newUrl };
                if (tab?.index !== undefined) options.index = tab.index + 1;
                await browser.tabs.create(options);
                return;
            }

            const sourceUrl = tab?.url ?? info.pageUrl;
            if (!sourceUrl || tab?.id === undefined) return;

            const newUrl = URLUtils.switchEnvironment(sourceUrl, target);
            await browser.tabs.update(tab.id, { url: newUrl });
            await ExtensionStorage.saveConfig({
                ...config,
                currentEnvironment: target.id,
                recentEnvironmentIds: [
                    target.id,
                    ...(config.recentEnvironmentIds ?? []).filter(r => r !== target.id),
                ].slice(0, MAX_RECENTS),
            });
        } catch (e) { /* Silently handle */ }
    }

    // ── health checks ───────────────────────────────────────────────────────

    /**
     * Run a health check pass unless one is already running or the throttle
     * window hasn't elapsed. Runs are bounded by:
     * - a periodic alarm (every HEALTH_CHECK_PERIOD_MINUTES),
     * - a minimum interval between runs (HEALTH_MIN_RUN_INTERVAL_MS),
     * - a shorter interval reserved for newly added/changed environments.
     */
    private async maybeRunHealthChecks(): Promise<void> {
        if (this.healthRunning) return;

        try {
            const config = await ExtensionStorage.getConfig();
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

    /** Create or tear down the periodic alarm based on the user's setting. */
    private async syncHealthEnabled(): Promise<void> {
        try {
            const config = await ExtensionStorage.getConfig();
            if (config.healthChecksEnabled === false) {
                await browser.alarms.clear(HEALTH_ALARM_NAME);
                await clearHealthData();
            } else {
                const existing = await browser.alarms.get(HEALTH_ALARM_NAME);
                if (!existing) {
                    await browser.alarms.create(HEALTH_ALARM_NAME, {
                        periodInMinutes: HEALTH_CHECK_PERIOD_MINUTES,
                    });
                }
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
