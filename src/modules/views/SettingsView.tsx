import { useEffect } from 'react';
import { useNavigate, useLocation } from '@/shared/router';
import { Eye, FolderOpen, Share2, Keyboard } from 'lucide-react';
import { Button, TabStrip } from '@/shared/ui';
import { ProjectSettingsPanel } from '@/modules/environments';
import { DisplaySettingsPanel } from '@/modules/visual-indicators';
import { DataSettingsPanel } from '@/modules/sync';
import ShortcutsSettingsPanel from './ShortcutsSettingsPanel';

interface SettingsViewProps {
  isConfigured: boolean;
  onSettingsChange: () => void;
}

export default function SettingsView({
  isConfigured,
  onSettingsChange
}: SettingsViewProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement as HTMLElement | null;
        const inInput = activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable
        );

        e.preventDefault();
        e.stopPropagation();

        if (inInput) {
          activeEl.blur();
          return;
        }

        onSettingsChange();
        navigate(isConfigured ? '/' : '/setup');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfigured, navigate, onSettingsChange]);

  const activeTab = location.pathname === '/settings/display'
    ? 'display'
    : location.pathname === '/settings/data'
      ? 'data'
      : location.pathname === '/settings/shortcuts'
        ? 'shortcuts'
        : 'projects';

  return (
    <>
      {/* header */}
      <header className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-card-foreground">Settings</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { onSettingsChange(); navigate(isConfigured ? '/' : '/setup'); }}
          title="Go back"
          className="text-muted-foreground"
        >
          ←
        </Button>
      </header>

      {/* tab strip + content */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <TabStrip
          activeTab={activeTab}
          onTabChange={(id) => navigate(`/settings/${id}`)}
          tabs={[
            { id: 'projects', label: 'Projects', icon: <FolderOpen size={14} /> },
            { id: 'display', label: 'Display', icon: <Eye size={14} /> },
            { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={14} /> },
            { id: 'data', label: 'Share', icon: <Share2 size={14} /> },
          ]}
        />

        {activeTab === 'display' ? (
          <DisplaySettingsPanel />
        ) : activeTab === 'data' ? (
          <DataSettingsPanel />
        ) : activeTab === 'shortcuts' ? (
          <ShortcutsSettingsPanel />
        ) : (
          <ProjectSettingsPanel />
        )}
      </div>
    </>
  );
}
