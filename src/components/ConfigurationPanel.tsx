import React from 'react';
import type { ExtensionConfig } from '../types';
import ProjectsList from './ProjectsList';
import { ConfigurationProvider, useConfiguration } from '../context/ConfigurationContext';

interface Props {
  config: ExtensionConfig;
  onSave: (config: ExtensionConfig) => void;
  onCancel?: () => void;
  standalone?: boolean;
  onSaveReady?: (saveHandler: () => void, hasErrors: () => boolean) => void;
}

const ConfigurationPanelContent: React.FC<Omit<Props, 'config'>> = ({
  onSave,
  onCancel,
  standalone = false,
  onSaveReady
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

  // Expose save handler to parent component
  React.useEffect(() => {
    if (onSaveReady) {
      onSaveReady(handleSave, hasValidationErrors);
    }
  }, [onSaveReady, hasValidationErrors]);

  return (
    <div className={`config-panel ${standalone ? 'standalone' : ''}`} ref={configurationPanel}>
      {!standalone && <h3>Configure Projects & Environments</h3>}

      <ProjectsList />

      {!standalone && onCancel && (
        <div className="config-actions">
          <button onClick={onCancel} className="cancel-btn">
            Cancel
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
