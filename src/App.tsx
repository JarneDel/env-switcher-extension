import { useState, useEffect } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import type {Environment, TabInfo, ExtensionConfig, LanguageOption} from './types';
import { ExtensionStorage } from './libs/storage';
import { URLUtils } from './libs/urlUtils';
import EnvironmentSwitcher from './components/EnvironmentSwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';
import SettingsPanel from './components/SettingsPanel';
import SetupWelcome from './components/SetupWelcome';
import './App.css';

function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'setup'>('main');
  const [isConfigured, setIsConfigured] = useState(false);

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

  const loadInitialData = async () => {
    try {
      // Load configuration
      const extensionConfig = await ExtensionStorage.getConfig();
      const configured = await ExtensionStorage.isConfigured();
      
      setConfig(extensionConfig);
      setIsConfigured(configured);

      if (!configured) {
        setCurrentView('setup');
        setLoading(false);
        return;
      }

      // Get current tab info
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (Array.isArray(tabs) && tabs[0]) {
            const currentEnv = URLUtils.detectCurrentEnvironment(tabs[0].url!, extensionConfig.environments);
            const currentLang = URLUtils.extractLanguageFromUrl(tabs[0].url!);

            // Get available languages from content script
            try {
              const response = await chrome.tabs.sendMessage(tabs[0].id!, { action: 'getLanguages' });
              setCurrentTab({
                url: tabs[0].url!,
                currentEnvironment: currentEnv,
                currentLanguage: currentLang,
                availableLanguages: response?.languages || []
              });
            } catch (err) {
              setCurrentTab({
                url: tabs[0].url!,
                currentEnvironment: currentEnv,
                currentLanguage: currentLang,
                availableLanguages: []
              });
            }
          } else {
            setCurrentTab(null);
          }
        } catch (err) {
          setCurrentTab(null);
        }
      } else {
        setCurrentTab(null);
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
    setCurrentView('main');
  };

  const handleStartSetup = () => {
    setCurrentView('settings');
  };

  if (loading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (currentView === 'setup') {
    return (
      <div className="app">
        <SetupWelcome onStartSetup={handleStartSetup} />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Settings</h1>
          <button 
            className="back-btn"
            onClick={() => setCurrentView(isConfigured ? 'main' : 'setup')}
            title="Go back"
          >
            ←
          </button>
        </header>
        <SettingsPanel onSettingsChange={handleSettingsChange} />
      </div>
    );
  }

  // No environments configured state
  if (!isConfigured && currentView === 'main') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Environment Switcher</h1>
          <button 
            className="config-btn"
            onClick={() => setCurrentView('settings')}
            title="Configure environments"
          >
            <Settings size={20} />
          </button>
        </header>
        <div className="no-config">
          <div className="no-config-icon"><AlertTriangle size={40} /></div>
          <h3>No Environments Configured</h3>
          <p>Please configure your environments to start switching.</p>
          <button 
            onClick={() => setCurrentView('settings')}
            className="setup-btn"
          >
            Configure Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Environment Switcher</h1>
        <button 
          className="config-btn"
          onClick={() => setCurrentView('settings')}
          title="Configure environments"
        >
          <Settings size={20} />
        </button>
      </header>

      <div className="switchers">
        <EnvironmentSwitcher
          environments={config?.environments || []}
          projects={config?.projects || []}
          currentEnvironment={currentTab?.currentEnvironment}
          onSwitch={handleEnvironmentSwitch}
        />

        {(currentTab?.availableLanguages?.length ?? 0) > 0 && (
          <LanguageSwitcher
            languages={currentTab?.availableLanguages}
            currentLanguage={currentTab?.currentLanguage}
            onSwitch={handleLanguageSwitch}
          />
        )}

        {currentTab && (
          <div className="current-info">
            <div className="current-url">
              <strong>Current:</strong> {new URL(currentTab.url).hostname}
            </div>
            {currentTab.currentLanguage && (
              <div className="current-language">
                <strong>Language:</strong> {currentTab.currentLanguage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
