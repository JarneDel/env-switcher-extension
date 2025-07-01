import React from 'react';
import type {Environment, Project} from '../types';

interface Props {
  environments: Environment[];
  projects: Project[];
  currentEnvironment?: Environment;
  onSwitch: (env: Environment) => void;
}

const EnvironmentSwitcher: React.FC<Props> = ({ 
  environments, 
  projects,
  currentEnvironment,
  onSwitch
}) => {
  // If no environments are configured at all, don't show anything
  if (environments.length === 0) {
    return null;
  }

  // If we're not on a recognized environment, show fallback message
  if (!currentEnvironment) {
    return (
      <div className="switcher-section">
        <h3>Environments</h3>
        <div className="fallback-message">
          <div className="fallback-icon">🌍</div>
          <h4>Unknown Website</h4>
          <p>This website doesn't match any of your configured environments.</p>
          <p className="fallback-hint">Environment switching is only available on configured websites.</p>
        </div>
      </div>
    );
  }

  // Get the current project
  const currentProject = projects.find(p => p.id === currentEnvironment.projectId);

  if (!currentProject) {
    return (
      <div className="switcher-section">
        <h3>Environments</h3>
        <div className="fallback-message">
          <div className="fallback-icon">⚠️</div>
          <h4>Project Not Found</h4>
          <p>The current environment belongs to a project that no longer exists.</p>
          <p className="fallback-hint">Please reconfigure your environments in Settings.</p>
        </div>
      </div>
    );
  }

  // Filter environments to only show those from the current project
  const currentProjectEnvironments = environments.filter(env => env.projectId === currentEnvironment.projectId);

  if (currentProjectEnvironments.length === 0) {
    return (
      <div className="switcher-section">
        <h3>Environments</h3>
        <div className="fallback-message">
          <div className="fallback-icon">📂</div>
          <h4>No Environments Available</h4>
          <p>No environments are configured for the <strong>{currentProject.name}</strong> project.</p>
          <p className="fallback-hint">Add more environments in Settings to enable switching.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="switcher-section">
      <h3>Environments</h3>

      <div className="project-environments-group">
        <div className="project-header-switcher">
          <h4
            className="project-name"
            style={{ color: currentProject.color || '#6b7280' }}
          >
            {currentProject.name}
          </h4>
          {currentProject.description && (
            <span className="project-description">{currentProject.description}</span>
          )}
        </div>

        <div className="environment-grid">
          {currentProjectEnvironments.map(env => (
            <button
              key={env.id}
              className={`env-button ${currentEnvironment?.id === env.id ? 'active' : ''}`}
              style={{
                '--env-color': env.color,
                backgroundColor: currentEnvironment?.id === env.id ? env.color : 'transparent',
                borderColor: env.color,
                color: currentEnvironment?.id === env.id ? 'white' : env.color
              } as React.CSSProperties}
              onClick={() => onSwitch(env)}
              title={`Switch to ${env.name} (${env.baseUrl})`}
            >
              <div className="env-name">{env.name}</div>
              <div className="env-url">{new URL(env.baseUrl).hostname}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;
