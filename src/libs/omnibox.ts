import Fuse from 'fuse.js';
import type { Environment, Project } from '@/types';
import { ExtensionStorage } from './storage';

const CONTENT_PREFIX = 'env:';
const MAX_SUGGESTIONS = 8;
const THRESHOLD_STRICT = 0.45;
const THRESHOLD_RELAXED = 0.65;

const ENV_SYNONYM_GROUPS: string[][] = [
  ['prod', 'prd', 'production', 'productie', 'live'],
  ['acc', 'acceptatie', 'acceptance', 'uat', 'accept'],
  ['test', 'tst', 'testing'],
  ['dev', 'development', 'ontwikkeling', 'ont'],
  ['staging', 'stg', 'stage'],
  ['local', 'localhost', 'lokaal'],
];

interface OmniboxSuggestion {
  content: string;
  description: string;
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function projectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map(p => [p.id, p]));
}

function descriptionFor(env: Environment, project?: Project): string {
  const name = escapeXml(env.name);
  const url = escapeXml(env.baseUrl);
  const scope = project ? ` — ${escapeXml(project.name)}` : '';
  return `<match>${name}</match>${scope} · ${url}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nameTokens(name: string): string[] {
  return name
    .split(/[^a-zA-Z0-9]+|(?<=[a-z])(?=[A-Z])/)
    .map(t => t.toLowerCase())
    .filter(Boolean);
}

function buildNameAliases(env: Environment): string {
  const aliases = new Set<string>();
  for (const token of nameTokens(env.name)) {
    aliases.add(token);
    for (const group of ENV_SYNONYM_GROUPS) {
      if (group.some(a => token === a || (a.length >= 4 && token.includes(a)))) {
        for (const a of group) aliases.add(a);
      }
    }
  }
  return [...aliases].join(' ');
}

function createFuse(
  environments: Environment[],
  projMap: Map<string, Project>,
  threshold: number,
): Fuse<Environment> {
  return new Fuse(environments, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'aliases', getFn: (e: Environment) => buildNameAliases(e), weight: 1.5 },
      { name: 'projectName', getFn: (e: Environment) => projMap.get(e.projectId)?.name || '', weight: 1 },
      { name: 'hostname', getFn: (e: Environment) => getHostname(e.baseUrl), weight: 0.7 },
      { name: 'baseUrl', getFn: (e: Environment) => e.baseUrl, weight: 0.4 },
    ],
    threshold,
    ignoreLocation: true,
    includeScore: true,
  });
}

function scoreToken(
  environments: Environment[],
  projMap: Map<string, Project>,
  token: string,
): Map<string, number> | null {
  let results = createFuse(environments, projMap, THRESHOLD_STRICT).search(token);
  if (!results.length) results = createFuse(environments, projMap, THRESHOLD_RELAXED).search(token);
  if (!results.length) return null;
  return new Map(results.map(r => [r.item.id, r.score ?? 0]));
}

function searchEnvironments(
  environments: Environment[],
  projects: Project[],
  query: string,
): Environment[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return environments;
  const projMap = projectMap(projects);
  const tokenScores = tokens.map(token => scoreToken(environments, projMap, token));

  const ranked = environments
    .map(env => {
      const scores = tokenScores.map(s => s?.get(env.id));
      const hits = scores.filter((s): s is number => s !== undefined);
      const total = hits.reduce((sum, s) => sum + s, 0);
      return { env, hitCount: hits.length, score: hits.length ? total / tokens.length : 1 };
    })
    .filter(r => r.hitCount > 0)
    .sort((a, b) => b.hitCount - a.hitCount || a.score - b.score);

  const fullMatches = ranked.filter(r => r.hitCount === tokens.length);
  return (fullMatches.length ? fullMatches : ranked).map(r => r.env);
}

function toSuggestion(env: Environment, projMap: Map<string, Project>): OmniboxSuggestion {
  return {
    content: `${CONTENT_PREFIX}${env.id}`,
    description: descriptionFor(env, projMap.get(env.projectId)),
  };
}

async function navigateToEnvironment(
  env: Environment,
  disposition: Browser.Omnibox.OnInputEnteredDisposition,
): Promise<void> {
  const createProps: Browser.Tabs.CreateCreateProperties = { url: env.baseUrl };
  const updateProps: Browser.Tabs.UpdateUpdateProperties = { url: env.baseUrl };

  switch (disposition) {
    case 'currentTab':
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await browser.tabs.update(tab.id, updateProps);
        } else {
          await browser.tabs.create(createProps);
        }
      } catch {
        await browser.tabs.create(createProps);
      }
      break;
    case 'newForegroundTab':
      await browser.tabs.create(createProps);
      break;
    case 'newBackgroundTab':
      await browser.tabs.create({ ...createProps, active: false });
      break;
  }

  await ExtensionStorage.setCurrentEnvironment(env.id);
}

export class Omnibox {
  init(): void {
    if (!browser.omnibox) return;

    browser.omnibox.setDefaultSuggestion({
      description: 'Search environments — press Enter to open the best match',
    });

    browser.omnibox.onInputChanged.addListener((text, suggest) => {
      (async () => {
        const config = await ExtensionStorage.getConfig();
        const environments = config.environments || [];
        const projects = config.projects || [];
        const projMap = projectMap(projects);
        const results = searchEnvironments(environments, projects, text);

        if (!text.trim()) {
          suggest(results.slice(0, MAX_SUGGESTIONS).map(env => toSuggestion(env, projMap)));
          return;
        }

        const [best, ...rest] = results;
        if (best) {
          browser.omnibox.setDefaultSuggestion({
            description: descriptionFor(best, projMap.get(best.projectId)),
          });
        }
        suggest(rest.slice(0, MAX_SUGGESTIONS - 1).map(env => toSuggestion(env, projMap)));
      })().catch(() => suggest([]));
    });

    browser.omnibox.onInputEntered.addListener((text, disposition) => {
      (async () => {
        const config = await ExtensionStorage.getConfig();
        const environments = config.environments || [];
        const projects = config.projects || [];

        let target: Environment | undefined;
        if (text.startsWith(CONTENT_PREFIX)) {
          const id = text.slice(CONTENT_PREFIX.length);
          target = environments.find(e => e.id === id);
        } else {
          target = searchEnvironments(environments, projects, text)[0];
        }

        if (target) {
          await navigateToEnvironment(target, disposition);
        }
      })().catch(() => {});
    });
  }
}
