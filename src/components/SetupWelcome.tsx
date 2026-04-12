import React from 'react';
import { Rocket, Globe, Languages, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  onStartSetup: () => void;
}

const SetupWelcome: React.FC<Props> = ({ onStartSetup }) => {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      <div className="max-w-xs w-full">
        <div className="text-5xl mb-4 text-muted-foreground"><Rocket size={48} /></div>
        <h2 className="text-xl font-semibold text-foreground mb-3">Welcome to Environment Switcher!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Get started by configuring your environments. You can add as many environments
          as you need - local development, testing, staging, production, and more.
        </p>

        <div className="text-left mb-8 space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Globe size={16} className="shrink-0 text-primary" />
            <span>Switch between environments with one click</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Languages size={16} className="shrink-0 text-primary" />
            <span>Automatic language detection and switching</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Settings size={16} className="shrink-0 text-primary" />
            <span>Fully customizable environment settings</span>
          </div>
        </div>

        <Button onClick={onStartSetup} size="lg" className="w-full">
          Configure Environments
        </Button>
      </div>
    </div>
  );
};

export default SetupWelcome;
