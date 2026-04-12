import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Eye, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import TabStrip from './TabStrip';
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
        <TabStrip
          activeTab={isDisplayTab ? 'display' : 'projects'}
          onTabChange={(id) => navigate(id === 'display' ? '/settings/display' : '/settings/projects')}
          tabs={[
            { id: 'projects', label: 'Projects', icon: <FolderOpen size={14} /> },
            { id: 'display', label: 'Display', icon: <Eye size={14} /> },
          ]}
        />

        <Routes>
          <Route path="/" element={<ProjectSettingsPanel />} />
          <Route path="/projects" element={<ProjectSettingsPanel />} />
          <Route path="/display" element={<DisplaySettingsPanel />} />
        </Routes>
      </div>
    </>
  );
}
