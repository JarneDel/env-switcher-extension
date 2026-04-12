import React, { useState, useEffect } from 'react';
import type { ExtensionConfig } from '../types';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import ConfigurationPanel from './ConfigurationPanel';

const ProjectSettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredConfig();
  }, []);

  const loadStoredConfig = async () => {
    try {
      const currentConfig = await loadConfig();
      setConfig(currentConfig);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async (newConfig: ExtensionConfig) => {
    if (!config) return;
    try {
      await saveConfig(newConfig);
      setConfig(newConfig);
    } catch {
      // silently handle
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <div className="size-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading project settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-sm text-muted-foreground">Failed to load project settings</p>
      </div>
    );
  }

  return (
    <ConfigurationPanel
      config={config}
      onSave={handleConfigSave}
      standalone
    />
  );
};

export default ProjectSettingsPanel;
