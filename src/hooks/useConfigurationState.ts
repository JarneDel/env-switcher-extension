import { useState, useRef } from 'react';
import type { Environment, ExtensionConfig, Project } from '../types';
import { getRandomColor } from '../libs/colorUtils';
import { validateProject, validateEnvironment, hasValidationErrors } from '../libs/validationUtils';
import { getCurrentTabUrl, extractBaseDomain } from '../libs/urlUtils';
import { generateEnvironmentName } from '../libs/aiUtils';
import { loadConfig } from '../libs/storage';
import browser from 'webextension-polyfill';

export const useConfigurationState = (config: ExtensionConfig) => {
  const [editingProjects, setEditingProjects] = useState<Project[]>(
    config.projects.map(project => ({ ...project }))
  );
  const [editingEnvironments, setEditingEnvironments] = useState<Environment[]>(
    config.environments.map(env => ({ ...env }))
  );

  // Track newly added items for auto-expand functionality
  const [newlyAddedProjects, setNewlyAddedProjects] = useState<Set<string>>(new Set());
  const [newlyAddedEnvironments, setNewlyAddedEnvironments] = useState<Set<string>>(new Set());

  const configurationPanel = useRef<HTMLDivElement>(null);

  // Notify background script when environments change
  const notifyEnvironmentChange = async () => {
    try {
      await browser.runtime.sendMessage({ action: 'environmentChanged' });
    } catch (error) {
      console.error('Failed to notify background of environment change:', error);
    }
  };

  const handleProjectChange = (index: number, field: keyof Project, value: string) => {
    const updated = [...editingProjects];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProjects(updated);

    // If color changed, notify background to refresh favicons
    if (field === 'color') {
      notifyEnvironmentChange();
    }
  };

  const addProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: 'New Project',
      description: '',
      color: getRandomColor()
    };
    setEditingProjects([...editingProjects, newProject]);

    // Mark as newly added for auto-expand
    setNewlyAddedProjects(prev => new Set(prev).add(newProject.id));
  };

  const removeProject = (index: number) => {
    const projectId = editingProjects[index].id;

    // Remove project
    setEditingProjects(editingProjects.filter((_, i) => i !== index));

    // Remove all environments belonging to this project
    setEditingEnvironments(editingEnvironments.filter(env => env.projectId !== projectId));

    // Notify background to refresh favicons
    notifyEnvironmentChange();
  };

  const handleEnvironmentChange = (envId: string, field: keyof Environment, value: string) => {
    const updated = editingEnvironments.map(env =>
      env.id === envId ? { ...env, [field]: value } : env
    );
    setEditingEnvironments(updated);

    // If color or baseUrl changed, notify background to refresh favicons
    if (field === 'color' || field === 'baseUrl') {
      notifyEnvironmentChange();
    }
  };

  const addEnvironment = (projectId?: string) => {
    // Use the first project if available, or create a default project
    let targetProjectId = projectId;
    if (!targetProjectId && editingProjects.length > 0) {
      targetProjectId = editingProjects[0].id;
    } else if (!targetProjectId) {
      // Create a default project first
      const defaultProject: Project = {
        id: `project-${Date.now()}`,
        name: 'Default Project',
        description: 'Default project for environments',
        color: getRandomColor()
      };
      setEditingProjects([...editingProjects, defaultProject]);
      setNewlyAddedProjects(prev => new Set(prev).add(defaultProject.id));
      targetProjectId = defaultProject.id;
    }

    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: 'New Environment',
      baseUrl: 'https://example.com',
      color: getRandomColor(),
      projectId: targetProjectId!
    };
    setEditingEnvironments([...editingEnvironments, newEnv]);

    // Mark as newly added for auto-expand
    setNewlyAddedEnvironments(prev => new Set(prev).add(newEnv.id));

    // scroll to the bottom to show the new environment
    setTimeout(() => {
      if (configurationPanel.current) {
        configurationPanel.current.scrollTop = configurationPanel.current.scrollHeight;
      }
    }, 100);
  };

  const addCurrentDomain = async (projectId?: string, useAI: boolean = true) => {
    try {
      const currentUrl = await getCurrentTabUrl();
      const baseDomain = extractBaseDomain(currentUrl);

      // Use the first project if available, or create a default project
      let targetProjectId = projectId;
      if (!targetProjectId && editingProjects.length > 0) {
        targetProjectId = editingProjects[0].id;
      } else if (!targetProjectId) {
        // Create a default project first
        const defaultProject: Project = {
          id: `project-${Date.now()}`,
          name: 'Default Project',
          description: 'Default project for environments',
          color: getRandomColor()
        };
        setEditingProjects([...editingProjects, defaultProject]);
        setNewlyAddedProjects(prev => new Set(prev).add(defaultProject.id));
        targetProjectId = defaultProject.id;
      }

      // Check if this domain already exists in the target project
      const existingEnvironment = editingEnvironments.find(env =>
        env.projectId === targetProjectId && env.baseUrl === baseDomain
      );

      if (existingEnvironment) {
        return;
      }

      // Try to generate AI name, fallback to manual extraction
      let environmentName = 'New Environment';

      if (useAI) {
        try {
          // Load AI config to check if AI naming is enabled
          const storedConfig = await loadConfig();
          const aiConfig = storedConfig.aiConfig;

          if (aiConfig?.enabled && aiConfig.url && aiConfig.model) {
            environmentName = await generateEnvironmentName(currentUrl, aiConfig);
          } else {
            // Fallback to manual extraction if AI is not configured
            const urlObj = new URL(baseDomain);
            const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
            environmentName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
          }
        } catch (aiError) {
          // AI naming failed, using fallback - silently handle
          // Fallback to manual extraction
          const urlObj = new URL(baseDomain);
          const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
          environmentName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        }
      } else {
        // Skip AI and go directly to manual extraction
        const urlObj = new URL(baseDomain);
        const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
        environmentName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }

      const newEnv: Environment = {
        id: `env-${Date.now()}`,
        name: environmentName,
        baseUrl: baseDomain,
        color: getRandomColor(),
        projectId: targetProjectId!
      };

      setEditingEnvironments([...editingEnvironments, newEnv]);

      // Mark as newly added for auto-expand
      setNewlyAddedEnvironments(prev => new Set(prev).add(newEnv.id));

      // scroll to the bottom to show the new environment
      setTimeout(() => {
        if (configurationPanel.current) {
          configurationPanel.current.scrollTop = configurationPanel.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      // Failed to add current domain - silently handle
      // Fallback to regular add environment if current domain detection fails
      addEnvironment(projectId);
    }
  };

  const removeEnvironment = (envId: string) => {
    setEditingEnvironments(editingEnvironments.filter(env => env.id !== envId));

    // Notify background to refresh favicons
    notifyEnvironmentChange();
  };

  const getEnvironmentsByProject = (projectId: string) => {
    return editingEnvironments.filter(env => env.projectId === projectId);
  };

  const buildUpdatedConfig = (): ExtensionConfig => {
    const updatedConfig = {
      ...config,
      projects: editingProjects,
      environments: editingEnvironments
    };

    // Notify background that configuration has been updated
    notifyEnvironmentChange();

    return updatedConfig;
  };

  // Create wrapper functions that match the original signatures
  const validateProjectWrapper = (project: Project): string[] => {
    return validateProject(project);
  };

  const validateEnvironmentWrapper = (env: Environment): string[] => {
    return validateEnvironment(env, editingProjects);
  };

  const hasValidationErrorsWrapper = (): boolean => {
    return hasValidationErrors(editingProjects, editingEnvironments);
  };

  // Helper function to clear newly added status
  const clearNewlyAddedStatus = (projectId?: string, environmentId?: string) => {
    if (projectId) {
      setNewlyAddedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
    if (environmentId) {
      setNewlyAddedEnvironments(prev => {
        const newSet = new Set(prev);
        newSet.delete(environmentId);
        return newSet;
      });
    }
  };

  return {
    editingProjects,
    editingEnvironments,
    newlyAddedProjects,
    newlyAddedEnvironments,
    clearNewlyAddedStatus,
    configurationPanel,
    handleProjectChange,
    addProject,
    removeProject,
    handleEnvironmentChange,
    addEnvironment,
    addCurrentDomain,
    removeEnvironment,
    validateProject: validateProjectWrapper,
    validateEnvironment: validateEnvironmentWrapper,
    hasValidationErrors: hasValidationErrorsWrapper,
    getEnvironmentsByProject,
    buildUpdatedConfig
  };
};
