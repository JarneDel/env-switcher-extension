import React from 'react';
import { Rocket, Globe, Languages, Settings } from 'lucide-react';

interface Props {
  onStartSetup: () => void;
}

const SetupWelcome: React.FC<Props> = ({ onStartSetup }) => {
  return (
    <div className="setup-welcome">
      <div className="welcome-content">
        <div className="welcome-icon"><Rocket size={48} /></div>
        <h2>Welcome to Environment Switcher!</h2>
        <p>
          Get started by configuring your environments. You can add as many environments 
          as you need - local development, testing, staging, production, and more.
        </p>
        
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon"><Globe size={16} /></span>
            <span>Switch between environments with one click</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"><Languages size={16} /></span>
            <span>Automatic language detection and switching</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"><Settings size={16} /></span>
            <span>Fully customizable environment settings</span>
          </div>
        </div>

        <button onClick={onStartSetup} className="setup-btn">
          Configure Environments
        </button>
      </div>
    </div>
  );
};

export default SetupWelcome;
