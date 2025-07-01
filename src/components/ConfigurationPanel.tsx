import React, { useState } from 'react';
import type {Environment, ExtensionConfig} from '../types';
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
  const [editingEnvironments, setEditingEnvironments] = useState<Environment[]>(
    config.environments.map(env => ({ ...env }))
  );

  const handleEnvironmentChange = (index: number, field: keyof Environment, value: string) => {
    const updated = [...editingEnvironments];
    updated[index] = { ...updated[index], [field]: value };
    setEditingEnvironments(updated);
  };

  const addEnvironment = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: 'New Environment',
      baseUrl: 'https://example.com',
      color: '#6b7280'
    };
    setEditingEnvironments([...editingEnvironments, newEnv]);
  };

  const removeEnvironment = (index: number) => {
    setEditingEnvironments(editingEnvironments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updatedConfig: ExtensionConfig = {
      ...config,
      environments: editingEnvironments
    };
    onSave(updatedConfig);
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
    
    return errors;
  };

  const hasValidationErrors = () => {
    return editingEnvironments.some(env => validateEnvironment(env).length > 0);
  };

  return (
    <div className={`config-panel ${standalone ? 'standalone' : ''}`}>
      {!standalone && <h3>Configure Environments</h3>}
      
      {editingEnvironments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌍</div>
          <h4>No Environments Configured</h4>
          <p>Add your first environment to get started. You can configure different environments like local, staging, and production.</p>
        </div>
      )}

      <div className="environments-list">
        {editingEnvironments.map((env, index) => {
          const errors = validateEnvironment(env);
          return (
            <div key={env.id} className={`env-config ${errors.length > 0 ? 'has-errors' : ''}`}>
              <div className="env-config-header">
                <span className="env-number">#{index + 1}</span>
                <button
                  onClick={() => removeEnvironment(index)}
                  className="remove-btn"
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
                    onChange={(e) => handleEnvironmentChange(index, 'name', e.target.value)}
                    className="env-input"
                  />
                </div>
                <div className="input-group color-group">
                  <label>Color</label>
                  <ColorPicker
                    value={env.color}
                    onChange={(color) => handleEnvironmentChange(index, 'color', color)}
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
                  onChange={(e) => handleEnvironmentChange(index, 'baseUrl', e.target.value)}
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
      </div>

      <button onClick={addEnvironment} className="add-env-btn">
        + Add Environment
      </button>

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