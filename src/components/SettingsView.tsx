import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Eye, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import DisplaySettingsPanel from './DisplaySettingsPanel';

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

  const isProjectsTab = location.pathname === '/settings' || location.pathname === '/settings/projects';
  const isDisplayTab = location.pathname === '/settings/display';

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
        <div className="flex items-center gap-1 px-5 py-2 border-b border-border">
          <button
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative',
              isProjectsTab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={() => navigate('/settings/projects')}
          >
            {isProjectsTab && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-primary rounded-t-md" />
            )}
            <FolderOpen size={16} />
            Projects
          </button>
          <button
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative',
              isDisplayTab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={() => navigate('/settings/display')}
          >
            {isDisplayTab && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-primary rounded-t-md" />
            )}
            <Eye size={16} />
            Display
          </button>
        </div>

        <Routes>
          <Route path="/" element={<ProjectSettingsPanel />} />
          <Route path="/projects" element={<ProjectSettingsPanel />} />
          <Route path="/display" element={<DisplaySettingsPanel />} />
        </Routes>
      </div>
    </>
  );
}
