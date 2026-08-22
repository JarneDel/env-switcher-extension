export interface VisitedPage {
  /** Canonical dedup key: hostname + pathname (no search/hash) */
  key: string;
  /** Most recent full URL for actual navigation */
  url: string;
  title: string;
  projectId: string;
  language?: string;
  visitCount: number;
  lastVisited: number;
}

export interface FavoritePage {
  /** Canonical key: hostname + pathname (same as VisitedPage.key) */
  key: string;
  url: string;
  title: string;
  projectId: string;
  language?: string;
  addedAt: number;
}
