import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from './ui/button';
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
  } = useConfiguration();

  const filteredProjects = searchQuery.trim()
    ? editingProjects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : editingProjects;

  return (
    <div className="flex flex-col gap-0">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0 relative">
          <Search size={14} className="absolute left-2.5 text-muted-foreground shrink-0 pointer-events-none" />
          <input
            className="w-full bg-card border border-border rounded-md pl-8 pr-3 h-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
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
      <div className="flex flex-col gap-2 px-5 py-3">
        {filteredProjects.length === 0 && searchQuery ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects match "{searchQuery}"</p>
        ) : filteredProjects.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No projects yet. Add one above.</p>
        ) : (
          filteredProjects.map((project) => {
            const environments = getEnvironmentsByProject(project.id);
            const originalIndex = editingProjects.indexOf(project);
            return (
              <ProjectListItem
                key={project.id}
                project={project}
                projectIndex={originalIndex}
                environments={environments}
                validateProject={validateProject}
                validateEnvironment={validateEnvironment}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectsList;
