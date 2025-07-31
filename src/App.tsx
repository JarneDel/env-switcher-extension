import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type {Environment, TabInfo, ExtensionConfig, LanguageOption} from './types';
import { ExtensionStorage } from './libs/storage';
import { URLUtils } from './libs/urlUtils';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import SetupWelcome from './components/SetupWelcome';
import './App.css';

function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null);
  const [hasErrors, setHasErrors] = useState<(() => boolean) | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadInitialData();

    // Listen for tab updates to refresh data when URL changes
    const handleTabUpdate = () => {
      loadInitialData();
    };

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onUpdated.addListener(handleTabUpdate);

      // Cleanup listener on unmount
      return () => {
        chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      };
    }
  }, []);

  useEffect(() => {
    // Navigate to setup if not configured and not already on setup/settings
    if (!loading && !isConfigured && location.pathname === '/') {
      navigate('/setup');
    }
  }, [loading, isConfigured, location.pathname, navigate]);

  const getCurrentTabInfo = async (extensionConfig: ExtensionConfig) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return null;
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.url) {
        return null;
      }

      const currentEnv = URLUtils.detectCurrentEnvironment(activeTab.url, extensionConfig.environments);
      const currentLang = URLUtils.extractLanguageFromUrl(activeTab.url);

      // Try to get available languages from content script
      let availableLanguages = [];
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id!, { action: 'getLanguages' });
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

  const loadInitialData = async () => {
    try {
      const extensionConfig = await ExtensionStorage.getConfig();
      const configured = await ExtensionStorage.isConfigured();
      
      setConfig(extensionConfig);
      setIsConfigured(configured);

      if (configured) {
        const tabInfo = await getCurrentTabInfo(extensionConfig);
        setCurrentTab(tabInfo);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnvironmentSwitch = async (targetEnv: Environment) => {
    if (!currentTab) return;

    try {
      const newUrl = URLUtils.switchEnvironment(
        currentTab.url,
        targetEnv,
        currentTab.currentEnvironment
      );

      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && typeof tabs[0].id === 'number') {
          await chrome.tabs.update(tabs[0].id, { url: newUrl });
          await ExtensionStorage.setCurrentEnvironment(targetEnv.id);
        }
      }
    } catch (error) {
      console.error('Error switching environment:', error);
    }
  };

  const handleLanguageSwitch = async (language: LanguageOption) => {
    if (!currentTab) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && typeof tabs[0].id === 'number') {
          await chrome.tabs.update(tabs[0].id, { url: language.url });
        }
      }
    } catch (error) {
      console.error('Error switching language:', error);
    }
  };

  const handleSettingsChange = async () => {
    await loadInitialData();
    navigate('/');
  };

  const handleStartSetup = () => {
    navigate('/settings');
  };

  const handleSaveReady = (saveHandlerFn: () => void, hasErrorsFn: () => boolean) => {
    setSaveHandler(() => saveHandlerFn);
    setHasErrors(() => hasErrorsFn);
  };

  if (loading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
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
              saveHandler={saveHandler}
              hasErrors={hasErrors}
              onSettingsChange={handleSettingsChange}
              onSaveReady={handleSaveReady}
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
              onEnvironmentSwitch={handleEnvironmentSwitch}
              onLanguageSwitch={handleLanguageSwitch}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
