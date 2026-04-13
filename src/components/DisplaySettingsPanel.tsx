import React, { useState, useEffect, useRef } from 'react';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';

const Spinner = () => (
  <div className="size-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
);

const HeightControl = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-3 ml-6 mt-2">
    <input
      type="range"
      min="1"
      max="10"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="range-slider"
    />
    <input
      type="number"
      min="1"
      max="10"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 1)}
      className="w-12 h-7 text-center text-sm rounded-md border border-input bg-card text-foreground px-1 outline-none focus:border-primary"
    />
    <span className="text-sm text-muted-foreground font-medium min-w-[20px]">px</span>
  </div>
);

const DisplaySettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    loadStoredConfig();
  }, []);

  useEffect(() => {
    if (!config) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const timer = setTimeout(async () => { await saveConfig(config); }, 300);
    return () => clearTimeout(timer);
  }, [config]);

  const loadStoredConfig = async () => {
    try {
      const currentConfig = await loadConfig();
      // Mark as visited so the hint in the main view is dismissed
      if (!currentConfig.hasVisitedDisplaySettings) {
        const updated = { ...currentConfig, hasVisitedDisplaySettings: true };
        await saveConfig(updated);
        setConfig(updated);
      } else {
        setConfig(currentConfig);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const update = (patch: Partial<StoredConfig>) => setConfig(c => c ? { ...c, ...patch } : c);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <Spinner />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-muted-foreground text-sm">Failed to load display settings</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 space-y-5">
      {/* ── Visual indicators ── */}
      <div>
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-3">Visual Environment Indicators</h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={config.faviconEnabled ?? false}
                onChange={(e) => update({ faviconEnabled: e.target.checked })}
                className="m-0"
              />
              Enable Favicon Border
            </label>
            <p className="ml-6 mt-1 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Add a colored border around website favicons to indicate the current environment.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={config.borderEnabled ?? false}
                onChange={(e) => update({ borderEnabled: e.target.checked })}
                className="m-0"
              />
              Enable Page Border
            </label>
            <p className="ml-6 mt-1 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Add a colored border around the entire webpage to indicate the current environment.
            </p>
            {!!config.borderEnabled && (
              <div className="ml-6 mt-2">
                <span className="block text-sm font-medium text-foreground mb-1">Border Height</span>
                <HeightControl
                  value={config.borderHeight ?? 3}
                  onChange={(v) => update({ borderHeight: v })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={config.minimalBorderEnabled ?? false}
                onChange={(e) => update({ minimalBorderEnabled: e.target.checked })}
                className="m-0"
              />
              Enable Minimal Bottom Border
            </label>
            <p className="ml-6 mt-1 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Add a thin colored line at the bottom of the page that stays visible when scrolling.
            </p>
            {config.minimalBorderEnabled && (
              <div className="ml-6 mt-2">
                <span className="block text-sm font-medium text-foreground mb-1">Border Height</span>
                <HeightControl
                  value={config.minimalBorderHeight ?? 4}
                  onChange={(v) => update({ minimalBorderHeight: v })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Language detection ── */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-3">Language Detection</h3>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoDetectLanguages ?? true}
              onChange={(e) => update({ autoDetectLanguages: e.target.checked })}
              className="m-0"
            />
            Auto-detect Languages
          </label>
          <p className="ml-6 mt-1 text-[0.8125rem] text-muted-foreground leading-[1.4]">
            Automatically detect and show available languages on websites for quick switching.
          </p>
        </div>
      </div>

      {/* ── Recents ── */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-3">Recents</h3>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={config.recentsProjectScoped ?? false}
              onChange={(e) => update({ recentsProjectScoped: e.target.checked })}
              className="m-0"
            />
            Scope recents to current project
          </label>
          <p className="ml-6 mt-1 text-[0.8125rem] text-muted-foreground leading-[1.4]">
            On unrecognized sites, hide recents instead of showing all projects.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettingsPanel;
