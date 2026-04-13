import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, AlertTriangle, Star, Keyboard, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { cn, capitalize } from '../lib/utils';
import type { Environment, TabInfo, ExtensionConfig, LanguageOption, VisitedPage, FavoritePage } from '@/types';
import EnvironmentSwitcher from './EnvironmentSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import PageShortcuts from './PageShortcuts';
import FavoritesView from './FavoritesView';import TabStrip, { type TabDef } from './TabStrip';
interface MainViewProps {
  config: ExtensionConfig | null;
  currentTab: TabInfo | null;
  isConfigured: boolean;
  visitedPages: VisitedPage[];
  favorites: FavoritePage[];
  onEnvironmentSwitch: (env: Environment) => void;
  onEnvironmentSwitchNewTab: (env: Environment) => void;
  onLanguageSwitch: (lang: LanguageOption) => void;
  onPageNavigate: (url: string) => void;
  onPageNavigateNewTab: (url: string) => void;
  onToggleFavoritePage: (page: VisitedPage) => void;
  onFavoriteCurrentPage: () => void;
  onRemoveFavorite: (key: string) => void;
}

export default function MainView({
  config,
  currentTab,
  isConfigured,
  visitedPages,
  favorites,
  onEnvironmentSwitch,
  onEnvironmentSwitchNewTab,
  onLanguageSwitch,
  onPageNavigate,
  onPageNavigateNewTab,
  onToggleFavoritePage,
  onFavoriteCurrentPage,
  onRemoveFavorite,
}: MainViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'envs' | 'pages' | 'favorites'>('envs');
  const [langOpen, setLangOpen] = useState(false);
  const [focusEnvSearch, setFocusEnvSearch] = useState(0);
  const [focusPagesSearch, setFocusPagesSearch] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isConfigured) return;
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable;

      // Ctrl+B: favourite current page — works even inside inputs
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'b') {
        e.preventDefault();
        onFavoriteCurrentPage();
        return;
      }

      // All other single-key shortcuts: skip when any input is focused or modifier keys are held
      if (inInput || e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape closes help overlay first
      if (e.key === 'Escape' && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          if (activeTab === 'envs') setFocusEnvSearch(n => n + 1);
          else if (activeTab === 'pages') setFocusPagesSearch(n => n + 1);
          break;
        case 'e':
          e.preventDefault();
          // Only switch tab — use '/' to focus search
          setActiveTab('envs');
          break;
        case 'p':
          e.preventDefault();
          // Only switch tab — use '/' to focus search
          setActiveTab('pages');
          break;
        case 'b':
          e.preventDefault();
          setActiveTab('favorites');
          break;
        case 'l':
          e.preventDefault();
          setLangOpen(true);
          break;
        case 's':
          e.preventDefault();
          navigate('/settings');
          break;
        case '?':
          e.preventDefault();
          setShowHelp(h => !h);
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeTab, isConfigured, navigate, onFavoriteCurrentPage, showHelp]);

  const currentProject = currentTab?.currentEnvironment
    ? config?.projects.find(p => p.id === currentTab.currentEnvironment!.projectId)
    : undefined;

  const title = currentProject ? capitalize(currentProject.name) : 'Env Switcher';

  const currentEnvOrigin = useMemo(() => {
    try { return new URL(currentTab?.currentEnvironment?.baseUrl || '').origin; } catch { return undefined; }
  }, [currentTab?.currentEnvironment?.baseUrl]);

  const scopedEnvironments = useMemo(() => {
    const all = config?.environments || [];
    if (!currentTab?.currentEnvironment) return all;
    return all.filter(e => e.projectId === currentTab.currentEnvironment!.projectId);
  }, [config?.environments, currentTab?.currentEnvironment]);

  const scopedRecentEnvironmentIds = useMemo(() => {
    const all = config?.recentEnvironmentIds || [];
    if (!currentTab?.currentEnvironment) return all;
    const projectId = currentTab.currentEnvironment.projectId;
    return all.filter(id => config?.environments.find(e => e.id === id)?.projectId === projectId);
  }, [config?.recentEnvironmentIds, config?.environments, currentTab?.currentEnvironment]);

  const projectPages = visitedPages
    .filter(p => !currentTab?.currentLanguage || p.language === currentTab.currentLanguage)
    .slice(0, 20);

  const favoriteKeys = useMemo(() => new Set(favorites.map(f => f.key)), [favorites]);

  const isCurrentPageFavorited = useMemo(() => {
    if (!currentTab?.url) return false;
    try {
      return favoriteKeys.has(new URL(currentTab.url).pathname);
    } catch { return false; }
  }, [favoriteKeys, currentTab?.url]);

  if (isConfigured) {
    return (
      <div className="relative flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold text-card-foreground flex items-center gap-2">
            {currentProject && (
              <span
                className="size-2.25 rounded-full shrink-0"
                style={{ backgroundColor: currentProject.color || '#6b7280' }}
              />
            )}
            {title}
          </h1>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(h => !h)}
              title="Keyboard shortcuts (?)"
              className={cn('text-muted-foreground', showHelp && 'text-foreground bg-accent')}
            >
              <Keyboard size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              title="Configure environments"
              className="text-muted-foreground"
            >
              <Settings size={18} />
            </Button>
          </div>
        </header>

        <TabStrip
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof activeTab)}
          tabs={[
            { id: 'envs', label: 'Environments' },
            { id: 'pages', label: 'Pages' },
            {
              id: 'favorites',
              label: 'Favorites',
              icon: <Star size={12} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />,
              badge: favorites.length,
              activeColorClass: 'text-yellow-400 border-yellow-400',
              activeBadgeClass: 'bg-yellow-400/20 text-yellow-400',
            },
          ] satisfies TabDef[]}
        />

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {activeTab === 'envs' ? (
            <>
              <EnvironmentSwitcher
                environments={scopedEnvironments}
                projects={config?.projects || []}
                currentEnvironment={currentTab?.currentEnvironment}
                recentEnvironmentIds={scopedRecentEnvironmentIds}
                onSwitch={onEnvironmentSwitch}
                onSwitchNewTab={onEnvironmentSwitchNewTab}
                focusSearchTrigger={focusEnvSearch}
              />
              {!config?.hasVisitedDisplaySettings && (
                <button
                  onClick={() => navigate('/settings/display')}
                  className="flex items-start gap-2.5 mx-3 mb-3 px-3 py-2.5 rounded-md border border-primary/30 bg-primary/5 text-left hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal size={14} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <p className="text-[0.8125rem] font-medium text-foreground leading-snug">
                      Customize display settings
                    </p>
                    <p className="text-[0.75rem] text-muted-foreground mt-0.5 leading-snug">
                      Enable favicon borders, page borders, and more visual environment indicators.
                    </p>
                  </div>
                </button>
              )}
            </>
          ) : activeTab === 'pages' ? (
            <PageShortcuts
              pages={projectPages}
              favoriteKeys={favoriteKeys}
              currentEnvironmentOrigin={currentEnvOrigin}
              onNavigate={onPageNavigate}
              onNavigateNewTab={onPageNavigateNewTab}
              onToggleFavorite={onToggleFavoritePage}
              focusSearchTrigger={focusPagesSearch}
            />
          ) : (
            <FavoritesView
              favorites={favorites}
              visitedPages={visitedPages}
              currentEnvironment={currentTab?.currentEnvironment}
              currentLanguage={currentTab?.currentLanguage}
              onNavigate={onPageNavigate}
              onNavigateNewTab={onPageNavigateNewTab}
              onRemove={onRemoveFavorite}
            />
          )}
        </div>

        <LanguageSwitcher
          languages={currentTab?.availableLanguages}
          currentLanguage={currentTab?.currentLanguage}
          onSwitch={onLanguageSwitch}
          isOpen={langOpen}
          onOpenChange={setLangOpen}
        />

        {/* Keyboard shortcuts overlay */}
        {showHelp && (
          <div
            className="absolute inset-0 z-20 flex flex-col bg-background/97 overflow-y-auto"
            onClick={() => setShowHelp(false)}
          >
            <div className="px-5 py-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Keyboard size={14} className="text-muted-foreground" />
                Keyboard Shortcuts
              </h2>

              {([
                { label: 'Navigation', rows: [
                  { keys: ['e'], desc: 'Environments tab' },
                  { keys: ['p'], desc: 'Pages tab' },
                  { keys: ['b'], desc: 'Favorites tab' },
                  { keys: ['s'], desc: 'Settings' },
                  { keys: ['?'], desc: 'Toggle this guide' },
                ]},
                { label: 'Search', rows: [
                  { keys: ['/'], desc: 'Focus search in current tab' },
                  { keys: ['Esc'], desc: 'Clear search / blur input' },
                ]},
                { label: 'Favorites', rows: [
                  { keys: ['Ctrl', 'B'], desc: 'Favourite current page' },
                ]},
                { label: 'Language', rows: [
                  { keys: ['l'], desc: 'Open language selector' },
                ]},
                { label: 'From webpage', rows: [
                  { keys: ['Ctrl', 'E'], desc: 'Open this popup' },
                ]},
              ] as { label: string; rows: { keys: string[]; desc: string }[] }[]).map(section => (
                <div key={section.label} className="mb-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {section.label}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {section.rows.map(row => (
                      <div key={row.desc} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{row.desc}</span>
                        <div className="flex items-center gap-1">
                          {row.keys.map((k, i) => (
                            <span key={i} className="text-[0.7rem] font-mono font-medium bg-card border border-border rounded px-1.5 py-0.5 text-foreground leading-none">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-[0.65rem] text-muted-foreground text-center mt-1">
                Press <span className="font-mono">?</span> or <span className="font-mono">Esc</span> to close
              </p>
            </div>
          </div>
        )}

        {/* Favorite current page button — bottom-right chin */}
        {currentTab?.url && currentTab?.currentEnvironment && (
          <button
            onClick={onFavoriteCurrentPage}
            title={isCurrentPageFavorited ? 'Remove current page from favorites' : 'Add current page to favorites'}
            className={cn(
              'absolute bottom-2 right-2 z-10 flex items-center justify-center size-7 rounded-full',
              'border transition-colors duration-150',
              isCurrentPageFavorited
                ? 'bg-yellow-400/10 border-yellow-400/60 text-yellow-400 hover:bg-yellow-400/20'
                : 'bg-card border-border text-slate-500 hover:text-yellow-400 hover:border-yellow-400/60'
            )}
          >
            <Star size={13} fill={isCurrentPageFavorited ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
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

