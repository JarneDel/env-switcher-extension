import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { Save, Bot, Eye, FolderOpen } from 'lucide-react';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import AISettingsPanel from './AISettingsPanel';
import DisplaySettingsPanel from './DisplaySettingsPanel';

interface SettingsViewProps {
  isConfigured: boolean;
  saveHandler: (() => void) | null;
  hasErrors: (() => boolean) | null;
  onSettingsChange: () => void;
  onSaveReady: (saveHandlerFn: () => void, hasErrorsFn: () => boolean) => void;
}

export default function SettingsView({
  isConfigured,
  saveHandler,
  hasErrors,
  onSettingsChange,
  onSaveReady
}: SettingsViewProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSaveClick = () => {
    if (saveHandler) {
      saveHandler();
    }
  };

  const isProjectsTab = location.pathname === '/settings' || location.pathname === '/settings/projects';
  const isAITab = location.pathname === '/settings/ai';
  const isDisplayTab = location.pathname === '/settings/display';

  return (
    <>
      <header className="app-header">
        <h1>Settings</h1>
        <div className="header-actions">
          {saveHandler && (
            <button
              className="save-btn"
              onClick={handleSaveClick}
              disabled={hasErrors ? hasErrors() : false}
              title="Save changes"
            >
              <Save size={16} />
            </button>
          )}
          <button
            className="back-btn"
            onClick={() => navigate(isConfigured ? '/' : '/setup')}
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
            element={
              <ProjectSettingsPanel
                onSettingsChange={onSettingsChange}
                onSaveReady={onSaveReady}
              />
            }
          />
          <Route
            path="/projects"
            element={
              <ProjectSettingsPanel
                onSettingsChange={onSettingsChange}
                onSaveReady={onSaveReady}
              />
            }
          />
          <Route
            path="/ai"
            element={
              <AISettingsPanel
                onSettingsChange={onSettingsChange}
                onSaveReady={onSaveReady}
              />
            }
          />
          <Route
            path="/display"
            element={
              <DisplaySettingsPanel
                onSettingsChange={onSettingsChange}
                onSaveReady={onSaveReady}
              />
            }
          />
        </Routes>
      </div>
    </>
  );
}
