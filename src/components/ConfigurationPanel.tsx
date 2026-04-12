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
    buildUpdatedConfig,
    editingProjects,
    editingEnvironments
  } = useConfiguration();

  const isInitialMount = React.useRef(true);

  // Auto-save whenever projects or environments change, debounced
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (hasValidationErrors()) return;
    const timer = setTimeout(() => {
      onSave(buildUpdatedConfig());
    }, 500);
    return () => clearTimeout(timer);
  }, [editingProjects, editingEnvironments]);

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
