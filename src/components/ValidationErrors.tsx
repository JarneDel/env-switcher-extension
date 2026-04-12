import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  errors: string[];
}

const ValidationErrors: React.FC<Props> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {errors.map((error, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle size={12} className="shrink-0" />
          {error}
        </div>
      ))}
    </div>
  );
};

export default ValidationErrors;
