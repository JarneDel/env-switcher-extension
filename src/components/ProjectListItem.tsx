import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Project, Environment } from '../types';
import ColorPicker from './ColorPicker';
import EnvironmentListItem from './EnvironmentListItem';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useConfiguration } from '../context/ConfigurationContext';
import { useCollapse } from '../hooks/useCollapse';

interface Props {
  project: Project;
  projectIndex: number;
  environments: Environment[];
  validateProject: (project: Project) => string[];
  validateEnvironment: (env: Environment) => string[];
}

const ProjectListItem: React.FC<Props> = ({
  project,
  projectIndex,
  environments,
  validateProject,
  validateEnvironment,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    handleProjectChange,
    removeProject,
    addEnvironment,
    addCurrentDomain,
    newlyAddedProjects,
    clearNewlyAddedStatus,
  } = useConfiguration();

  useEffect(() => {
    if (newlyAddedProjects.has(project.id)) {
      setIsCollapsed(false);
      setIsEditingName(true);
      setTimeout(() => {
        nameInputRef.current?.focus();
        clearNewlyAddedStatus(project.id);
      }, 50);
    }
  }, [project.id, newlyAddedProjects, clearNewlyAddedStatus]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const { collapseProps } = useCollapse({ isCollapsed, duration: 150 });

  const projectErrors = validateProject(project);

  return (
    <div className={cn(
      'rounded-md border bg-card',
      projectErrors.length > 0 ? 'border-destructive' : 'border-border'
    )}>
      {/* project header row */}
      <div className="flex items-center gap-2 p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className="shrink-0 text-muted-foreground"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </Button>

        <ColorPicker
          value={project.color || '#6b7280'}
          onChange={(color) => handleProjectChange(projectIndex, 'color', color)}
        />

        {isEditingName ? (
          <Input
            ref={nameInputRef}
            value={project.name}
            onChange={(e) => handleProjectChange(projectIndex, 'name', e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false); }}
            placeholder="Project name"
            className="h-7 flex-1 text-xs"
          />
        ) : (
          <span
            className="text-sm text-foreground flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap cursor-text"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to edit"
          >
            {project.name || `Project #${projectIndex + 1}`}
          </span>
        )}

        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {environments.length}
        </Badge>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeProject(projectIndex)}
          title="Delete project"
          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {projectErrors.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-1">
          {projectErrors.map((err, i) => (
            <span key={i} className="text-xs text-destructive">{err}</span>
          ))}
        </div>
      )}

      {/* collapsible environment list */}
      <div {...collapseProps}>
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {environments.map((env) => (
            <EnvironmentListItem
              key={env.id}
              environment={env}
              errors={validateEnvironment(env)}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addEnvironment(project.id)}
              className="flex-1 text-xs h-7"
            >
              <Plus size={12} /> Add new
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addCurrentDomain(project.id)}
              className="flex-1 text-xs h-7"
            >
              <Globe size={12} /> Add current
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectListItem;