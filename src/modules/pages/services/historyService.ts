import type { VisitedPage } from '../types';
import type { Environment } from '@/modules/environments/types';
import { URLUtils } from '@/modules/environments/utils/urlUtils';

const MAX_VISITED = 50;

export class HistoryService {
  public static async hasPermission(): Promise<boolean> {
    try {
      if (!browser.permissions?.contains) return false;
      return await browser.permissions.contains({ permissions: ['history'] });
    } catch {
      return false;
    }
  }

  public static async requestPermission(): Promise<boolean> {
    try {
      if (!browser.permissions?.request) return false;
      return await browser.permissions.request({ permissions: ['history'] });
    } catch {
      return false;
    }
  }

  public static async loadProjectHistory(
    environments: Environment[],
    projectId: string
  ): Promise<VisitedPage[]> {
    const hasPerm = await HistoryService.hasPermission();
    if (!hasPerm) return [];

    const projectEnvs = environments.filter(e => e.projectId === projectId && e.baseUrl);
    if (projectEnvs.length === 0) return [];
    if (!browser.history?.search) return [];

    try {
      const resultsArrays = await Promise.all(
        projectEnvs.map(env =>
          browser.history.search({ text: env.baseUrl, maxResults: 100, startTime: 0 })
        )
      );

      const seen = new Set<string>();
      const allItems: VisitedPage[] = [];

      resultsArrays.forEach((results, idx) => {
        const env = projectEnvs[idx];
        for (const item of results) {
          if (!item.url || !item.url.startsWith(env.baseUrl)) continue;
          try {
            const urlObj = new URL(item.url);
            const key = urlObj.hostname + urlObj.pathname;
            if (seen.has(key)) continue;
            seen.add(key);
            allItems.push({
              key,
              url: item.url,
              title: item.title || urlObj.pathname,
              projectId,
              language: URLUtils.extractLanguageFromUrl(item.url),
              visitCount: item.visitCount || 1,
              lastVisited: item.lastVisitTime || Date.now(),
            });
          } catch {
            // skip invalid URLs
          }
        }
      });

      return allItems
        .sort((a, b) => b.visitCount - a.visitCount || b.lastVisited - a.lastVisited)
        .slice(0, MAX_VISITED);
    } catch {
      return [];
    }
  }
}
