import React from 'react';
import { Folder } from 'lucide-react';
import ProjectConfig from './ProjectConfig';
import EmptyState from './EmptyState';
import { useConfiguration } from '../context/ConfigurationContext';

const ProjectsList: React.FC = () => {
  const {
    editingProjects,
    addProject,
    validateProject,
    validateEnvironment,
    getEnvironmentsByProject
  } = useConfiguration();

  return (
    <div className="projects-section">
      <div className="section-header">
        <h4>Projects</h4>
        <button onClick={addProject} className="add-project-btn">
          + Add Project
        </button>
      </div>

      {editingProjects.length === 0 && (
        <EmptyState
          title="No Projects Configured"
          description="Create projects to organize your environments by context"
          icon={<Folder size={40} />}
        />
      )}

      {editingProjects.map((project, projectIndex) => {
        const projectEnvironments = getEnvironmentsByProject(project.id);

        return (
          <ProjectConfig
            key={project.id}
            project={project}
            projectIndex={projectIndex}
            environments={projectEnvironments}
            validateProject={validateProject}
            validateEnvironment={validateEnvironment}
          />
        );
      })}
    </div>
  );
};

export default ProjectsList;
