import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus, Globe } from 'lucide-react';
import { capitalize } from '@/shared/utils';
import type { Project, Environment } from '@/types';
import { extractBaseDomain } from '../utils/urlUtils';
import { ColorPicker } from '@/modules/visual-indicators';
import EnvironmentListItem from './EnvironmentListItem';
import { Button, Input, Badge } from '@/shared/ui';
import { useConfiguration } from '../context/ConfigurationContext';
import { useCollapse } from '@/shared/hooks';

interface Props {
  project: Project;
  projectIndex: number;
  environments: Environment[];
  validateProject: (project: Project) => string[];
  validateEnvironment: (env: Environment) => string[];
  isCurrent?: boolean;
  isRecent?: boolean;
}

const ProjectListItem: React.FC<Props> = ({
  project,
  projectIndex,
  environments,
  validateProject,
  validateEnvironment,
  isCurrent = false,
  isRecent = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(!isCurrent);
  const hasManuallyToggled = useRef(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    handleProjectChange,
    removeProject,
    addEnvironment,
    addCurrentDomain,
    newlyAddedProjects,
    clearNewlyAddedStatus,
    currentTabUrl,
  } = useConfiguration();

  // Auto-expand if this project becomes current (and user hasn't manually collapsed it)
  useEffect(() => {
    if (isCurrent && !hasManuallyToggled.current) {
      setIsCollapsed(false);
    }
  }, [isCurrent]);

  const isAlreadyTracked = (() => {
    if (!currentTabUrl) return false;
    try {
      const base = extractBaseDomain(currentTabUrl);
      return environments.some(env => env.baseUrl === base);
    } catch {
      return false;
    }
  })();

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
    <div
      className="flex flex-col border-l pl-3"
      style={{ borderColor: project.color || '#6b7280' }}
    >
      {/* project header row */}
      <div className="flex items-center gap-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            hasManuallyToggled.current = true;
            setIsCollapsed(!isCollapsed);
          }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setIsEditingName(false);
              }
            }}
            placeholder="Project name"
            className="h-7 flex-1 text-xs"
          />
        ) : (
          <span
            className="text-sm text-foreground flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap cursor-text flex items-center gap-1.5"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to edit"
          >
            <span className="truncate">{capitalize(project.name) || `Project #${projectIndex + 1}`}</span>
            {isCurrent ? (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-primary border-primary/30 bg-primary/5 shrink-0 font-normal">
                current
              </Badge>
            ) : isRecent ? (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-500/90 border-amber-500/30 bg-amber-500/5 shrink-0 font-normal">
                recent
              </Badge>
            ) : null}
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
        <div className="flex flex-wrap gap-1 pb-1">
          {projectErrors.map((err, i) => (
            <span key={i} className="text-xs text-destructive">{err}</span>
          ))}
        </div>
      )}

      {/* collapsible environment list */}
      <div {...collapseProps}>
        <div className="flex flex-col gap-1.5 pb-1 pt-1">
          <div className="flex gap-2 pb-1">
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
              disabled={isAlreadyTracked}
              title={isAlreadyTracked ? 'Current page is already tracked in this project' : undefined}
            >
              <Globe size={12} /> Add current
            </Button>
          </div>
          {environments.map((env) => (
            <EnvironmentListItem
              key={env.id}
              environment={env}
              errors={validateEnvironment(env)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectListItem;