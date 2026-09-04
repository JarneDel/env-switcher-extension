import React, { useState, useMemo } from 'react';
import { Search, Plus, Clock } from 'lucide-react';
import { Button } from '@/shared/ui';
import ProjectListItem from './ProjectListItem';
import { useConfiguration } from '../context/ConfigurationContext';

const ProjectsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRecent, setFilterRecent] = useState(false);

  const {
    editingProjects,
    addProject,
    validateProject,
    validateEnvironment,
    getEnvironmentsByProject,
    currentProjectId,
    recentEnvironmentIds,
  } = useConfiguration();

  // Helper to compute a project's best recency index based on its environments
  const getProjectRecencyScore = (projectId: string): number => {
    const envs = getEnvironmentsByProject(projectId);
    if (envs.length === 0 || !recentEnvironmentIds || recentEnvironmentIds.length === 0) {
      return Infinity;
    }

    let bestIndex = Infinity;
    for (const env of envs) {
      const idx = recentEnvironmentIds.indexOf(env.id);
      if (idx !== -1 && idx < bestIndex) {
        bestIndex = idx;
      }
    }
    return bestIndex;
  };

  const recentProjectsCount = useMemo(() => {
    return editingProjects.filter(
      p => p.id === currentProjectId || getProjectRecencyScore(p.id) < Infinity
    ).length;
  }, [editingProjects, currentProjectId, recentEnvironmentIds]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = editingProjects;

    if (query) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query)
      );
    }

    if (filterRecent) {
      result = result.filter(p =>
        p.id === currentProjectId || getProjectRecencyScore(p.id) < Infinity
      );
    }

    return result;
  }, [editingProjects, searchQuery, filterRecent, currentProjectId, recentEnvironmentIds]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      // Current project always first
      if (a.id === currentProjectId) return -1;
      if (b.id === currentProjectId) return 1;

      // Then sort by recency score (lower index = more recently used)
      const scoreA = getProjectRecencyScore(a.id);
      const scoreB = getProjectRecencyScore(b.id);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return 0;
    });
  }, [filteredProjects, currentProjectId, recentEnvironmentIds]);

  return (
    <div className="flex flex-col gap-0">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-foreground text-sm w-full p-0 placeholder:text-slate-500"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {recentProjectsCount > 0 && (
          <Button
            size="sm"
            variant={filterRecent ? 'secondary' : 'ghost'}
            onClick={() => setFilterRecent(!filterRecent)}
            title={filterRecent ? 'Show all projects' : 'Filter by recent projects'}
            className={`shrink-0 text-xs h-8 gap-1.5 px-2.5 ${filterRecent ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15' : 'text-muted-foreground'}`}
          >
            <Clock size={13} />
            <span>Recent</span>
          </Button>
        )}

        <Button size="sm" onClick={addProject} title="Add project" className="shrink-0 text-xs h-8">
          <Plus size={14} /> Add project
        </Button>
      </div>

      {/* list */}
      <div className="flex flex-col gap-5 px-2 py-4">
        {sortedProjects.length === 0 && filterRecent ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
            <p className="text-muted-foreground text-sm">No recent projects found.</p>
            <Button size="sm" variant="outline" onClick={() => setFilterRecent(false)}>
              Show all projects
            </Button>
          </div>
        ) : sortedProjects.length === 0 && searchQuery ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects match "{searchQuery}"</p>
        ) : sortedProjects.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects yet. Add one above.</p>
        ) : (
          sortedProjects.map((project) => {
            const environments = getEnvironmentsByProject(project.id);
            const originalIndex = editingProjects.findIndex(p => p.id === project.id);
            const isRecent = getProjectRecencyScore(project.id) < Infinity;
            return (
              <ProjectListItem
                key={project.id}
                project={project}
                projectIndex={originalIndex >= 0 ? originalIndex : editingProjects.indexOf(project)}
                environments={environments}
                validateProject={validateProject}
                validateEnvironment={validateEnvironment}
                isCurrent={project.id === currentProjectId}
                isRecent={isRecent}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectsList;
