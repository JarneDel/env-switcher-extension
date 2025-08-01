import React, {useState, useEffect} from 'react';
import { Loader2, CheckCircle, XCircle, Plug, AlertTriangle } from 'lucide-react';
import {getAvailableModels, type LMStudioConfig, type LMStudioModel, testLMStudioConnection} from '../libs/aiUtils';

interface Props {
  config: LMStudioConfig;
  onConfigChange: (config: LMStudioConfig) => void;
}

const AISettings: React.FC<Props> = ({ config, onConfigChange }) => {
  const [models, setModels] = useState<LMStudioModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  // Load models automatically when component mounts if URL is configured
  useEffect(() => {
    if (config.url.trim()) {
      loadModelsAndTestConnection();
    }
  }, []);

  const handleUrlChange = (url: string) => {
    onConfigChange({ ...config, url });
    setConnectionStatus('idle');
    setModels([]);
  };

  const loadModelsAndTestConnection = async () => {
    if (!config.url.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Test connection first
      const isConnected = await testLMStudioConnection(config.url);
      if (isConnected) {
        setConnectionStatus('success');
        // Load models if connection is successful
        const availableModels = await getAvailableModels(config.url);
        setModels(availableModels);

        // If current model is not in the list, clear it
        if (config.model && !availableModels.find(m => m.id === config.model)) {
          onConfigChange({ ...config, model: '' });
        }
      } else {
        setConnectionStatus('error');
        setError('Failed to connect to LM Studio. Please check the URL and ensure LM Studio is running.');
        setModels([]);
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('Connection test failed');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.url.trim()) {
      setError('Please enter an LM Studio URL');
      return;
    }

    setTestingConnection(true);
    await loadModelsAndTestConnection();
    setTestingConnection(false);
  };

  const loadModels = async () => {
    if (!config.url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const availableModels = await getAvailableModels(config.url);
      setModels(availableModels);

      // If current model is not in the list, clear it
      if (config.model && !availableModels.find(m => m.id === config.model)) {
        onConfigChange({ ...config, model: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="ai-settings">
        <div className="setting-item">
          <label className="setting-label">
            <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => onConfigChange({ ...config, enabled: e.target.checked })}
            />
            Enable AI Environment Naming
          </label>
          <div className="setting-description">
            Use AI to automatically suggest intelligent environment names based on URLs
          </div>
        </div>

        {config.enabled && (
            <>
              <div className="setting-item">
                <label className="setting-label-text">LM Studio URL</label>
                <div className="url-input-group">
                  <input
                      type="url"
                      value={config.url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="http://localhost:1234"
                      className="setting-input"
                  />
                  <button
                      onClick={handleTestConnection}
                      disabled={testingConnection || !config.url.trim()}
                      className={`test-connection-btn ${connectionStatus}`}
                  >
                    {testingConnection ? <Loader2 size={16} className="animate-spin" /> :
                        connectionStatus === 'success' ? <CheckCircle size={16} /> :
                            connectionStatus === 'error' ? <XCircle size={16} /> : <Plug size={16} />}
                    {testingConnection ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <div className="setting-description">
                  Enter the URL where LM Studio is running (typically http://localhost:1234)
                </div>
              </div>

              {(connectionStatus === 'success' || models.length > 0) && (
                  <div className="setting-item">
                    <label className="setting-label-text">Model</label>
                    {loading ? (
                        <div className="model-loading">Loading models...</div>
                    ) : models.length > 0 ? (
                        <select
                            value={config.model}
                            onChange={(e) => onConfigChange({ ...config, model: e.target.value })}
                            className="setting-select"
                        >
                          <option value="">Select a model</option>
                          {models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name}
                              </option>
                          ))}
                        </select>
                    ) : (
                        <div className="no-models">No models available. Please load a model in LM Studio.</div>
                    )}
                    <div className="setting-description">
                      Choose the AI model to use for generating environment names
                    </div>
                  </div>
              )}

              {error && (
                  <div className="ai-error">
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {error}
                  </div>
              )}
            </>
        )}
      </div>
  );
};

export default AISettings;