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
  onEnvironmentSwitchNewTab: (env: Environment) => void;
  onLanguageSwitch: (lang: LanguageOption) => void;
}

export default function MainView({
  config,
  currentTab,
  isConfigured,
  onEnvironmentSwitch,
  onEnvironmentSwitchNewTab,
  onLanguageSwitch
}: MainViewProps) {
  const navigate = useNavigate();

  const currentProject = currentTab?.currentEnvironment
    ? config?.projects.find(p => p.id === currentTab.currentEnvironment!.projectId)
    : undefined;

  const title = currentProject?.name || 'Env Switcher';

  if (isConfigured) {
    return (
      <>
        <header className="app-header">
          <h1 className="app-title">
            {currentProject && (
              <span className="header-dot" style={{ backgroundColor: currentProject.color || '#6b7280' }} />
            )}
            {title}
          </h1>
          <button
            className="config-btn"
            onClick={() => navigate('/settings')}
            title="Configure environments"
          >
            <Settings size={18} />
          </button>
        </header>

        <div className="switchers">
          <EnvironmentSwitcher
            environments={config?.environments || []}
            projects={config?.projects || []}
            currentEnvironment={currentTab?.currentEnvironment}
            recentEnvironmentIds={config?.recentEnvironmentIds || []}
            onSwitch={onEnvironmentSwitch}
            onSwitchNewTab={onEnvironmentSwitchNewTab}
          />
        </div>

        <LanguageSwitcher
          languages={currentTab?.availableLanguages}
          currentLanguage={currentTab?.currentLanguage}
          onSwitch={onLanguageSwitch}
        />
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">Env Switcher</h1>
        <button
          className="config-btn"
          onClick={() => navigate('/settings')}
          title="Configure environments"
        >
          <Settings size={18} />
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

