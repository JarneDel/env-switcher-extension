import React from 'react';
import type { ExtensionConfig } from '../types';
import ProjectsList from './ProjectsList';
import { ConfigurationProvider, useConfiguration } from '../context/ConfigurationContext';

interface Props {
  config: ExtensionConfig;
  onSave: (config: ExtensionConfig) => void;
  onCancel?: () => void;
  standalone?: boolean;
}

const ConfigurationPanelContent: React.FC<Omit<Props, 'config'>> = ({
  onSave,
  onCancel,
  standalone = false
}) => {
  const {
    configurationPanel,
    hasValidationErrors,
    buildUpdatedConfig
  } = useConfiguration();

  const handleSave = () => {
    const updatedConfig = buildUpdatedConfig();
    onSave(updatedConfig);
  };

  return (
    <div className={`config-panel ${standalone ? 'standalone' : ''}`} ref={configurationPanel}>
      {!standalone && <h3>Configure Projects & Environments</h3>}

      <ProjectsList />

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

const ConfigurationPanel: React.FC<Props> = (props) => {
  return (
    <ConfigurationProvider config={props.config}>
      <ConfigurationPanelContent {...props} />
    </ConfigurationProvider>
  );
};

export default ConfigurationPanel;
