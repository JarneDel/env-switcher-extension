import React, { createContext, useContext } from 'react';
import type { Environment, ExtensionConfig, Project } from '../types';
import { useConfigurationState } from '../hooks/useConfigurationState';

interface ConfigurationContextType {
  editingProjects: Project[];
  editingEnvironments: Environment[];
  configurationPanel: React.RefObject<HTMLDivElement | null>;
  handleProjectChange: (index: number, field: keyof Project, value: string) => void;
  addProject: () => void;
  removeProject: (index: number) => void;
  handleEnvironmentChange: (envId: string, field: keyof Environment, value: string) => void;
  addEnvironment: (projectId?: string) => void;
  addCurrentDomain: (projectId?: string) => Promise<void>;
  removeEnvironment: (envId: string) => void;
  validateProject: (project: Project) => string[];
  validateEnvironment: (env: Environment) => string[];
  hasValidationErrors: () => boolean;
  getEnvironmentsByProject: (projectId: string) => Environment[];
  buildUpdatedConfig: () => ExtensionConfig;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

interface ConfigurationProviderProps {
  children: React.ReactNode;
  config: ExtensionConfig;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({
  children,
  config
}) => {
  const configurationState = useConfigurationState(config);

  return (
    <ConfigurationContext.Provider value={configurationState}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};
