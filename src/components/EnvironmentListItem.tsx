import React, { useRef, useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { Environment } from '../types';
import ColorPicker from './ColorPicker';
import { useConfiguration } from '../context/ConfigurationContext';

interface Props {
  environment: Environment;
  errors: string[];
}

const EnvironmentListItem: React.FC<Props> = ({ environment, errors }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { handleEnvironmentChange, removeEnvironment, newlyAddedEnvironments, clearNewlyAddedStatus } = useConfiguration();

  useEffect(() => {
    if (newlyAddedEnvironments.has(environment.id)) {
      setIsEditingName(true);
      setTimeout(() => {
        nameInputRef.current?.focus();
        clearNewlyAddedStatus(undefined, environment.id);
      }, 50);
    }
  }, [environment.id, newlyAddedEnvironments, clearNewlyAddedStatus]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleUrlBlur = (value: string) => {
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      handleEnvironmentChange(environment.id, 'baseUrl', `https://${value}`);
    }
  };

  return (
    <div className={`env-list-item ${errors.length > 0 ? 'has-errors' : ''}`}>
      <div className="env-list-row">
        <ColorPicker
          value={environment.color}
          onChange={(color) => handleEnvironmentChange(environment.id, 'color', color)}
          triggerClassName="color-dot-trigger small"
        />

        {isEditingName ? (
          <input
            ref={nameInputRef}
            className="env-name-input"
            value={environment.name}
            onChange={(e) => handleEnvironmentChange(environment.id, 'name', e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            placeholder="Environment name"
          />
        ) : (
          <span
            className="env-list-name"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to edit name"
          >
            {environment.name || 'Unnamed'}
          </span>
        )}

        <input
          className="env-url-input"
          type="text"
          value={environment.baseUrl}
          onChange={(e) => handleEnvironmentChange(environment.id, 'baseUrl', e.target.value)}
          onBlur={(e) => handleUrlBlur(e.target.value)}
          placeholder="https://example.com"
        />

        <button
          className="remove-btn icon-btn"
          onClick={() => removeEnvironment(environment.id)}
          title="Delete environment"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {errors.length > 0 && (
        <div className="env-list-errors">
          {errors.map((err, i) => <span key={i} className="error-text">{err}</span>)}
        </div>
      )}
    </div>
  );
};

export default EnvironmentListItem;
