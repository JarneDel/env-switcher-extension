import React, { useState, useEffect, useRef } from 'react';
import { loadConfig, saveConfig, type StoredConfig } from '@/modules/sync';
import { Switch } from '@/shared/ui';

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
  <div className="flex items-center gap-3 mt-2">
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

/**
 * Debounce for auto-saving display settings. Kept comfortably above the
 * previous 300ms because each save is a storage.sync write and the sliders
 * emit a change per pixel of travel.
 */
const SAVE_DEBOUNCE_MS = 750;

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
    const timer = setTimeout(() => {
      // saveConfig rethrows, and browser.storage.sync caps writes at 120/min —
      // dragging a slider can hit that, so the rejection must not escape.
      void saveConfig(config).catch(() => { /* setting will be retried on the next edit */ });
    }, SAVE_DEBOUNCE_MS);
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-foreground">Enable Favicon Border</span>
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
                Add a colored border around website favicons to indicate the current environment.
              </p>
            </div>
            <Switch
              checked={config.faviconEnabled ?? false}
              onCheckedChange={(checked) => update({ faviconEnabled: checked })}
              className="mt-0.5"
            />
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-foreground">Enable Page Border</span>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
                  Add a colored border around the entire webpage to indicate the current environment.
                </p>
              </div>
              <Switch
                checked={config.borderEnabled ?? false}
                onCheckedChange={(checked) => update({ borderEnabled: checked })}
                className="mt-0.5"
              />
            </div>
            {!!config.borderEnabled && (
              <div className="mt-2.5 pt-2 border-t border-border/50">
                <span className="block text-xs font-medium text-foreground mb-1">Border Height</span>
                <HeightControl
                  value={config.borderHeight ?? 3}
                  onChange={(v) => update({ borderHeight: v })}
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-foreground">Enable Minimal Bottom Border</span>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
                  Add a thin colored line at the bottom of the page that stays visible when scrolling.
                </p>
              </div>
              <Switch
                checked={config.minimalBorderEnabled ?? false}
                onCheckedChange={(checked) => update({ minimalBorderEnabled: checked })}
                className="mt-0.5"
              />
            </div>
            {config.minimalBorderEnabled && (
              <div className="mt-2.5 pt-2 border-t border-border/50">
                <span className="block text-xs font-medium text-foreground mb-1">Border Height</span>
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-foreground">Auto-detect Languages</span>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Automatically detect and show available languages on websites for quick switching.
            </p>
          </div>
          <Switch
            checked={config.autoDetectLanguages ?? true}
            onCheckedChange={(checked) => update({ autoDetectLanguages: checked })}
            className="mt-0.5"
          />
        </div>
      </div>

      {/* ── Environment health ── */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-3">Environment Health</h3>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-foreground">Check environment availability</span>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Periodically check whether each environment is reachable and show a status dot in the
              switcher. Checks run at most every 15 minutes.
            </p>
          </div>
          <Switch
            checked={config.healthChecksEnabled ?? true}
            onCheckedChange={(checked) => update({ healthChecksEnabled: checked })}
            className="mt-0.5"
          />
        </div>
      </div>

      {/* ── Pages & Bookmarks ── */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-3">Pages & Bookmarks</h3>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-foreground">Enable Pages & Bookmarks Tabs</span>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground leading-[1.4]">
              Show visited pages history, starred bookmarks, and page navigation tabs in the popup switcher.
            </p>
          </div>
          <Switch
            checked={config.bookmarksEnabled ?? false}
            onCheckedChange={(checked) => update({ bookmarksEnabled: checked })}
            className="mt-0.5"
          />
        </div>
      </div>

    </div>
  );
};

export default DisplaySettingsPanel;
