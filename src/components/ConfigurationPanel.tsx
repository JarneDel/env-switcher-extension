import React, { useState } from 'react';
import type {Environment, ExtensionConfig, Project} from '../types';
import ColorPicker from './ColorPicker';

interface Props {
  config: ExtensionConfig;
  onSave: (config: ExtensionConfig) => void;
  onCancel?: () => void;
  standalone?: boolean;
}

const ConfigurationPanel: React.FC<Props> = ({ 
  config, 
  onSave, 
  onCancel,
  standalone = false
}) => {
  const [editingProjects, setEditingProjects] = useState<Project[]>(
    config.projects.map(project => ({ ...project }))
  );
  const [editingEnvironments, setEditingEnvironments] = useState<Environment[]>(
    config.environments.map(env => ({ ...env }))
  );

  const handleProjectChange = (index: number, field: keyof Project, value: string) => {
    const updated = [...editingProjects];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProjects(updated);
  };

  const addProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: 'New Project',
      description: '',
      color: '#6b7280'
    };
    setEditingProjects([...editingProjects, newProject]);
  };

  const removeProject = (index: number) => {
    const projectId = editingProjects[index].id;

    // Remove project
    setEditingProjects(editingProjects.filter((_, i) => i !== index));

    // Remove all environments belonging to this project
    setEditingEnvironments(editingEnvironments.filter(env => env.projectId !== projectId));
  };

  const handleEnvironmentChange = (index: number, field: keyof Environment, value: string) => {
    const updated = [...editingEnvironments];
    updated[index] = { ...updated[index], [field]: value };
    setEditingEnvironments(updated);
  };

  const addEnvironment = (projectId?: string) => {
    // Use the first project if available, or create a default project
    let targetProjectId = projectId;
    if (!targetProjectId && editingProjects.length > 0) {
      targetProjectId = editingProjects[0].id;
    } else if (!targetProjectId) {
      // Create a default project first
      const defaultProject: Project = {
        id: `project-${Date.now()}`,
        name: 'Default Project',
        description: 'Default project for environments',
        color: '#6b7280'
      };
      setEditingProjects([...editingProjects, defaultProject]);
      targetProjectId = defaultProject.id;
    }

    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: 'New Environment',
      baseUrl: 'https://example.com',
      color: '#6b7280',
      projectId: targetProjectId!
    };
    setEditingEnvironments([...editingEnvironments, newEnv]);
  };

  const removeEnvironment = (index: number) => {
    setEditingEnvironments(editingEnvironments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedConfig: ExtensionConfig = {
      ...config,
      projects: editingProjects,
      environments: editingEnvironments
    };
    onSave(updatedConfig);
  };

  const validateProject = (project: Project): string[] => {
    const errors: string[] = [];

    if (!project.name.trim()) {
      errors.push('Project name is required');
    }

    return errors;
  };

  const validateEnvironment = (env: Environment): string[] => {
    const errors: string[] = [];
    
    if (!env.name.trim()) {
      errors.push('Name is required');
    }
    
    if (!env.baseUrl.trim()) {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(env.baseUrl);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    if (!env.projectId || !editingProjects.find(p => p.id === env.projectId)) {
      errors.push('Must belong to a valid project');
    }

    return errors;
  };

  const hasValidationErrors = () => {
    const projectErrors = editingProjects.some(project => validateProject(project).length > 0);
    const envErrors = editingEnvironments.some(env => validateEnvironment(env).length > 0);
    return projectErrors || envErrors;
  };

  const getEnvironmentsByProject = (projectId: string) => {
    return editingEnvironments.filter(env => env.projectId === projectId);
  };

  return (
    <div className={`config-panel ${standalone ? 'standalone' : ''}`}>
      {!standalone && <h3>Configure Projects & Environments</h3>}

      {/* Projects Section */}
      <div className="projects-section">
        <div className="section-header">
          <h4>Projects</h4>
          <button onClick={addProject} className="add-project-btn">
            + Add Project
          </button>
        </div>

        {editingProjects.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h4>No Projects Configured</h4>
            <p>Create projects to organize your environments by context (e.g., mil.be, buildwise, sport-vlaanderen).</p>
          </div>
        )}

        {editingProjects.map((project, projectIndex) => {
          const projectErrors = validateProject(project);
          const projectEnvironments = getEnvironmentsByProject(project.id);

          return (
            <div key={project.id} className={`project-config ${projectErrors.length > 0 ? 'has-errors' : ''}`}>
              <div className="project-header">
                <div className="project-info">
                  <span className="project-number">Project #{projectIndex + 1}</span>
                  <span className="env-count">({projectEnvironments.length} environments)</span>
                </div>
                <button
                  onClick={() => removeProject(projectIndex)}
                  className="remove-btn"
                  title="Remove project"
                >
                  ×
                </button>
              </div>

              <div className="project-config-row">
                <div className="input-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g., mil.be, buildwise, sport-vlaanderen"
                    value={project.name}
                    onChange={(e) => handleProjectChange(projectIndex, 'name', e.target.value)}
                    className="env-input"
                  />
                </div>
                <div className="input-group color-group">
                  <label>Color</label>
                  <ColorPicker
                    value={project.color || '#6b7280'}
                    onChange={(color) => handleProjectChange(projectIndex, 'color', color)}
                    className="color-input"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief description of this project"
                  value={project.description || ''}
                  onChange={(e) => handleProjectChange(projectIndex, 'description', e.target.value)}
                  className="env-input"
                />
              </div>

              {projectErrors.length > 0 && (
                <div className="validation-errors">
                  {projectErrors.map((error, i) => (
                    <div key={i} className="error-message">⚠️ {error}</div>
                  ))}
                </div>
              )}

              {/* Environments for this project */}
              <div className="project-environments">
                <div className="environments-header">
                  <h5>Environments</h5>
                  <button
                    onClick={() => addEnvironment(project.id)}
                    className="add-env-btn-small"
                  >
                    + Add Environment
                  </button>
                </div>

                {projectEnvironments.map((env) => {
                  const envIndex = editingEnvironments.findIndex(e => e.id === env.id);
                  const errors = validateEnvironment(env);

                  return (
                    <div key={env.id} className={`env-config nested ${errors.length > 0 ? 'has-errors' : ''}`}>
                      <div className="env-config-header">
                        <span className="env-number">{env.name || 'Unnamed'}</span>
                        <button
                          onClick={() => removeEnvironment(envIndex)}
                          className="remove-btn small"
                          title="Remove environment"
                        >
                          ×
                        </button>
                      </div>

                      <div className="env-config-row">
                        <div className="input-group">
                          <label>Name</label>
                          <input
                            type="text"
                            placeholder="Environment name (e.g., Local, Staging)"
                            value={env.name}
                            onChange={(e) => handleEnvironmentChange(envIndex, 'name', e.target.value)}
                            className="env-input"
                          />
                        </div>
                        <div className="input-group color-group">
                          <label>Color</label>
                          <ColorPicker
                            value={env.color}
                            onChange={(color) => handleEnvironmentChange(envIndex, 'color', color)}
                            className="color-input"
                          />
                        </div>
                      </div>

                      <div className="input-group">
                        <label>Base URL</label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={env.baseUrl}
                          onChange={(e) => handleEnvironmentChange(envIndex, 'baseUrl', e.target.value)}
                          className="env-input url-input"
                        />
                      </div>

                      {errors.length > 0 && (
                        <div className="validation-errors">
                          {errors.map((error, i) => (
                            <div key={i} className="error-message">⚠️ {error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {projectEnvironments.length === 0 && (
                  <div className="no-environments">
                    <p>No environments in this project yet.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!standalone && (
        <div className="config-actions">
          <button 
            onClick={handleSave} 
            className="save-btn"
            disabled={hasValidationErrors()}
          >
            Save Configuration
          </button>
          {onCancel && (
            <button onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
          )}
        </div>
      )}

      {standalone && (
        <div className="config-actions">
          <button 
            onClick={handleSave} 
            className="save-btn"
            disabled={hasValidationErrors()}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPanel;

