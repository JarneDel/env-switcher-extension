import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileUp, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { loadConfig, saveConfig, type StoredConfig } from '../libs/storage';
import { isRunningInTab, openInTab } from '../libs/extensionContext';
import {
  applyImport,
  buildExportFilename,
  downloadJson,
  parseShareableConfig,
  serializeConfig,
  type ImportMode,
  type ImportSummary,
} from '../libs/configTransfer';

const Spinner = () => (
  <div className="size-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
);

const summaryText = (summary: ImportSummary, mode: ImportMode): string => {
  if (mode === 'replace') {
    return `Replaced configuration with ${summary.projectsAdded} project(s) and ${summary.environmentsAdded} environment(s).`;
  }
  const parts = [
    `${summary.projectsAdded} project(s) added`,
    ...(summary.projectsMerged > 0 ? [`${summary.projectsMerged} merged`] : []),
    `${summary.environmentsAdded} environment(s) added`,
    ...(summary.environmentsSkipped > 0 ? [`${summary.environmentsSkipped} skipped as duplicates`] : []),
    ...(summary.favoritesAdded > 0 ? [`${summary.favoritesAdded} favorite(s) added`] : []),
  ];
  return `${parts.join(', ')}.`;
};

const DataSettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  // Assume the popup until proven otherwise — it's the restrictive case.
  const [inTab, setInTab] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(() => { /* silently handle */ })
      .finally(() => setLoading(false));
    isRunningInTab().then(setInTab);
  }, []);

  const resetFeedback = () => {
    setErrors([]);
    setWarnings([]);
    setSuccess(null);
    setConfirmingReplace(false);
  };

  const handleDownload = () => {
    if (!config) return;
    downloadJson(buildExportFilename(), serializeConfig(config));
  };

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(serializeConfig(config));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrors(['Could not copy to clipboard — use Download instead.']);
    }
  };

  /**
   * Chrome destroys the popup as soon as the OS file dialog takes focus, so
   * picking a file only works once this page is a real tab.
   */
  const handleChooseFile = async () => {
    if (inTab) {
      fileInput.current?.click();
      return;
    }
    await openInTab('/settings/data');
    window.close();
  };

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow picking the same file twice in a row.
    event.target.value = '';
    if (!file) return;
    resetFeedback();
    try {
      setImportText(await file.text());
    } catch {
      setErrors(['Could not read that file.']);
    }
  };

  const runImport = async () => {
    if (!config) return;
    resetFeedback();

    const { data, errors: parseErrors, warnings: parseWarnings } = parseShareableConfig(importText);
    setWarnings(parseWarnings);

    if (!data) {
      setErrors(parseErrors);
      return;
    }

    const { config: nextConfig, summary } = applyImport(config, data, importMode);

    try {
      await saveConfig(nextConfig);
    } catch {
      setErrors(['Failed to save the imported configuration.']);
      return;
    }

    setConfig(nextConfig);
    setImportText('');
    setSuccess(summaryText(summary, importMode));

    // Refresh favicons/borders in open tabs so the new environments take effect.
    try {
      await browser.runtime.sendMessage({ action: 'environmentChanged' });
    } catch {
      // Background may not be listening — not fatal.
    }
  };

  const handleImportClick = () => {
    if (importMode === 'replace' && !confirmingReplace) {
      setConfirmingReplace(true);
      return;
    }
    runImport();
  };

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
        <p className="text-muted-foreground text-sm">Failed to load configuration</p>
      </div>
    );
  }

  const projectCount = config.projects.length;
  const environmentCount = config.environments.length;

  return (
    <div className="px-5 py-3 space-y-5">
      {/* ── Export ── */}
      <div>
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-1">Export Configuration</h3>
        <p className="text-[0.8125rem] text-muted-foreground leading-[1.4] mb-3">
          Save your projects, environments, favorites and display settings to a JSON file you can
          share with your team. Recently used environments and the active environment stay on this
          device.
        </p>

        <p className="text-[0.8125rem] text-muted-foreground mb-3">
          {projectCount} project{projectCount === 1 ? '' : 's'} · {environmentCount} environment
          {environmentCount === 1 ? '' : 's'}
        </p>

        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={handleDownload} disabled={projectCount === 0}>
            <Download size={14} />
            Download JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={projectCount === 0}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* ── Import ── */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[0.9375rem] font-semibold text-foreground mb-1">Import Configuration</h3>
        <p className="text-[0.8125rem] text-muted-foreground leading-[1.4] mb-3">
          Load a configuration that was exported from Environment Switcher.
        </p>

        <div className="space-y-2 mb-3">
          <label className="flex items-start gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'merge'}
              onChange={() => { setImportMode('merge'); setConfirmingReplace(false); }}
              className="m-0 mt-0.5"
            />
            <span>
              Merge
              <span className="block text-[0.8125rem] font-normal text-muted-foreground leading-[1.4]">
                Add new projects and environments, keep everything you already have. Duplicate URLs
                are skipped and display settings stay unchanged.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm font-medium text-foreground cursor-pointer">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'replace'}
              onChange={() => { setImportMode('replace'); setConfirmingReplace(false); }}
              className="m-0 mt-0.5"
            />
            <span>
              Replace
              <span className="block text-[0.8125rem] font-normal text-muted-foreground leading-[1.4]">
                Discard the current configuration and use the imported one, including its display
                settings.
              </span>
            </span>
          </label>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={handleFilePick}
          className="hidden"
        />

        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={handleChooseFile}>
            {inTab ? <FileUp size={14} /> : <ExternalLink size={14} />}
            Choose file…
          </Button>
        </div>
        {!inTab && (
          <p className="text-[0.8125rem] text-muted-foreground leading-[1.4] mb-2">
            Opens this page in a tab first — the browser closes the popup when a file dialog appears.
            Pasting the JSON below works right here.
          </p>
        )}

        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); resetFeedback(); }}
          placeholder="…or paste the exported JSON here"
          spellCheck={false}
          rows={5}
          className="w-full rounded-md border border-input bg-card text-foreground text-xs font-mono p-2 outline-none focus:border-primary resize-y"
        />

        <div className="flex items-center gap-2 mt-2">
          <Button
            variant={confirmingReplace ? 'destructive' : 'default'}
            size="sm"
            onClick={handleImportClick}
            disabled={!importText.trim()}
          >
            <Upload size={14} />
            {confirmingReplace ? 'Confirm replace' : 'Import'}
          </Button>
          {confirmingReplace && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingReplace(false)}>
              Cancel
            </Button>
          )}
        </div>

        {confirmingReplace && (
          <p className="mt-2 text-[0.8125rem] text-destructive leading-[1.4]">
            This will delete your current {projectCount} project{projectCount === 1 ? '' : 's'} and{' '}
            {environmentCount} environment{environmentCount === 1 ? '' : 's'}.
          </p>
        )}

        {errors.length > 0 && (
          <ul className="mt-3 space-y-1">
            {errors.map((error, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-destructive leading-[1.4]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-amber-500 leading-[1.4]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}

        {success && (
          <p className="mt-3 flex items-start gap-1.5 text-[0.8125rem] text-emerald-500 leading-[1.4]">
            <Check size={13} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default DataSettingsPanel;
