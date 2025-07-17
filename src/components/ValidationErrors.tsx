import React from 'react';

interface Props {
  errors: string[];
}

const ValidationErrors: React.FC<Props> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="validation-errors">
      {errors.map((error, i) => (
        <div key={i} className="error-message">⚠️ {error}</div>
      ))}
    </div>
  );
};

export default ValidationErrors;
