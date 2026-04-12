import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Environment, Project } from '../types';

interface Props {
  environments: Environment[];
  projects: Project[];
  currentEnvironment?: Environment;
  recentEnvironmentIds: string[];
  onSwitch: (env: Environment) => void;
  onSwitchNewTab: (env: Environment) => void;
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let ni = 0;
  for (let hi = 0; hi < h.length && ni < n.length; hi++) {
    if (h[hi] === n[ni]) ni++;
  }
  return ni === n.length;
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
}) => {
  const [search, setSearch] = useState('');

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
    const q = search.trim();
    const matched = environments.filter(e =>
      fuzzyMatch(q, e.name) || fuzzyMatch(q, getHostname(e.baseUrl)) || fuzzyMatch(q, e.baseUrl)
    );
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
      className={`env-row${isCurrent ? ' active' : ''}`}
      onClick={() => onSwitch(env)}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onSwitchNewTab(env); } }}
      title={`${env.name} · ${env.baseUrl}${isCurrent ? ' (current)' : ''} · Middle-click: open in new tab`}
    >
      <span className="env-dot" style={{ backgroundColor: env.color }} />
      <span className="env-row-name">{env.name}</span>
      <span className="env-row-host">{getHostname(env.baseUrl)}</span>
    </button>
  );

  return (
    <div className="env-switcher">
      <div className="env-search-row">
        <Search size={13} className="env-search-icon" />
        <input
          className="env-search-input"
          placeholder="Search environments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          title="Enter: switch · Shift+Enter: open in new tab (when 1 result)"
        />
      </div>

      <div className="env-list">
        {searchGroups ? (
          searchGroups.size === 0 ? (
            <p className="env-empty">No environments match</p>
          ) : (
            Array.from(searchGroups.entries()).map(([projectId, envs]) => {
              const proj = projectMap.get(projectId);
              return (
                <div key={projectId} className="env-group">
                  <div className="env-group-label" style={{ color: proj?.color || '#94a3b8' }}>
                    {proj?.name || 'Unknown'}
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
              <div className="env-group">
                <div className="env-group-label recent">RECENT</div>
                {recentEnvs.map(env => (
                  <EnvRow key={env.id} env={env} isCurrent={false} />
                ))}
              </div>
            )}
            {currentProjectEnvs.length > 0 ? (
              <div className="env-group">
                {currentProject && (
                  <div className="env-group-label" style={{ color: currentProject.color || '#94a3b8' }}>
                    {currentProject.name}
                  </div>
                )}
                {currentProjectEnvs.map(env => (
                  <EnvRow key={env.id} env={env} isCurrent={currentEnvironment?.id === env.id} />
                ))}
              </div>
            ) : (
              <p className="env-empty">
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
