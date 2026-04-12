import React from 'react';
import { Button } from './ui/button';
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
    <div ref={configurationPanel}>
      {!standalone && (
        <h3 className="text-sm font-semibold text-foreground px-5 py-3 border-b border-border">
          Configure Projects & Environments
        </h3>
      )}

      <ProjectsList />

      {!standalone && onCancel && (
        <div className="flex gap-2 px-5 py-3 border-t border-border">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
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
