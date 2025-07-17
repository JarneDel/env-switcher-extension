import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import type { ExtensionConfig } from '../types';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import type {LMStudioConfig} from '../libs/aiUtils';
import ConfigurationPanel from './ConfigurationPanel';
import AISettings from './AISettings';

interface Props {
  onSettingsChange: () => void;
  onSaveReady?: (saveHandler: () => void, hasErrors: () => boolean) => void;
}

const SettingsPanel: React.FC<Props> = ({ onSettingsChange, onSaveReady }) => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'ai'>('projects');

  useEffect(() => {
    loadStoredConfig();
  }, []);

  const loadStoredConfig = async () => {
    try {
      const currentConfig = await loadConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Error loading config:', error);
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
      console.error('Error saving config:', error);
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
    } catch (error) {
      console.error('Error saving AI config:', error);
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
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-error">
        <p>Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects & Environments
          </button>
          <button
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={16} style={{ marginRight: '0.5rem' }} />
            AI Settings
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="settings-section">
          <ConfigurationPanel
            config={config}
            onSave={handleConfigSave}
            onSaveReady={handleSaveReady}
            standalone
          />
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="settings-section">
          <h3>AI Environment Naming</h3>
          <AISettings
            config={config.aiConfig!}
            onConfigChange={handleAIConfigSave}
          />
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
