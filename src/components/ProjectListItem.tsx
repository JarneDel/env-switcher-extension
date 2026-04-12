import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus, Globe } from 'lucide-react';
import type { Project, Environment } from '../types';
import ColorPicker from './ColorPicker';
import EnvironmentListItem from './EnvironmentListItem';
import { useConfiguration } from '../context/ConfigurationContext';
import { useCollapse } from '../hooks/useCollapse';

interface Props {
  project: Project;
  projectIndex: number;
  environments: Environment[];
  validateProject: (project: Project) => string[];
  validateEnvironment: (env: Environment) => string[];
}

const ProjectListItem: React.FC<Props> = ({
  project,
  projectIndex,
  environments,
  validateProject,
  validateEnvironment,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    handleProjectChange,
    removeProject,
    addEnvironment,
    addCurrentDomain,
    newlyAddedProjects,
    clearNewlyAddedStatus,
  } = useConfiguration();

  useEffect(() => {
    if (newlyAddedProjects.has(project.id)) {
      setIsCollapsed(false);
      setIsEditingName(true);
      setTimeout(() => {
        nameInputRef.current?.focus();
        clearNewlyAddedStatus(project.id);
      }, 50);
    }
  }, [project.id, newlyAddedProjects, clearNewlyAddedStatus]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const { collapseProps } = useCollapse({ isCollapsed, duration: 150 });

  const projectErrors = validateProject(project);

  return (
    <div className={`project-list-item ${projectErrors.length > 0 ? 'has-errors' : ''}`}>
      <div className="project-list-row">
        <button
          className="collapse-btn icon-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <ColorPicker
          value={project.color || '#6b7280'}
          onChange={(color) => handleProjectChange(projectIndex, 'color', color)}
          triggerClassName="color-dot-trigger"
        />

        {isEditingName ? (
          <input
            ref={nameInputRef}
            className="project-name-input"
            value={project.name}
            onChange={(e) => handleProjectChange(projectIndex, 'name', e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            placeholder="Project name"
          />
        ) : (
          <span
            className="project-list-name"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to edit"
          >
            {project.name || `Project #${projectIndex + 1}`}
          </span>
        )}

        <span className="env-count-badge">{environments.length}</span>

        <button
          className="remove-btn icon-btn"
          onClick={() => removeProject(projectIndex)}
          title="Delete project"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {projectErrors.length > 0 && (
        <div className="project-errors">
          {projectErrors.map((err, i) => <span key={i} className="error-text">{err}</span>)}
        </div>
      )}

      <div {...collapseProps}>
        <div className="project-envs-list">
          {environments.map((env) => (
            <EnvironmentListItem
              key={env.id}
              environment={env}
              errors={validateEnvironment(env)}
            />
          ))}
          <div className="project-env-actions">
            <button
              className="add-env-btn"
              onClick={() => addEnvironment(project.id)}
            >
              <Plus size={12} /> Add new
            </button>
            <button
              className="add-env-btn"
              onClick={() => addCurrentDomain(project.id)}
            >
              <Globe size={12} /> Add current
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectListItem;
