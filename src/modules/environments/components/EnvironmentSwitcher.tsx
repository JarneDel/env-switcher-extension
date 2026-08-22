import React, { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search, Settings } from 'lucide-react';
import { useNavigate } from '@/shared/router';
import { cn, capitalize } from '@/shared/utils';
import type { Environment, HealthEntry, HealthMap, Project } from '@/types';

interface Props {
  environments: Environment[];
  projects: Project[];
  currentEnvironment?: Environment;
  recentEnvironmentIds: string[];
  healthMap?: HealthMap;
  onSwitch: (env: Environment) => void;
  onSwitchNewTab: (env: Environment) => void;
  focusSearchTrigger?: number;
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function formatAge(ms: number): string {
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function healthTitle(entry: HealthEntry): string {
  const status = entry.status === 'up' ? 'Reachable' : 'Unreachable';
  const code = entry.statusCode !== undefined ? ` · HTTP ${entry.statusCode}` : '';
  const latency = entry.latencyMs !== undefined ? ` · ${entry.latencyMs} ms` : '';
  return `${status}${code}${latency} · checked ${formatAge(Date.now() - entry.lastChecked)}`;
}

interface EnvRowProps {
  env: Environment;
  isCurrent: boolean;
  isHighlighted: boolean;
  healthMap?: HealthMap;
  onSwitch: (env: Environment) => void;
  onSwitchNewTab: (env: Environment) => void;
}

/**
 * Declared at module scope on purpose: defining it inside EnvironmentSwitcher
 * made React see a new component type on every render, so every row was
 * unmounted and rebuilt on each keystroke instead of being diffed.
 */
const EnvRow: React.FC<EnvRowProps> = ({ env, isCurrent, isHighlighted, healthMap, onSwitch, onSwitchNewTab }) => (
  <button
    data-env-row={env.id}
    className={cn(
      'flex items-center gap-2.5 px-4 py-2 w-full text-left border-none cursor-pointer transition-colors duration-[0.12s] text-sm',
      isCurrent || isHighlighted
        ? 'bg-card text-card-foreground'
        : 'bg-transparent text-slate-300 hover:bg-card hover:text-card-foreground'
    )}
    onClick={() => onSwitch(env)}
    onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onSwitchNewTab(env); } }}
    title={`${capitalize(env.name)} · ${env.baseUrl}${isCurrent ? ' (current)' : ''} · Middle-click: open in new tab`}
  >
    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
    <span className={cn('text-sm flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap', isCurrent && 'font-semibold')}>
      {capitalize(env.name)}
    </span>
    {healthMap?.[env.id] && (
      <span
        className={cn(
          'size-1.5 rounded-full shrink-0',
          healthMap[env.id].status === 'up' ? 'bg-emerald-500' : 'bg-red-500'
        )}
        title={healthTitle(healthMap[env.id])}
      />
    )}
    <span className={cn(
      'text-xs shrink-0 max-w-32.5 overflow-hidden text-ellipsis whitespace-nowrap',
      isCurrent ? 'text-muted-foreground' : 'text-slate-500'
    )}>
      {getHostname(env.baseUrl)}
    </span>
  </button>
);

const EnvironmentSwitcher: React.FC<Props> = ({
  environments,
  projects,
  currentEnvironment,
  recentEnvironmentIds,
  healthMap,
  onSwitch,
  onSwitchNewTab,
  focusSearchTrigger,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusSearchTrigger) searchRef.current?.focus();
  }, [focusSearchTrigger]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const currentProject = currentEnvironment ? projectMap.get(currentEnvironment.projectId) : undefined;

  const currentProjectEnvs = useMemo(() => {
    if (!currentEnvironment) return [];
    return environments.filter(e => e.projectId === currentEnvironment.projectId);
  }, [environments, currentEnvironment]);

  const recentEnvs = useMemo(() => {
    return recentEnvironmentIds
      .map(id => environments.find(e => e.id === id))
      .filter((e): e is Environment => !!e)
      .filter(e => e.id !== currentEnvironment?.id);
  }, [recentEnvironmentIds, environments, currentEnvironment]);

  // The index depends only on the environments, so it is built once per list
  // change rather than being rebuilt on every keystroke.
  const fuse = useMemo(
    () => new Fuse(currentProjectEnvs, {
      keys: ['name', { name: 'hostname', getFn: (e: Environment) => getHostname(e.baseUrl) }, 'baseUrl'],
      threshold: 0.4,
      includeScore: true,
    }),
    [currentProjectEnvs]
  );

  const searchMatches = useMemo(() => {
    if (!search.trim()) return null;
    if (currentProjectEnvs.length === 0) return [];
    return fuse.search(search.trim()).map(r => r.item);
  }, [search, currentProjectEnvs, fuse]);

  const defaultEnvs = useMemo(
    () => [...recentEnvs, ...currentProjectEnvs],
    [recentEnvs, currentProjectEnvs]
  );
  const navigableEnvs = searchMatches !== null ? searchMatches : defaultEnvs;
  const activeIndex = navigableEnvs.length
    ? Math.min(highlightedIndex, navigableEnvs.length - 1)
    : 0;
  const highlightedEnv = navigableEnvs[activeIndex];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!highlightedEnv) return;
    listRef.current
      ?.querySelector(`[data-env-row="${highlightedEnv.id}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, navigableEnvs]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSearch('');
      (e.target as HTMLInputElement).blur();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const count = navigableEnvs.length;
      if (!count) return;
      setHighlightedIndex(i =>
        e.key === 'ArrowDown' ? (i + 1) % count : (i - 1 + count) % count
      );
      return;
    }
    if (e.key !== 'Enter') return;
    
    if (!navigableEnvs.length) {
      if (search.toLowerCase().includes('setting') || search.toLowerCase().includes('config')) {
        e.preventDefault();
        navigate('/settings');
      }
      return;
    }

    e.preventDefault();
    const env = navigableEnvs[activeIndex];
    if (!env) return;
    if (e.shiftKey) {
      onSwitchNewTab(env);
    } else {
      onSwitch(env);
    }
    setSearch('');
    setHighlightedIndex(0);
  };

  if (environments.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      {/* search bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-card shrink-0">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          ref={searchRef}
          className="bg-transparent border-none outline-none text-foreground text-sm w-full p-0 placeholder:text-slate-500"
          placeholder="Search environments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          title="↑↓: navigate · Enter: switch · Shift+Enter: open in new tab"
        />
      </div>

      {/* list */}
      <div ref={listRef} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {searchMatches !== null ? (
          searchMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 gap-2 text-center">
              <p className="text-muted-foreground text-sm">No environments match &ldquo;{search}&rdquo;</p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20 mt-1"
              >
                <Settings size={13} />
                Configure in Settings →
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {currentProject && (
                <div
                  className="text-[0.6875rem] font-semibold tracking-[0.07em] uppercase px-4 pt-2 pb-1"
                  style={{ color: currentProject.color || '#94a3b8' }}
                >
                  {capitalize(currentProject.name)}
                </div>
              )}
              {searchMatches.map(env => (
                <EnvRow
                  key={env.id}
                  env={env}
                  healthMap={healthMap}
                  onSwitch={onSwitch}
                  onSwitchNewTab={onSwitchNewTab}
                  isCurrent={currentEnvironment?.id === env.id}
                  isHighlighted={highlightedEnv?.id === env.id}
                />
              ))}
            </div>
          )
        ) : (
          <>
            {recentEnvs.length > 0 && (
              <div className="flex flex-col">
                <div className="text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-slate-500 px-4 pt-2 pb-1">
                  RECENT
                </div>
                {recentEnvs.map(env => (
                  <EnvRow
                    key={env.id}
                    env={env}
                    healthMap={healthMap}
                    onSwitch={onSwitch}
                    onSwitchNewTab={onSwitchNewTab}
                    isCurrent={false}
                    isHighlighted={highlightedEnv?.id === env.id}
                  />
                ))}
              </div>
            )}
            {currentProjectEnvs.length > 0 ? (
              <div className="flex flex-col">
                {currentProject && (
                  <div
                    className="text-[0.6875rem] font-semibold tracking-[0.07em] uppercase px-4 pt-2 pb-1"
                    style={{ color: currentProject.color || '#94a3b8' }}
                  >
                    {capitalize(currentProject.name)}
                  </div>
                )}
                {currentProjectEnvs.map(env => (
                  <EnvRow
                    key={env.id}
                    env={env}
                    healthMap={healthMap}
                    onSwitch={onSwitch}
                    onSwitchNewTab={onSwitchNewTab}
                    isCurrent={currentEnvironment?.id === env.id}
                    isHighlighted={highlightedEnv?.id === env.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                <p className="text-muted-foreground text-sm">
                  {currentEnvironment
                    ? 'No environments in this project'
                    : 'Not on a configured site'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-primary/20 mt-1"
                >
                  <Settings size={13} />
                  Configure environments →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;
