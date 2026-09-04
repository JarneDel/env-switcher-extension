import { useState, useRef, useEffect } from 'react';
import type { Environment, ExtensionConfig, Project } from '@/types';
import { getRandomColor, getSuggestedColorForEnvironment } from '@/shared/utils';
import { validateProject, validateEnvironment, hasValidationErrors } from '../utils/validationUtils';
import { getCurrentTabUrl, extractBaseDomain, URLUtils } from '../utils/urlUtils';

/** Debounce window for the cross-tab favicon refresh broadcast. */
const ENVIRONMENT_CHANGE_NOTIFY_DELAY_MS = 500;

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

  const [currentTabUrl, setCurrentTabUrl] = useState<string | undefined>(undefined);

  const configurationPanel = useRef<HTMLDivElement>(null);
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCurrentTabUrl().then(setCurrentTabUrl).catch(() => { /* ignore */ });
  }, []);

  // Flush any pending notification when the panel goes away.
  useEffect(() => () => {
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
  }, []);

  const currentEnvironment = (currentTabUrl && URLUtils.detectCurrentEnvironment(currentTabUrl, editingEnvironments))
    || (config.currentEnvironment ? editingEnvironments.find(e => e.id === config.currentEnvironment) : undefined);
  const currentProjectId = currentEnvironment?.projectId;

  /**
   * Ask the background to refresh favicons across every open tab.
   *
   * Colour and base-URL edits fire this on each keystroke, and the background
   * fans the message out to every tab, so it is debounced: without that, a
   * single typed character cost one config read plus a favicon re-render in
   * every open tab.
   */
  const notifyEnvironmentChange = () => {
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => {
      notifyTimer.current = null;
      try {
        if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
          void browser.runtime.sendMessage({ action: 'environmentChanged' })
            .catch(() => { /* background may be asleep — nothing to do */ });
        }
      } catch (error) {
        console.error('Failed to notify background of environment change:', error);
      }
    }, ENVIRONMENT_CHANGE_NOTIFY_DELAY_MS);
  };

  const handleProjectChange = (indexOrId: number | string, field: keyof Project, value: string) => {
    setEditingProjects(prev => {
      const index = typeof indexOrId === 'number'
        ? indexOrId
        : prev.findIndex(p => p.id === indexOrId);
      if (index === -1 || !prev[index]) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

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
    setEditingProjects(prev => [newProject, ...prev]);

    // Mark as newly added for auto-expand
    setNewlyAddedProjects(prev => new Set(prev).add(newProject.id));

    setTimeout(() => {
      if (configurationPanel.current) {
        configurationPanel.current.scrollTop = 0;
        if (configurationPanel.current.parentElement) {
          configurationPanel.current.parentElement.scrollTop = 0;
        }
      }
    }, 50);
  };

  const removeProject = (indexOrId: number | string) => {
    setEditingProjects(prev => {
      const index = typeof indexOrId === 'number'
        ? indexOrId
        : prev.findIndex(p => p.id === indexOrId);
      if (index === -1 || !prev[index]) return prev;
      const projectId = prev[index].id;
      setEditingEnvironments(prevEnvs => prevEnvs.filter(env => env.projectId !== projectId));
      return prev.filter((_, i) => i !== index);
    });

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
    // Use the current project if available, or first project, or create a default project
    let targetProjectId = projectId || (currentProjectId && editingProjects.some(p => p.id === currentProjectId) ? currentProjectId : undefined);
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
      setEditingProjects(prev => [defaultProject, ...prev]);
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
    setEditingEnvironments(prev => [newEnv, ...prev]);

    // Mark as newly added for auto-expand
    setNewlyAddedEnvironments(prev => new Set(prev).add(newEnv.id));
  };

  const addCurrentDomain = async (projectId?: string) => {
    try {
      const currentUrl = await getCurrentTabUrl();
      const baseDomain = extractBaseDomain(currentUrl);

      // Use the current project if available, or first project, or create a default project
      let targetProjectId = projectId || (currentProjectId && editingProjects.some(p => p.id === currentProjectId) ? currentProjectId : undefined);
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
        setEditingProjects(prev => [...prev, defaultProject]);
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

      // Derive a simple name from the hostname
      let environmentName = 'New Environment';
      try {
        const urlObj = new URL(baseDomain);
        const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
        environmentName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      } catch { /* keep default */ }

      const newEnv: Environment = {
        id: `env-${Date.now()}`,
        name: environmentName,
        baseUrl: baseDomain,
        color: getSuggestedColorForEnvironment(environmentName, baseDomain),
        projectId: targetProjectId!
      };

      setEditingEnvironments(prev => [newEnv, ...prev]);

      // Mark as newly added for auto-expand
      setNewlyAddedEnvironments(prev => new Set(prev).add(newEnv.id));
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
    currentTabUrl,
    currentProjectId,
    currentEnvironment,
    recentEnvironmentIds: config.recentEnvironmentIds || [],
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
