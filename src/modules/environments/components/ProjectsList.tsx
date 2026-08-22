import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import ProjectListItem from './ProjectListItem';
import { useConfiguration } from '../context/ConfigurationContext';

const ProjectsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    editingProjects,
    addProject,
    validateProject,
    validateEnvironment,
    getEnvironmentsByProject,
    currentProjectId,
  } = useConfiguration();

  const filteredProjects = useMemo(() => {
    return searchQuery.trim()
      ? editingProjects.filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : editingProjects;
  }, [editingProjects, searchQuery]);

  const sortedProjects = useMemo(() => {
    if (!currentProjectId) return filteredProjects;
    const currentIndex = filteredProjects.findIndex(p => p.id === currentProjectId);
    if (currentIndex <= 0) return filteredProjects;
    const currentProj = filteredProjects[currentIndex];
    const rest = filteredProjects.filter((_, i) => i !== currentIndex);
    return [currentProj, ...rest];
  }, [filteredProjects, currentProjectId]);

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
        <Button size="sm" onClick={addProject} title="Add project" className="shrink-0">
          <Plus size={15} /> Add project
        </Button>
      </div>

      {/* list */}
      <div className="flex flex-col gap-5 px-2 py-4">
        {sortedProjects.length === 0 && searchQuery ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects match "{searchQuery}"</p>
        ) : sortedProjects.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects yet. Add one above.</p>
        ) : (
          sortedProjects.map((project) => {
            const environments = getEnvironmentsByProject(project.id);
            const originalIndex = editingProjects.findIndex(p => p.id === project.id);
            return (
              <ProjectListItem
                key={project.id}
                project={project}
                projectIndex={originalIndex >= 0 ? originalIndex : editingProjects.indexOf(project)}
                environments={environments}
                validateProject={validateProject}
                validateEnvironment={validateEnvironment}
                isCurrent={project.id === currentProjectId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectsList;
