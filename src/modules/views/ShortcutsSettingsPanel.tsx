import React, { useState, useEffect } from 'react';
import { ExternalLink, Keyboard, Info, Check, Copy } from 'lucide-react';
import { Button } from '@/shared/ui';

interface CommandItem {
  name: string;
  description?: string;
  shortcut?: string;
}

export const ShortcutsSettingsPanel: React.FC = () => {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedFirefoxUrl, setCopiedFirefoxUrl] = useState(false);
  const [showFirefoxInstructions, setShowFirefoxInstructions] = useState(false);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        if (typeof browser !== 'undefined' && browser.commands?.getAll) {
          const list = await browser.commands.getAll();
          if (list && list.length > 0) {
            setCommands(list);
            return;
          }
        }
      } catch {
        // Fallback below
      } finally {
        setLoading(false);
      }

      // Default fallback representations if browser.commands.getAll is empty
      setCommands([
        {
          name: '_execute_action',
          description: 'Open Environment Switcher popup',
          shortcut: 'Ctrl+E',
        },
        {
          name: 'quick_switch',
          description: 'Open in-page quick switcher',
          shortcut: 'Alt+Shift+E',
        },
      ]);
    };

    void fetchCommands();
  }, []);

  const handleOpenBrowserSettings = async () => {
    try {
      const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
      if (isFirefox) {
        setShowFirefoxInstructions(true);
        return;
      }

      await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } catch {
      setShowFirefoxInstructions(true);
    }
  };

  const handleCopyFirefoxUrl = () => {
    navigator.clipboard.writeText('about:addons').then(() => {
      setCopiedFirefoxUrl(true);
      setTimeout(() => setCopiedFirefoxUrl(false), 2000);
    }).catch(() => { /* ignore */ });
  };

  const formatCommandTitle = (cmd: CommandItem) => {
    if (cmd.description) return cmd.description;
    if (cmd.name === '_execute_action' || cmd.name === '_execute_browser_action') {
      return 'Open Environment Switcher popup';
    }
    if (cmd.name === 'quick_switch') {
      return 'Open in-page quick switcher';
    }
    return cmd.name;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <div className="size-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading shortcuts…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-5 gap-6">
      {/* Overview header */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Keyboard size={16} className="text-primary" />
          Keyboard Shortcuts
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Browser extensions register keyboard shortcuts with the browser. You can customize, change, or disable them directly in your browser's extension settings.
        </p>
      </div>

      {/* Commands List */}
      <div className="flex flex-col gap-2.5">
        {commands.map((cmd) => (
          <div
            key={cmd.name}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 gap-3"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground truncate">
                {formatCommandTitle(cmd)}
              </span>
              <span className="text-xs text-muted-foreground font-mono truncate">
                {cmd.name}
              </span>
            </div>

            <div className="shrink-0">
              {cmd.shortcut ? (
                <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold bg-muted text-foreground rounded border border-border shadow-xs">
                  {cmd.shortcut}
                </kbd>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Not configured
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex flex-col gap-3 pt-1">
        <Button
          onClick={handleOpenBrowserSettings}
          className="w-full gap-2 justify-center"
        >
          <ExternalLink size={14} />
          Configure in Browser Settings
        </Button>

        {showFirefoxInstructions && (
          <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-border bg-muted/30 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Info size={14} className="text-primary shrink-0" />
              <span>Firefox Instructions</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Firefox does not allow extensions to open internal settings tabs directly. To configure:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 pl-1">
              <li>Open a new tab and navigate to <code className="font-mono text-foreground font-semibold">about:addons</code></li>
              <li>Click the gear icon (⚙️) in the top-right</li>
              <li>Select <strong>Manage Extension Shortcuts</strong></li>
            </ol>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFirefoxUrl}
                className="gap-1.5 text-xs h-7"
              >
                {copiedFirefoxUrl ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedFirefoxUrl ? 'Copied about:addons' : 'Copy about:addons'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-md border border-border/50">
          <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
          <span>
            Shortcut keybinds are managed natively by your browser so they work globally and avoid conflicts with other website hotkeys.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsSettingsPanel;
