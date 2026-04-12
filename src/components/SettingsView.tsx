import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Bot, Eye, FolderOpen } from 'lucide-react';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import AISettingsPanel from './AISettingsPanel';
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
  const isAITab = location.pathname === '/settings/ai';
  const isDisplayTab = location.pathname === '/settings/display';

  return (
    <>
      <header className="app-header">
        <h1>Settings</h1>
        <div className="header-actions">
          <button
            className="back-btn"
            onClick={() => { onSettingsChange(); navigate(isConfigured ? '/' : '/setup'); }}
            title="Go back"
          >
            ←
          </button>
        </div>
      </header>

      <div className="settings-panel">
        <div className="settings-header">
          <div className="settings-tabs">
            <button
              className={`tab-btn ${isProjectsTab ? 'active' : ''}`}
              onClick={() => navigate('/settings/projects')}
            >
              <FolderOpen size={16} />
              Projects
            </button>
            <button
              className={`tab-btn ${isAITab ? 'active' : ''}`}
              onClick={() => navigate('/settings/ai')}
            >
              <Bot size={16} />
              AI
            </button>
            <button
              className={`tab-btn ${isDisplayTab ? 'active' : ''}`}
              onClick={() => navigate('/settings/display')}
            >
              <Eye size={16} />
              Display
            </button>
          </div>
        </div>

        <Routes>
          <Route
            path="/"
            element={<ProjectSettingsPanel />}
          />
          <Route
            path="/projects"
            element={<ProjectSettingsPanel />}
          />
          <Route
            path="/ai"
            element={<AISettingsPanel />}
          />
          <Route
            path="/display"
            element={<DisplaySettingsPanel />}
          />
        </Routes>
      </div>
    </>
  );
}
