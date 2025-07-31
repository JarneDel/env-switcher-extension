import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import type { LMStudioConfig } from '../libs/aiUtils';
import AISettings from './AISettings';

interface Props {
  onSettingsChange: () => void;
  onSaveReady?: (saveHandler: () => void, hasErrors: () => boolean) => void;
}

const AISettingsPanel: React.FC<Props> = ({ onSettingsChange, onSaveReady }) => {
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

  const handleAIConfigSave = async (aiConfig: LMStudioConfig) => {
    if (!config) return;

    try {
      const updatedConfig: StoredConfig = {
        ...config,
        aiConfig
      };
      await saveConfig(updatedConfig);
      setConfig(updatedConfig);
      onSettingsChange();
    } catch (error) {
      // Error saving AI config - silently handle
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading AI settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-error">
        <p>Failed to load AI settings</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h3>AI Environment Naming</h3>
      <AISettings
        config={config.aiConfig!}
        onConfigChange={handleAIConfigSave}
      />
    </div>
  );
};

export default AISettingsPanel;
