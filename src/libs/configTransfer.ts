import type { Environment, ExtensionConfig, FavoritePage, Project } from '@/types';

/** Marker written into every export so we can recognise our own files. */
export const SHAREABLE_FORMAT = 'env-switcher-config';
export const SHAREABLE_VERSION = 1;

/**
 * Display preferences that travel with a shared configuration.
 * Device-local state (current environment, recents, onboarding flags) is
 * deliberately left out — it is meaningless on someone else's machine.
 */
export interface ShareableSettings {
  autoDetectLanguages: boolean;
  faviconEnabled: boolean;
  borderEnabled: boolean;
  borderHeight: number;
  minimalBorderEnabled: boolean;
  minimalBorderHeight: number;
  recentsProjectScoped: boolean;
}

export interface ShareableConfig {
  format: typeof SHAREABLE_FORMAT;
  version: number;
  exportedAt: string;
  projects: Project[];
  environments: Environment[];
  favorites: FavoritePage[];
  settings: ShareableSettings;
}

export type ImportMode = 'merge' | 'replace';

export interface ParseResult {
  /** Parsed payload, or null when the input could not be used at all. */
  data: ShareableConfig | null;
  /** Fatal problems — import is not possible. */
  errors: string[];
  /** Non-fatal problems — entries that were dropped or repaired. */
  warnings: string[];
}

export interface ImportSummary {
  projectsAdded: number;
  projectsMerged: number;
  environmentsAdded: number;
  environmentsSkipped: number;
  favoritesAdded: number;
  settingsApplied: boolean;
}

export interface ImportResult {
  config: ExtensionConfig;
  summary: ImportSummary;
}

// ── Export ───────────────────────────────────────────────────────────────────

export const buildShareableConfig = (config: ExtensionConfig, exportedAt = new Date()): ShareableConfig => ({
  format: SHAREABLE_FORMAT,
  version: SHAREABLE_VERSION,
  exportedAt: exportedAt.toISOString(),
  projects: config.projects.map(p => ({
    id: p.id,
    name: p.name,
    ...(p.description !== undefined ? { description: p.description } : {}),
    ...(p.color !== undefined ? { color: p.color } : {}),
  })),
  environments: config.environments.map(e => ({
    id: e.id,
    name: e.name,
    baseUrl: e.baseUrl,
    color: e.color,
    projectId: e.projectId,
  })),
  favorites: (config.favorites ?? []).map(f => ({
    key: f.key,
    url: f.url,
    title: f.title,
    projectId: f.projectId,
    ...(f.language !== undefined ? { language: f.language } : {}),
    addedAt: f.addedAt,
  })),
  settings: {
    autoDetectLanguages: config.autoDetectLanguages ?? true,
    faviconEnabled: config.faviconEnabled ?? false,
    borderEnabled: config.borderEnabled ?? false,
    borderHeight: config.borderHeight ?? 3,
    minimalBorderEnabled: config.minimalBorderEnabled ?? false,
    minimalBorderHeight: config.minimalBorderHeight ?? 4,
    recentsProjectScoped: config.recentsProjectScoped ?? false,
  },
});

export const serializeConfig = (config: ExtensionConfig): string =>
  JSON.stringify(buildShareableConfig(config), null, 2);

export const buildExportFilename = (date = new Date()): string => {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return `env-switcher-config-${stamp}.json`;
};

/** Triggers a browser download of the given JSON text. */
export const downloadJson = (filename: string, json: string): void => {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

// ── Import ───────────────────────────────────────────────────────────────────

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidUrlString = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const clampedHeight = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(10, Math.max(1, Math.round(value)))
    : fallback;

/**
 * Parse and validate a shared configuration file.
 * Invalid individual entries are dropped with a warning rather than failing
 * the whole import — a partially usable file is still worth importing.
 */
export const parseShareableConfig = (raw: string): ParseResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw.trim()) {
    return { data: null, errors: ['Nothing to import — paste JSON or choose a file first.'], warnings };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: null, errors: ['Not valid JSON — check that the whole file was copied.'], warnings };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { data: null, errors: ['Unexpected file contents — expected a configuration object.'], warnings };
  }

  if (parsed.format !== SHAREABLE_FORMAT) {
    return {
      data: null,
      errors: ['This is not an Environment Switcher configuration file.'],
      warnings,
    };
  }

  if (typeof parsed.version !== 'number' || parsed.version > SHAREABLE_VERSION) {
    return {
      data: null,
      errors: [`Unsupported file version (${parsed.version}). Update the extension and try again.`],
      warnings,
    };
  }

  // Projects
  const rawProjects: any[] = Array.isArray(parsed.projects) ? parsed.projects : [];
  if (!Array.isArray(parsed.projects)) warnings.push('No projects found in the file.');

  const projects: Project[] = [];
  const projectIds = new Set<string>();
  rawProjects.forEach((p, index) => {
    if (!p || typeof p !== 'object' || !isNonEmptyString(p.id) || !isNonEmptyString(p.name)) {
      warnings.push(`Skipped project #${index + 1}: missing an id or name.`);
      return;
    }
    if (projectIds.has(p.id)) {
      warnings.push(`Skipped duplicate project "${p.name}".`);
      return;
    }
    projectIds.add(p.id);
    projects.push({
      id: p.id,
      name: p.name,
      ...(isNonEmptyString(p.description) ? { description: p.description } : {}),
      ...(isNonEmptyString(p.color) ? { color: p.color } : {}),
    });
  });

  // Environments
  const rawEnvironments: any[] = Array.isArray(parsed.environments) ? parsed.environments : [];
  if (!Array.isArray(parsed.environments)) warnings.push('No environments found in the file.');

  const environments: Environment[] = [];
  const environmentIds = new Set<string>();
  rawEnvironments.forEach((e, index) => {
    const label = isNonEmptyString(e?.name) ? `"${e.name}"` : `#${index + 1}`;
    if (!e || typeof e !== 'object' || !isNonEmptyString(e.id) || !isNonEmptyString(e.name)) {
      warnings.push(`Skipped environment ${label}: missing an id or name.`);
      return;
    }
    if (!isNonEmptyString(e.baseUrl) || !isValidUrlString(e.baseUrl)) {
      warnings.push(`Skipped environment ${label}: invalid base URL.`);
      return;
    }
    if (!isNonEmptyString(e.projectId) || !projectIds.has(e.projectId)) {
      warnings.push(`Skipped environment ${label}: it belongs to a project that is not in the file.`);
      return;
    }
    if (environmentIds.has(e.id)) {
      warnings.push(`Skipped duplicate environment ${label}.`);
      return;
    }
    environmentIds.add(e.id);
    environments.push({
      id: e.id,
      name: e.name,
      baseUrl: e.baseUrl,
      color: isNonEmptyString(e.color) ? e.color : '#64748b',
      projectId: e.projectId,
    });
  });

  // Favorites
  const rawFavorites: any[] = Array.isArray(parsed.favorites) ? parsed.favorites : [];
  const favorites: FavoritePage[] = [];
  rawFavorites.forEach(f => {
    if (!f || typeof f !== 'object') return;
    if (!isNonEmptyString(f.key) || !isNonEmptyString(f.url) || !isNonEmptyString(f.projectId)) return;
    if (!projectIds.has(f.projectId)) return;
    favorites.push({
      key: f.key,
      url: f.url,
      title: isNonEmptyString(f.title) ? f.title : f.key,
      projectId: f.projectId,
      ...(isNonEmptyString(f.language) ? { language: f.language } : {}),
      addedAt: typeof f.addedAt === 'number' ? f.addedAt : Date.now(),
    });
  });

  // Settings
  const s = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
  const settings: ShareableSettings = {
    autoDetectLanguages: bool(s.autoDetectLanguages, true),
    faviconEnabled: bool(s.faviconEnabled, false),
    borderEnabled: bool(s.borderEnabled, false),
    borderHeight: clampedHeight(s.borderHeight, 3),
    minimalBorderEnabled: bool(s.minimalBorderEnabled, false),
    minimalBorderHeight: clampedHeight(s.minimalBorderHeight, 4),
    recentsProjectScoped: bool(s.recentsProjectScoped, false),
  };

  if (projects.length === 0) {
    errors.push('The file contains no usable projects.');
  }

  return {
    data: errors.length > 0 ? null : {
      format: SHAREABLE_FORMAT,
      version: parsed.version,
      exportedAt: isNonEmptyString(parsed.exportedAt) ? parsed.exportedAt : new Date().toISOString(),
      projects,
      environments,
      favorites,
      settings,
    },
    errors,
    warnings,
  };
};

const normalizeUrl = (url: string): string => url.trim().toLowerCase().replace(/\/+$/, '');
const normalizeName = (name: string): string => name.trim().toLowerCase();

/**
 * Apply an imported configuration on top of the current one.
 *
 * `replace` discards everything currently stored. `merge` keeps existing
 * projects and environments, matching incoming projects by id and then by
 * name, and skipping environments whose base URL already exists in the
 * project they'd land in.
 */
export const applyImport = (
  current: ExtensionConfig,
  incoming: ShareableConfig,
  mode: ImportMode
): ImportResult => {
  if (mode === 'replace') {
    return {
      config: {
        ...current,
        projects: incoming.projects.map(p => ({ ...p })),
        environments: incoming.environments.map(e => ({ ...e })),
        favorites: incoming.favorites.map(f => ({ ...f })),
        ...incoming.settings,
        currentEnvironment: undefined,
        recentEnvironmentIds: [],
      },
      summary: {
        projectsAdded: incoming.projects.length,
        projectsMerged: 0,
        environmentsAdded: incoming.environments.length,
        environmentsSkipped: 0,
        favoritesAdded: incoming.favorites.length,
        settingsApplied: true,
      },
    };
  }

  const projects: Project[] = current.projects.map(p => ({ ...p }));
  const environments: Environment[] = current.environments.map(e => ({ ...e }));
  const favorites: FavoritePage[] = (current.favorites ?? []).map(f => ({ ...f }));

  const takenProjectIds = new Set(projects.map(p => p.id));
  const takenEnvironmentIds = new Set(environments.map(e => e.id));
  /** Imported project id → id it ended up as in the merged config. */
  const projectIdMap = new Map<string, string>();

  let projectsAdded = 0;
  let projectsMerged = 0;
  let uniqueCounter = 0;
  const uniqueId = (prefix: string, taken: Set<string>): string => {
    let id = `${prefix}-${Date.now()}-${uniqueCounter++}`;
    while (taken.has(id)) id = `${prefix}-${Date.now()}-${uniqueCounter++}`;
    return id;
  };

  for (const incomingProject of incoming.projects) {
    const byId = projects.find(p => p.id === incomingProject.id);
    if (byId) {
      projectIdMap.set(incomingProject.id, byId.id);
      projectsMerged++;
      continue;
    }
    const byName = projects.find(p => normalizeName(p.name) === normalizeName(incomingProject.name));
    if (byName) {
      projectIdMap.set(incomingProject.id, byName.id);
      projectsMerged++;
      continue;
    }
    const newProject: Project = { ...incomingProject };
    projects.push(newProject);
    takenProjectIds.add(newProject.id);
    projectIdMap.set(incomingProject.id, newProject.id);
    projectsAdded++;
  }

  let environmentsAdded = 0;
  let environmentsSkipped = 0;

  for (const incomingEnv of incoming.environments) {
    const projectId = projectIdMap.get(incomingEnv.projectId);
    if (!projectId) {
      environmentsSkipped++;
      continue;
    }

    const duplicate = environments.some(
      e => e.projectId === projectId && normalizeUrl(e.baseUrl) === normalizeUrl(incomingEnv.baseUrl)
    );
    if (duplicate) {
      environmentsSkipped++;
      continue;
    }

    const id = takenEnvironmentIds.has(incomingEnv.id)
      ? uniqueId('env', takenEnvironmentIds)
      : incomingEnv.id;
    takenEnvironmentIds.add(id);
    environments.push({ ...incomingEnv, id, projectId });
    environmentsAdded++;
  }

  let favoritesAdded = 0;
  for (const incomingFavorite of incoming.favorites) {
    const projectId = projectIdMap.get(incomingFavorite.projectId);
    if (!projectId) continue;
    if (favorites.some(f => f.key === incomingFavorite.key && f.projectId === projectId)) continue;
    favorites.push({ ...incomingFavorite, projectId });
    favoritesAdded++;
  }

  return {
    config: { ...current, projects, environments, favorites },
    summary: {
      projectsAdded,
      projectsMerged,
      environmentsAdded,
      environmentsSkipped,
      favoritesAdded,
      // Merge keeps the local display preferences untouched.
      settingsApplied: false,
    },
  };
};
