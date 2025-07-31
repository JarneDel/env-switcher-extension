import { useNavigate } from 'react-router-dom';
import { Settings, AlertTriangle } from 'lucide-react';
import type { Environment, TabInfo, ExtensionConfig, LanguageOption } from '../types';
import EnvironmentSwitcher from './EnvironmentSwitcher';
import LanguageSwitcher from './LanguageSwitcher';

interface MainViewProps {
  config: ExtensionConfig | null;
  currentTab: TabInfo | null;
  isConfigured: boolean;
  onEnvironmentSwitch: (env: Environment) => void;
  onLanguageSwitch: (lang: LanguageOption) => void;
}

export default function MainView({
  config,
  currentTab,
  isConfigured,
  onEnvironmentSwitch,
  onLanguageSwitch
}: MainViewProps) {
  const navigate = useNavigate();

  if (isConfigured) {
    return (
      <>
        <header className="app-header">
          <h1>Environment Switcher</h1>
          <button
            className="config-btn"
            onClick={() => navigate('/settings')}
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
            onSwitch={onEnvironmentSwitch}
          />

          {(currentTab?.availableLanguages?.length ?? 0) > 0 && (
            <LanguageSwitcher
              languages={currentTab?.availableLanguages}
              currentLanguage={currentTab?.currentLanguage}
              onSwitch={onLanguageSwitch}
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
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1>Environment Switcher</h1>
        <button
          className="config-btn"
          onClick={() => navigate('/settings')}
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
          onClick={() => navigate('/settings')}
          className="setup-btn"
        >
          Configure Now
        </button>
      </div>
    </>
  );
}

