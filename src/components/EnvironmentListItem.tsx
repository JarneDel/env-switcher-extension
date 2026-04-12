import React, { useRef, useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { cn, capitalize } from '../lib/utils';
import type { Environment } from '@/types';
import ColorPicker from './ColorPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useConfiguration } from '../context/ConfigurationContext';

interface Props {
  environment: Environment;
  errors: string[];
}

const EnvironmentListItem: React.FC<Props> = ({ environment, errors }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { handleEnvironmentChange, removeEnvironment, newlyAddedEnvironments, clearNewlyAddedStatus } = useConfiguration();

  useEffect(() => {
    if (newlyAddedEnvironments.has(environment.id)) {
      setIsEditingName(true);
      setTimeout(() => {
        nameInputRef.current?.focus();
        clearNewlyAddedStatus(undefined, environment.id);
      }, 50);
    }
  }, [environment.id, newlyAddedEnvironments, clearNewlyAddedStatus]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleUrlBlur = (value: string) => {
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      handleEnvironmentChange(environment.id, 'baseUrl', `https://${value}`);
    }
  };

  return (
    <div className={cn('rounded-md border', errors.length > 0 ? 'border-destructive bg-destructive/5' : 'border-border')}>
      <div className="flex items-center gap-2 p-2">
        <ColorPicker
          value={environment.color}
          onChange={(color) => handleEnvironmentChange(environment.id, 'color', color)}
        />

        {isEditingName ? (
          <Input
            ref={nameInputRef}
            value={environment.name}
            onChange={(e) => handleEnvironmentChange(environment.id, 'name', e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            placeholder="Environment name"
            className="h-7 w-28 shrink-0 text-xs"
          />
        ) : (
          <span
            className="text-sm text-foreground w-28 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap cursor-text"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to edit name"
          >
            {capitalize(environment.name) || 'Unnamed'}
          </span>
        )}

        <Input
          type="text"
          value={environment.baseUrl}
          onChange={(e) => handleEnvironmentChange(environment.id, 'baseUrl', e.target.value)}
          onBlur={(e) => handleUrlBlur(e.target.value)}
          placeholder="https://example.com"
          className="h-7 flex-1 min-w-0 text-xs"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeEnvironment(environment.id)}
          title="Delete environment"
          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} />
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {errors.map((err, i) => (
            <span key={i} className="text-xs text-destructive">{err}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentListItem;
