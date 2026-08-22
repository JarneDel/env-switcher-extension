import type { Environment, Project } from '../types';

/**
 * Validate a project object
 * @param project - Project to validate
 * @returns Array of validation error messages
 */
export const validateProject = (project: Project): string[] => {
  const errors: string[] = [];

  if (!project.name.trim()) {
    errors.push('Project name is required');
  }

  return errors;
};

/**
 * Validate an environment object
 * @param env - Environment to validate
 * @param projects - Available projects to check against
 * @returns Array of validation error messages
 */
export const validateEnvironment = (env: Environment, projects: Project[]): string[] => {
  const errors: string[] = [];

  if (!env.name.trim()) {
    errors.push('Name is required');
  }

  if (!env.baseUrl.trim()) {
    errors.push('Base URL is required');
  } else {
    try {
      new URL(env.baseUrl);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  if (!env.projectId || !projects.find(p => p.id === env.projectId)) {
    errors.push('Must belong to a valid project');
  }

  return errors;
};

/**
 * Check if configuration has validation errors
 * @param projects - Array of projects to validate
 * @param environments - Array of environments to validate
 * @returns True if there are validation errors
 */
export const hasValidationErrors = (projects: Project[], environments: Environment[]): boolean => {
  const projectErrors = projects.some(project => validateProject(project).length > 0);
  const envErrors = environments.some(env => validateEnvironment(env, projects).length > 0);
  return projectErrors || envErrors;
};

/**
 * Validate a URL string
 * @param urlString - URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
export const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if a string is a valid UUID
 * @param id - String to check
 * @returns True if the string is a valid UUID, false otherwise
 */
export const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
