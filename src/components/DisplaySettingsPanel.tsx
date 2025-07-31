import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';

interface Props {
  onSettingsChange: () => void;
  onSaveReady?: (saveHandler: () => void, hasErrors: () => boolean) => void;
}

const DisplaySettingsPanel: React.FC<Props> = ({ onSettingsChange, onSaveReady }) => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredConfig();
  }, []);

  useEffect(() => {
    if (onSaveReady && config) {
      onSaveReady(handleSave, () => false); // No validation errors for display settings
    }
  }, [onSaveReady, config]);

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

  const handleSave = async () => {
    if (!config) return;

    try {
      await saveConfig(config);
      onSettingsChange();
    } catch (error) {
      // Error saving config - silently handle
    }
  };

  const handleToggleFavicon = (enabled: boolean) => {
    if (!config) return;

    setConfig({
      ...config,
      faviconEnabled: enabled
    });
  };

  const handleToggleBorder = (enabled: boolean) => {
    if (!config) return;

    setConfig({
      ...config,
      borderEnabled: enabled
    });
  };

  const handleToggleAutoDetectLanguages = (enabled: boolean) => {
    if (!config) return;

    setConfig({
      ...config,
      autoDetectLanguages: enabled
    });
  };

  const handleToggleMinimalBorder = (enabled: boolean) => {
    if (!config) return;

    setConfig({
      ...config,
      minimalBorderEnabled: enabled
    });
  };

  const handleBorderHeightChange = (height: number) => {
    if (!config) return;

    setConfig({
      ...config,
      borderHeight: height
    });
  };

  const handleMinimalBorderHeightChange = (height: number) => {
    if (!config) return;

    setConfig({
      ...config,
      minimalBorderHeight: height
    });
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-error">
        <p>Failed to load display settings</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h3>Visual Environment Indicators</h3>
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={config.faviconEnabled ?? true}
            onChange={(e) => handleToggleFavicon(e.target.checked)}
          />
          Enable Favicon Border
        </label>
        <p className="setting-description">
          Add a colored border around website favicons to indicate the current environment.
        </p>
      </div>

      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={config.borderEnabled ?? true}
            onChange={(e) => handleToggleBorder(e.target.checked)}
          />
          Enable Page Border
        </label>
        <p className="setting-description">
          Add a colored border around the entire webpage to indicate the current environment.
        </p>
        {config.borderEnabled !== false && (
          <div className="border-height-selector">
            <label className="setting-label-text">Border Height</label>
            <div className="height-input-container">
              <input
                type="range"
                min="1"
                max="10"
                value={config.borderHeight ?? 3}
                onChange={(e) => handleBorderHeightChange(parseInt(e.target.value))}
                className="height-range"
              />
              <input
                type="number"
                min="1"
                max="10"
                value={config.borderHeight ?? 3}
                onChange={(e) => handleBorderHeightChange(parseInt(e.target.value) || 3)}
                className="height-number"
              />
              <span className="height-unit">px</span>
            </div>
          </div>
        )}
      </div>

      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={config.minimalBorderEnabled ?? false}
            onChange={(e) => handleToggleMinimalBorder(e.target.checked)}
          />
          Enable Minimal Bottom Border
        </label>
        <p className="setting-description">
          Add a thin colored line at the bottom of the page that stays visible when scrolling.
        </p>
        {config.minimalBorderEnabled && (
          <div className="border-height-selector">
            <label className="setting-label-text">Border Height</label>
            <div className="height-input-container">
              <input
                type="range"
                min="1"
                max="10"
                value={config.minimalBorderHeight ?? 4}
                onChange={(e) => handleMinimalBorderHeightChange(parseInt(e.target.value))}
                className="height-range"
              />
              <input
                type="number"
                min="1"
                max="10"
                value={config.minimalBorderHeight ?? 4}
                onChange={(e) => handleMinimalBorderHeightChange(parseInt(e.target.value) || 4)}
                className="height-number"
              />
              <span className="height-unit">px</span>
            </div>
          </div>
        )}
      </div>

      <h3>Language Detection</h3>
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={config.autoDetectLanguages ?? true}
            onChange={(e) => handleToggleAutoDetectLanguages(e.target.checked)}
          />
          Auto-detect Languages
        </label>
        <p className="setting-description">
          Automatically detect and show available languages on websites for quick switching.
        </p>
      </div>
    </div>
  );
};

export default DisplaySettingsPanel;
