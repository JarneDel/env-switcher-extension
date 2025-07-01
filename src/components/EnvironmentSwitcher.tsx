import React from 'react';
import type {Environment} from '../types';

interface Props {
  environments: Environment[];
  currentEnvironment?: Environment;
  onSwitch: (env: Environment) => void;
}

const EnvironmentSwitcher: React.FC<Props> = ({ 
  environments, 
  currentEnvironment, 
  onSwitch 
}) => {
  return (
    <div className="switcher-section">
      <h3>Environment</h3>
      <div className="environment-grid">
        {environments.map(env => (
          <button
            key={env.id}
            className={`env-button ${currentEnvironment?.id === env.id ? 'active' : ''}`}
            style={{ 
              '--env-color': env.color,
              backgroundColor: currentEnvironment?.id === env.id ? env.color : 'transparent',
              borderColor: env.color,
              color: currentEnvironment?.id === env.id ? 'white' : env.color
            } as React.CSSProperties}
            onClick={() => onSwitch(env)}
            title={`Switch to ${env.name} (${env.baseUrl})`}
          >
            <div className="env-name">{env.name}</div>
            <div className="env-url">{new URL(env.baseUrl).hostname}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;
