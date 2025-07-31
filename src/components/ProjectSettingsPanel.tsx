import React, { useState, useEffect } from 'react';
import type { ExtensionConfig } from '../types';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import ConfigurationPanel from './ConfigurationPanel';

interface Props {
  onSettingsChange: () => void;
  onSaveReady?: (saveHandler: () => void, hasErrors: () => boolean) => void;
}

const ProjectSettingsPanel: React.FC<Props> = ({ onSettingsChange, onSaveReady }) => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredConfig();
  }, []);

  const loadStoredConfig = async () => {
    try {
      const currentConfig = await loadConfig();
      setConfig(currentConfig);
    } catch (error) {
      // Error loading config - silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async (newConfig: ExtensionConfig) => {
    if (!config) return;

    try {
      const updatedConfig: StoredConfig = {
        ...newConfig,
        aiConfig: config.aiConfig
      };
      await saveConfig(updatedConfig);
      setConfig(updatedConfig);
      onSettingsChange();
    } catch (error) {
      // Error saving config - silently handle
    }
  };

  const handleSaveReady = (saveHandlerFn: () => void, hasErrorsFn: () => boolean) => {
    if (onSaveReady) {
      onSaveReady(saveHandlerFn, hasErrorsFn);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading project settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-error">
        <p>Failed to load project settings</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <ConfigurationPanel
        config={config}
        onSave={handleConfigSave}
        onSaveReady={handleSaveReady}
        standalone
      />
    </div>
  );
};

export default ProjectSettingsPanel;
