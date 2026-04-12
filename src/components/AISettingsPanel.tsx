
import React, { useState, useEffect, useRef } from 'react';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import type { LMStudioConfig } from '../libs/aiUtils';
import AISettings from './AISettings';

const AISettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadStoredConfig();
  }, []);

  // Auto-save whenever config changes
  useEffect(() => {
    if (!config) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      await saveConfig(config);
    }, 300);
    return () => clearTimeout(timer);
  }, [config]);

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

  const handleAIConfigChange = (aiConfig: LMStudioConfig) => {
    if (!config) return;

    setConfig({
      ...config,
      aiConfig
    });
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
            onConfigChange={handleAIConfigChange}
        />
      </div>
  );
};

export default AISettingsPanel;