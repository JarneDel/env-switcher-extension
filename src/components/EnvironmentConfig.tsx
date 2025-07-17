import React, { useState } from 'react';
import type { Environment } from '../types';
import ColorPicker from './ColorPicker';
import ValidationErrors from './ValidationErrors';
import { useConfiguration } from '../context/ConfigurationContext';

interface Props {
  environment: Environment;
  errors: string[];
}

const EnvironmentConfig: React.FC<Props> = ({
  environment,
  errors
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    handleEnvironmentChange,
    removeEnvironment
  } = useConfiguration();

  return (
    <div className={`env-config nested ${errors.length > 0 ? 'has-errors' : ''}`}>
      <div className="env-config-header">
        <div className="env-header-left">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn small"
            title={isCollapsed ? 'Expand environment' : 'Collapse environment'}
          >
            {isCollapsed ? '▶️' : '▼️'}
          </button>
          <span className="env-number">{environment.name || 'Unnamed'}</span>
        </div>
        <button
          onClick={() => removeEnvironment(environment.id)}
          className="remove-btn small"
          title="Remove environment"
        >
          ×
        </button>
      </div>

      <div className={`env-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
        <div className="env-content-inner">
          <div className="env-config-row">
            <div className="input-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Environment name (e.g., Local, Staging)"
                value={environment.name}
                onChange={(e) => handleEnvironmentChange(environment.id, 'name', e.target.value)}
                className="env-input"
              />
            </div>
            <div className="input-group color-group">
              <label>Color</label>
              <ColorPicker
                value={environment.color}
                onChange={(color) => handleEnvironmentChange(environment.id, 'color', color)}
                className="color-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Base URL</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={environment.baseUrl}
              onChange={(e) => handleEnvironmentChange(environment.id, 'baseUrl', e.target.value)}
              className="env-input url-input"
            />
          </div>

          <ValidationErrors errors={errors} />
        </div>
      </div>
    </div>
  );
};

export default EnvironmentConfig;
