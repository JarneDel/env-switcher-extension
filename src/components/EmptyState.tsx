import React from 'react';

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const EmptyState: React.FC<Props> = ({ title, description, icon }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
};

export default EmptyState;
