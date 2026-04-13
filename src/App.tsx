import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type {Environment, TabInfo, ExtensionConfig, LanguageOption, VisitedPage, FavoritePage} from './types';
import { ExtensionStorage } from './libs/storage';
import { URLUtils } from './libs/urlUtils';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import SetupWelcome from './components/SetupWelcome';

function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  const [visitedPages, setVisitedPages] = useState<VisitedPage[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isInitialMount = useRef(true);

  useEffect(() => {
    loadInitialData();

    // Listen for tab updates to refresh data when URL changes
    const handleTabUpdate = () => {
      loadInitialData();
    };

    browser.tabs.onUpdated.addListener(handleTabUpdate);
    return () => {
      browser.tabs.onUpdated.removeListener(handleTabUpdate);
    };
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

  const getCurrentTabInfo = async (extensionConfig: ExtensionConfig) => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.url) {
        return null;
      }

      const currentEnv = URLUtils.detectCurrentEnvironment(activeTab.url, extensionConfig.environments);
      const currentLang = URLUtils.extractLanguageFromUrl(activeTab.url);

      // Try to get available languages from content script
      let availableLanguages = [];
      try {
        const response = await browser.tabs.sendMessage(activeTab.id!, { action: 'getLanguages' });
        availableLanguages = response?.languages || [];
      } catch {
        // Content script not available, use empty array
      }

      return {
        url: activeTab.url,
        currentEnvironment: currentEnv,
        currentLanguage: currentLang,
        availableLanguages
      };
    } catch {
      return null;
    }
  };

  const MAX_VISITED = 50;

  const loadHistoryPages = async (cfg: ExtensionConfig, projectId: string): Promise<VisitedPage[]> => {
    const projectEnvs = cfg.environments.filter(e => e.projectId === projectId);
    if (projectEnvs.length === 0) return [];

    try {
      const seen = new Set<string>();
      const allItems: VisitedPage[] = [];

      for (const env of projectEnvs) {
        const results = await browser.history.search({ text: env.baseUrl, maxResults: 200, startTime: 0 });
        for (const item of results) {
          if (!item.url || !item.url.startsWith(env.baseUrl)) continue;
          try {
            const urlObj = new URL(item.url);
            const key = urlObj.hostname + urlObj.pathname;
            if (seen.has(key)) continue;
            seen.add(key);
            allItems.push({
              key,
              url: item.url,
              title: item.title || urlObj.pathname,
              projectId,
              language: URLUtils.extractLanguageFromUrl(item.url),
              visitCount: item.visitCount || 1,
              lastVisited: item.lastVisitTime || Date.now(),
            });
          } catch {
            // skip invalid URLs
          }
        }
      }

      return allItems
        .sort((a, b) => b.visitCount - a.visitCount || b.lastVisited - a.lastVisited)
        .slice(0, MAX_VISITED);
    } catch {
      return [];
    }
  };

  const loadInitialData = async () => {
    try {
      const extensionConfig = await ExtensionStorage.getConfig();
      const configured = await ExtensionStorage.isConfigured();
      
      setConfig(extensionConfig);
      setIsConfigured(configured);

      if (configured) {
        const tabInfo = await getCurrentTabInfo(extensionConfig);
        setCurrentTab(tabInfo);

        if (tabInfo?.currentEnvironment) {
          const pages = await loadHistoryPages(extensionConfig, tabInfo.currentEnvironment.projectId);
          setVisitedPages(pages);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const MAX_RECENTS = 5;

  const addToRecents = async (envId: string, currentConfig: ExtensionConfig) => {
    const current = currentConfig.recentEnvironmentIds || [];
    const updated = [envId, ...current.filter(id => id !== envId)].slice(0, MAX_RECENTS);
    const newConfig = { ...currentConfig, recentEnvironmentIds: updated };
    setConfig(newConfig);
    await ExtensionStorage.saveConfig(newConfig);
  };

  const handleToggleFavoritePage = async (page: VisitedPage) => {
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
  };

  const handleRemoveFavorite = async (key: string) => {
    if (!config) return;
    const favorites = (config.favorites || []).filter(f => f.key !== key);
    const newConfig = { ...config, favorites };
    setConfig(newConfig);
    await ExtensionStorage.saveConfig(newConfig);
  };

  const handleFavoriteCurrentPage = async () => {
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
  };

  const handleEnvironmentSwitch = async (targetEnv: Environment) => {
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
  };

  const handleEnvironmentSwitchNewTab = async (targetEnv: Environment) => {
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
  };

  const handleLanguageSwitch = async (language: LanguageOption) => {
    if (!currentTab) return;

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        await browser.tabs.update(tabs[0].id, { url: language.url });
      }
    } catch (error) {
      console.error('Error switching language:', error);
    }
  };

  const handlePageNavigate = async (url: string) => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && typeof tabs[0].id === 'number') {
        await browser.tabs.update(tabs[0].id, { url });
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
    }
  };

  const handlePageNavigateNewTab = async (url: string) => {
    try {
      await browser.tabs.create({ url });
    } catch (error) {
      console.error('Error opening page in new tab:', error);
    }
  };

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
