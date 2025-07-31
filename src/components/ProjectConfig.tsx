import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, X, Sparkles, Globe, Loader2 } from 'lucide-react';
import type { Environment, Project } from '../types';
import ColorPicker from './ColorPicker';
import ValidationErrors from './ValidationErrors';
import EnvironmentConfig from './EnvironmentConfig';
import { useConfiguration } from '../context/ConfigurationContext';
import { useCollapse } from '../hooks/useCollapse';

interface Props {
    project: Project;
    projectIndex: number;
    environments: Environment[];
    validateProject: (project: Project) => string[];
    validateEnvironment: (env: Environment) => string[];
}

const ProjectConfig: React.FC<Props> = ({
                                            project,
                                            projectIndex,
                                            environments,
                                            validateProject,
                                            validateEnvironment
                                        }) => {
    const [isProjectCollapsed, setIsProjectCollapsed] = useState(true);
    const [isEnvironmentsCollapsed, setIsEnvironmentsCollapsed] = useState(true);
    const [isAILoading, setIsAILoading] = useState(false);

    const {
        handleProjectChange,
        removeProject,
        addEnvironment,
        addCurrentDomain,
        newlyAddedProjects,
        newlyAddedEnvironments,
        clearNewlyAddedStatus
    } = useConfiguration();

    // Handle AI domain addition with loading state
    const handleAIAddCurrentDomain = async () => {
        setIsAILoading(true);
        try {
            await addCurrentDomain(project.id, true);
        } finally {
            setIsAILoading(false);
        }
    };

    // Auto-expand newly added projects
    useEffect(() => {
        if (newlyAddedProjects.has(project.id)) {
            setIsProjectCollapsed(false);
            setIsEnvironmentsCollapsed(false);
            // Clear the newly added status after a delay to allow animation
            setTimeout(() => {
                clearNewlyAddedStatus(project.id);
            }, 300);
        }
    }, [project.id, newlyAddedProjects, clearNewlyAddedStatus]);

    // Auto-expand environments section when new environments are added to this project
    useEffect(() => {
        const hasNewEnvironment = environments.some(env => newlyAddedEnvironments.has(env.id));
        if (hasNewEnvironment) {
            setIsEnvironmentsCollapsed(false);
            // Also expand the project if it's collapsed
            if (isProjectCollapsed) {
                setIsProjectCollapsed(false);
            }
        }
    }, [environments, newlyAddedEnvironments, isProjectCollapsed]);

    const { collapseProps: projectCollapseProps } = useCollapse({
        isCollapsed: isProjectCollapsed,
        duration: 200
    });
    const { collapseProps: environmentsCollapseProps } = useCollapse({
        isCollapsed: isEnvironmentsCollapsed,
        duration: 200
    });

    const projectErrors = validateProject(project);

    return (
        <div className={`project-config ${projectErrors.length > 0 ? 'has-errors' : ''}`}>
            <div className="project-header">
                <div className="project-info">
                    <button
                        onClick={() => setIsProjectCollapsed(!isProjectCollapsed)}
                        className="collapse-btn"
                        title={isProjectCollapsed ? 'Expand project' : 'Collapse project'}
                    >
                        {isProjectCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <span className="project-number">{project.name || `Project #${projectIndex + 1}`}</span>
                    <span className="env-count">({environments.length} environments)</span>
                </div>
                <button
                    onClick={() => removeProject(projectIndex)}
                    className="remove-btn"
                    title="Remove project"
                >
                    <X size={16} />
                </button>
            </div>

            <div {...projectCollapseProps}>
                <div className="project-content-inner">
                    <div className="project-config-row">
                        <div className="input-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                placeholder="e.g., mil.be, buildwise, sport-vlaanderen"
                                value={project.name}
                                onChange={(e) => handleProjectChange(projectIndex, 'name', e.target.value)}
                                className="env-input"
                            />
                        </div>
                        <div className="input-group color-group">
                            <label>Color</label>
                            <ColorPicker
                                value={project.color || '#6b7280'}
                                onChange={(color) => handleProjectChange(projectIndex, 'color', color)}
                                className="color-input"
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="Brief description of this project"
                            value={project.description || ''}
                            onChange={(e) => handleProjectChange(projectIndex, 'description', e.target.value)}
                            className="env-input"
                        />
                    </div>

                    <ValidationErrors errors={projectErrors} />

                    {/* Environments for this project */}
                    <div className="project-environments">
                        <div className="environments-header">
                            <div className="environments-title-section">
                                <button
                                    onClick={() => setIsEnvironmentsCollapsed(!isEnvironmentsCollapsed)}
                                    className="collapse-btn"
                                    title={isEnvironmentsCollapsed ? 'Expand environments' : 'Collapse environments'}
                                >
                                    {isEnvironmentsCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <h5>Environments</h5>
                            </div>
                            <div className="environment-actions">
                                <button
                                    onClick={() => addEnvironment(project.id)}
                                    className="add-env-btn-small"
                                    title="Add a new environment"
                                >
                                    + Add Environment
                                </button>
                                <button
                                    onClick={handleAIAddCurrentDomain}
                                    className="add-current-domain-btn icon-btn"
                                    title="Add current domain with AI naming"
                                    disabled={isAILoading}
                                >
                                    {isAILoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                </button>
                                <button
                                    onClick={() => addCurrentDomain(project.id, false)}
                                    className="add-current-domain-btn icon-btn"
                                    title="Add current domain without AI"
                                >
                                    <Globe size={16} />
                                </button>
                            </div>
                        </div>

                        <div {...environmentsCollapseProps}>
                            <div className="environments-content-inner">
                                {environments.map((env) => {
                                    const errors = validateEnvironment(env);

                                    return (
                                        <EnvironmentConfig
                                            key={env.id}
                                            environment={env}
                                            errors={errors}
                                        />
                                    );
                                })}

                                {environments.length === 0 && (
                                    <div className="no-environments">
                                        <p>No environments in this project yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectConfig;
