import React from 'react';

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const EmptyState: React.FC<Props> = ({ title, description, icon }) => {
  return (
    <div className="flex flex-col items-center text-center px-4 py-8 bg-card rounded-lg mb-4">
      <div className="text-4xl mb-4 text-muted-foreground">{icon}</div>
      <h4 className="text-foreground text-lg font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default EmptyState;
