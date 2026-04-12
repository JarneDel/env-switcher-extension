import { useNavigate } from 'react-router-dom';
import { Settings, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
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
        <header className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            {currentProject && (
              <span
                className="size-[9px] rounded-full shrink-0"
                style={{ backgroundColor: currentProject.color || '#6b7280' }}
              />
            )}
            {title}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            title="Configure environments"
            className="text-muted-foreground"
          >
            <Settings size={18} />
          </Button>
        </header>

        {/* env list — takes up remaining vertical space */}
        <div className="flex flex-col flex-1 overflow-y-auto">
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
      <header className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-card-foreground">Env Switcher</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          title="Configure environments"
          className="text-muted-foreground"
        >
          <Settings size={18} />
        </Button>
      </header>
      <div className="flex flex-col items-center text-center px-6 py-8">
        <div className="text-muted-foreground mb-4"><AlertTriangle size={40} /></div>
        <h3 className="text-foreground font-semibold mb-2">No Environments Configured</h3>
        <p className="text-muted-foreground text-sm mb-6">Please configure your environments to start switching.</p>
        <Button onClick={() => navigate('/settings')}>
          Configure Now
        </Button>
      </div>
    </>
  );
}

