import React, { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { cn, capitalize } from '../lib/utils';
import type { Environment, Project } from '@/types';

interface Props {
  environments: Environment[];
  projects: Project[];
  currentEnvironment?: Environment;
  recentEnvironmentIds: string[];
  onSwitch: (env: Environment) => void;
  onSwitchNewTab: (env: Environment) => void;
  focusSearchTrigger?: number;
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

const EnvironmentSwitcher: React.FC<Props> = ({
  environments,
  projects,
  currentEnvironment,
  recentEnvironmentIds,
  onSwitch,
  onSwitchNewTab,
  focusSearchTrigger,
}) => {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSearchTrigger) searchRef.current?.focus();
  }, [focusSearchTrigger]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const currentProject = currentEnvironment ? projectMap.get(currentEnvironment.projectId) : undefined;

  const currentProjectEnvs = currentEnvironment
    ? environments.filter(e => e.projectId === currentEnvironment.projectId)
    : [];

  const recentEnvs = useMemo(() => {
    return recentEnvironmentIds
      .map(id => environments.find(e => e.id === id))
      .filter((e): e is Environment => !!e)
      .filter(e => e.id !== currentEnvironment?.id);
  }, [recentEnvironmentIds, environments, currentEnvironment]);

  const searchGroups = useMemo(() => {
    if (!search.trim()) return null;
    const fuse = new Fuse(environments, {
      keys: ['name', { name: 'hostname', getFn: (e: Environment) => getHostname(e.baseUrl) }, 'baseUrl'],
      threshold: 0.4,
      includeScore: true,
    });
    const matched = fuse.search(search.trim()).map(r => r.item);
    const groups = new Map<string, Environment[]>();
    for (const env of matched) {
      if (!groups.has(env.projectId)) groups.set(env.projectId, []);
      groups.get(env.projectId)!.push(env);
    }
    return groups;
  }, [search, environments]);

  const allMatchedEnvs = useMemo(() => {
    if (!searchGroups) return [];
    const result: Environment[] = [];
    for (const envs of searchGroups.values()) result.push(...envs);
    return result;
  }, [searchGroups]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (search) setSearch('');
      else (e.target as HTMLInputElement).blur();
      return;
    }
    if (e.key !== 'Enter' || allMatchedEnvs.length !== 1) return;
    e.preventDefault();
    if (e.shiftKey) {
      onSwitchNewTab(allMatchedEnvs[0]);
    } else {
      onSwitch(allMatchedEnvs[0]);
    }
    setSearch('');
  };

  if (environments.length === 0) return null;

  const EnvRow = ({ env, isCurrent }: { env: Environment; isCurrent: boolean }) => (
    <button
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 w-full text-left border-none cursor-pointer transition-colors duration-[0.12s] text-sm',
        isCurrent
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
      <span className={cn(
        'text-xs shrink-0 max-w-32.5 overflow-hidden text-ellipsis whitespace-nowrap',
        isCurrent ? 'text-muted-foreground' : 'text-slate-500'
      )}>
        {getHostname(env.baseUrl)}
      </span>
    </button>
  );

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
          title="Enter: switch · Shift+Enter: open in new tab (when 1 result)"
        />
      </div>

      {/* list */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {searchGroups ? (
          searchGroups.size === 0 ? (
            <p className="text-slate-500 text-[0.8125rem] p-4 text-center">No environments match</p>
          ) : (
            Array.from(searchGroups.entries()).map(([projectId, envs]) => {
              const proj = projectMap.get(projectId);
              return (
                <div key={projectId} className="flex flex-col">
                  <div
                    className="text-[0.6875rem] font-semibold tracking-[0.07em] uppercase px-4 pt-2 pb-1"
                    style={{ color: proj?.color || '#94a3b8' }}
                  >
                    {capitalize(proj?.name || 'Unknown')}
                  </div>
                  {envs.map(env => (
                    <EnvRow key={env.id} env={env} isCurrent={currentEnvironment?.id === env.id} />
                  ))}
                </div>
              );
            })
          )
        ) : (
          <>
            {recentEnvs.length > 0 && (
              <div className="flex flex-col">
                <div className="text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-slate-500 px-4 pt-2 pb-1">
                  RECENT
                </div>
                {recentEnvs.map(env => (
                  <EnvRow key={env.id} env={env} isCurrent={false} />
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
                  <EnvRow key={env.id} env={env} isCurrent={currentEnvironment?.id === env.id} />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-[0.8125rem] p-4 text-center">
                {currentEnvironment
                  ? 'No environments in this project'
                  : 'Not on a configured site'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;
