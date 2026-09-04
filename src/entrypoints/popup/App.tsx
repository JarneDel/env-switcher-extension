import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from '@/shared/router';
import type { Environment, TabInfo, ExtensionConfig, LanguageOption, VisitedPage, FavoritePage, HealthMap } from '@/types';
import { ExtensionStorage } from '@/modules/sync';
import { URLUtils } from '@/modules/environments';
import { HEALTH_STORAGE_KEY, loadHealthMap } from '@/modules/health';
import { HistoryService } from '@/modules/pages';
import { MainView, SettingsView, SetupWelcome } from '@/modules/views';

const MAX_RECENTS = 5;

function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  const [visitedPages, setVisitedPages] = useState<VisitedPage[]>([]);
  const [hasHistoryPermission, setHasHistoryPermission] = useState<boolean>(true);
  const [healthMap, setHealthMap] = useState<HealthMap>({});

  const navigate = useNavigate();
  const location = useLocation();
  const isInitialMount = useRef(true);
  const activeTabId = useRef<number | null>(null);

  useEffect(() => {
    loadInitialData();

    // Refresh when the tab this popup is acting on actually navigates.
    // Without the id and url checks this fired for every update event on every
    // tab in the browser, and each one re-ran a full config read, a tabs query
    // and a history search.
    const handleTabUpdate = (tabId: number, changeInfo: { url?: string }) => {
      if (!changeInfo.url) return;
      if (activeTabId.current !== null && tabId !== activeTabId.current) return;
      loadInitialData();
    };

    if (browser.tabs?.onUpdated) {
      browser.tabs.onUpdated.addListener(handleTabUpdate);
      return () => {
        browser.tabs.onUpdated.removeListener(handleTabUpdate);
      };
    }
  }, []);

  // Ask the background to refresh stale statuses (throttled there) and keep
  // the UI in sync as new results are written to storage.
  useEffect(() => {
    browser.runtime.sendMessage({ action: 'healthRefresh' }).catch(() => {});
    loadHealthMap().then(setHealthMap).catch(() => {});

    const handleStorageChange = (changes: Record<string, any>, area: string) => {
      if (area === 'local' && HEALTH_STORAGE_KEY in changes) {
        setHealthMap(changes[HEALTH_STORAGE_KEY]?.newValue ?? {});
      }
    };
    if (browser.storage?.onChanged?.addListener) {
      browser.storage.onChanged.addListener(handleStorageChange);
      return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Reload data when navigating back to main view so auto-saved changes are reflected
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (location.pathname === '/') {
      loadInitialData();
    }
  }, [location.pathname]);

  useEffect(() => {
    // Navigate to setup if not configured and not already on setup/settings
    if (!loading && !isConfigured && location.pathname === '/') {
      navigate('/setup');
    }
  }, [loading, isConfigured, location.pathname, navigate]);

  const loadInitialData = async () => {
    try {
      // Parallelize config fetch and active tab query for instant startup
      const [extensionConfig, tabs] = await Promise.all([
        ExtensionStorage.getConfig(),
        browser.tabs?.query ? browser.tabs.query({ active: true, currentWindow: true }) : Promise.resolve([]),
      ]);

      const configured = (extensionConfig.environments?.length ?? 0) > 0;
      setConfig(extensionConfig);
      setIsConfigured(configured);

      const activeTab = tabs && tabs[0];
      activeTabId.current = typeof activeTab?.id === 'number' ? activeTab.id : null;
      let tabInfo: TabInfo | null = null;

      if (activeTab?.url) {
        const currentEnv = URLUtils.detectCurrentEnvironment(activeTab.url, extensionConfig.environments);
        const currentLang = URLUtils.extractLanguageFromUrl(activeTab.url);

        tabInfo = {
          url: activeTab.url,
          currentEnvironment: currentEnv,
          currentLanguage: currentLang,
          availableLanguages: [],
        };
        setCurrentTab(tabInfo);

        // Async non-blocking language detection from content script
        if (activeTab.id && extensionConfig.autoDetectLanguages !== false) {
          browser.tabs.sendMessage(activeTab.id, { action: 'getLanguages' })
            .then((response: any) => {
              if (response?.languages?.length) {
                setCurrentTab(prev => prev ? { ...prev, availableLanguages: response.languages } : prev);
              }
            })
            .catch(() => {});
        }

        // Async non-blocking history loading via HistoryService (only when bookmarks feature is enabled)
        if (currentEnv && extensionConfig.bookmarksEnabled) {
          HistoryService.hasPermission()
            .then(hasPerm => {
              setHasHistoryPermission(hasPerm);
              if (hasPerm) {
                return HistoryService.loadProjectHistory(extensionConfig.environments, currentEnv.projectId)
                  .then(setVisitedPages);
              }
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      // Unblock immediately on frame 1
      setLoading(false);
    }
  };


  const addToRecents = useCallback(async (envId: string, currentConfig: ExtensionConfig) => {
    const current = currentConfig.recentEnvironmentIds || [];
    const updated = [envId, ...current.filter(id => id !== envId)].slice(0, MAX_RECENTS);
    const newConfig = { ...currentConfig, recentEnvironmentIds: updated };
    setConfig(newConfig);
    await ExtensionStorage.saveConfig(newConfig);
  }, []);

  const handleToggleFavoritePage = useCallback(async (page: VisitedPage) => {
    if (!config) return;
    let pathname: string;
    try { pathname = new URL(page.url).pathname; } catch { return; }
    const favorites = config.favorites || [];
    const exists = favorites.some(f => f.key === pathname);
    const updated: FavoritePage[] = exists
      ? favorites.filter(f => f.key !== pathname)
      : [...favorites, { key: pathname, url: page.url, title: page.title, projectId: page.projectId, language: page.language, addedAt: Date.now() }];
    const newConfig = { ...config, favorites: updated };
    setConfig(newConfig);
    await ExtensionStorage.saveConfig(newConfig);
  }, [config]);

  const handleRemoveFavorite = useCallback(async (key: string) => {
    if (!config) return;
    const favorites = (config.favorites || []).filter(f => f.key !== key);
    const newConfig = { ...config, favorites };
    setConfig(newConfig);
    await ExtensionStorage.saveConfig(newConfig);
  }, [config]);

  const handleFavoriteCurrentPage = useCallback(async () => {
    if (!currentTab?.url || !currentTab?.currentEnvironment) return;
    try {
      const u = new URL(currentTab.url);
      const pathname = u.pathname;
      const existing = visitedPages.find(p => { try { return new URL(p.url).pathname === pathname; } catch { return false; } });
      const page: VisitedPage = {
        key: u.hostname + u.pathname,
        url: currentTab.url,
        title: existing?.title || u.pathname,
        projectId: currentTab.currentEnvironment.projectId,
        language: existing?.language ?? URLUtils.extractLanguageFromUrl(currentTab.url),
        visitCount: existing?.visitCount || 1,
        lastVisited: existing?.lastVisited || Date.now(),
      };
      await handleToggleFavoritePage(page);
    } catch { /* skip invalid URLs */ }
  }, [currentTab, visitedPages, handleToggleFavoritePage]);

  const handleEnvironmentSwitch = useCallback(async (targetEnv: Environment) => {
    if (!currentTab) return;

    try {
      const newUrl = URLUtils.switchEnvironment(
        currentTab.url,
        targetEnv,
        currentTab.currentEnvironment
      );

      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        await browser.tabs.update(tabs[0].id, { url: newUrl });
        await ExtensionStorage.setCurrentEnvironment(targetEnv.id);
      }
      if (config) await addToRecents(targetEnv.id, config);
    } catch (error) {
      console.error('Error switching environment:', error);
    }
  }, [currentTab, config, addToRecents]);

  const handleEnvironmentSwitchNewTab = useCallback(async (targetEnv: Environment) => {
    if (!currentTab) return;

    try {
      const newUrl = URLUtils.switchEnvironment(
        currentTab.url,
        targetEnv,
        currentTab.currentEnvironment
      );

      await browser.tabs.create({ url: newUrl });
      if (config) await addToRecents(targetEnv.id, config);
    } catch (error) {
      console.error('Error opening environment in new tab:', error);
    }
  }, [currentTab, config, addToRecents]);

  const handleLanguageSwitch = useCallback(async (language: LanguageOption) => {
    if (!currentTab) return;

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        await browser.tabs.update(tabs[0].id, { url: language.url });
      }
    } catch (error) {
      console.error('Error switching language:', error);
    }
  }, [currentTab]);

  const handlePageNavigate = useCallback(async (url: string) => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        await browser.tabs.update(tabs[0].id, { url });
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
    }
  }, []);

  const handlePageNavigateNewTab = useCallback(async (url: string) => {
    try {
      await browser.tabs.create({ url });
    } catch (error) {
      console.error('Error opening page in new tab:', error);
    }
  }, []);

  const handleRequestHistoryPermission = useCallback(async () => {
    try {
      const granted = await HistoryService.requestPermission();
      setHasHistoryPermission(granted);
      if (granted && currentTab?.currentEnvironment && config?.bookmarksEnabled) {
        const pages = await HistoryService.loadProjectHistory(
          config.environments,
          currentTab.currentEnvironment.projectId
        );
        setVisitedPages(pages);
      }
    } catch {
      // silently handle
    }
  }, [currentTab, config]);

  const handleSettingsChange = () => {
    navigate('/');
  };

  const handleStartSetup = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-background text-foreground gap-4">
        <div className="size-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <Routes>
        <Route
          path="/setup"
          element={<SetupWelcome onStartSetup={handleStartSetup} />}
        />

        <Route
          path="/settings/*"
          element={
            <SettingsView
              isConfigured={isConfigured}
              onSettingsChange={handleSettingsChange}
            />
          }
        />

        <Route
          path="/"
          element={
            <MainView
              config={config}
              currentTab={currentTab}
              isConfigured={isConfigured}
              visitedPages={visitedPages}
              favorites={config?.favorites || []}
              healthMap={config?.healthChecksEnabled === false ? undefined : healthMap}
              hasHistoryPermission={hasHistoryPermission}
              onRequestHistoryPermission={handleRequestHistoryPermission}
              onEnvironmentSwitch={handleEnvironmentSwitch}
              onEnvironmentSwitchNewTab={handleEnvironmentSwitchNewTab}
              onLanguageSwitch={handleLanguageSwitch}
              onPageNavigate={handlePageNavigate}
              onPageNavigateNewTab={handlePageNavigateNewTab}
              onToggleFavoritePage={handleToggleFavoritePage}
              onFavoriteCurrentPage={handleFavoriteCurrentPage}
              onRemoveFavorite={handleRemoveFavorite}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
