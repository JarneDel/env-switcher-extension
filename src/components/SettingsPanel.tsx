import React, { useState, useEffect } from 'react';
import type {ExtensionConfig} from '../types';
import { ExtensionStorage } from '../libs/storage';
import ConfigurationPanel from './ConfigurationPanel';

interface Props {
  onSettingsChange: () => void;
}

const SettingsPanel: React.FC<Props> = ({ onSettingsChange }) => {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const currentConfig = await ExtensionStorage.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async (newConfig: ExtensionConfig) => {
    try {
      await ExtensionStorage.saveConfig(newConfig);
      setConfig(newConfig);
      onSettingsChange();
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleAutoDetectToggle = async (enabled: boolean) => {
    if (!config) return;
    
    const updatedConfig = { ...config, autoDetectLanguages: enabled };
    await handleConfigSave(updatedConfig);
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-error">
        <p>Error loading settings. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Extension Settings</h2>
      </div>

      <div className="settings-section">
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={config.autoDetectLanguages}
              onChange={(e) => handleAutoDetectToggle(e.target.checked)}
            />
            Auto-detect available languages
          </label>
          <p className="setting-description">
            Automatically detect available languages from page links and alternate tags
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h3>Environment Configuration</h3>
        <ConfigurationPanel
          config={config}
          onSave={handleConfigSave}
          standalone={true}
        />
      </div>
    </div>
  );
};

export default SettingsPanel;
