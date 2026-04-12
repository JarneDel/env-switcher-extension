import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
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
    <div className="projects-list-panel">
      <div className="projects-list-toolbar">
        <div className="projects-search-wrap">
          <Search size={14} className="projects-search-icon" />
          <input
            className="projects-search-input"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="add-project-btn" onClick={addProject} title="Add project">
          <Plus size={15} /> Add project
        </button>
      </div>

      <div className="projects-list">
        {filteredProjects.length === 0 && searchQuery ? (
          <p className="projects-empty">No projects match "{searchQuery}"</p>
        ) : filteredProjects.length === 0 ? (
          <p className="projects-empty">No projects yet. Add one above.</p>
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
