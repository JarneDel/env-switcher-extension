import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  errors: string[];
}

const ValidationErrors: React.FC<Props> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="validation-errors">
      {errors.map((error, i) => (
        <div key={i} className="error-message">
          <AlertTriangle size={12} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {error}
        </div>
      ))}
    </div>
  );
};

export default ValidationErrors;
