import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Environment, FavoritePage, VisitedPage } from '@/types';

const LANG_FLAGS: Record<string, string> = {
  nl: '🇳🇱', fr: '🇫🇷', de: '🇩🇪', en: '🇬🇧', es: '🇪🇸',
  it: '🇮🇹', pt: '🇵🇹', pl: '🇵🇱', cs: '🇨🇿', sk: '🇸🇰',
  hu: '🇭🇺', ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮',
  da: '🇩🇰', sv: '🇸🇪', fi: '🇫🇮', nb: '🇳🇴', no: '🇳🇴',
  el: '🇬🇷', tr: '🇹🇷', ru: '🇷🇺', uk: '🇺🇦', ja: '🇯🇵',
  zh: '🇨🇳', ko: '🇰🇷', ar: '🇸🇦',
};

function getFlag(lang?: string): string {
  if (!lang) return '🌐';
  return LANG_FLAGS[lang.split('-')[0].toLowerCase()] || '🌐';
}

interface Props {
  favorites: FavoritePage[];
  visitedPages: VisitedPage[];
  currentEnvironment?: Environment;
  currentLanguage?: string;
  onNavigate: (url: string) => void;
  onNavigateNewTab: (url: string) => void;
  onRemove: (key: string) => void;
}

function resolveUrl(fav: FavoritePage, currentEnvironment?: Environment): string {
  if (!currentEnvironment) return fav.url;
  try {
    const pathname = new URL(fav.url).pathname;
    return new URL(currentEnvironment.baseUrl).origin + pathname;
  } catch {
    return fav.url;
  }
}

export default function FavoritesView({ favorites, visitedPages, currentEnvironment, currentLanguage, onNavigate, onNavigateNewTab, onRemove }: Props) {
  const sorted = useMemo(() => {
    // Build visit-count map keyed by pathname (cross-environment)
    const visitCountMap = new Map<string, number>();
    for (const p of visitedPages) {
      try {
        const pathname = new URL(p.url).pathname;
        const prev = visitCountMap.get(pathname) ?? 0;
        if (p.visitCount > prev) visitCountMap.set(pathname, p.visitCount);
      } catch { /* skip */ }
    }

    // Filter by project, then by language
    const filtered = favorites.filter(fav =>
      (!currentEnvironment || fav.projectId === currentEnvironment.projectId) &&
      (!currentLanguage || !fav.language || fav.language === currentLanguage)
    );

    return filtered.sort((a, b) => {
      const vc = (visitCountMap.get(b.key) ?? 0) - (visitCountMap.get(a.key) ?? 0);
      return vc !== 0 ? vc : b.addedAt - a.addedAt;
    }).map(fav => ({ fav, visitCount: visitCountMap.get(fav.key) }));
  }, [favorites, visitedPages, currentLanguage]);

  if (sorted.length === 0) {
    return (
      <p className="text-slate-500 text-[0.8125rem] p-8 text-center leading-relaxed">
        {favorites.length === 0 ? 'No favorites yet — star pages to add them here' : 'No favorites for this project'}
      </p>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 py-1 overflow-y-auto">
      {sorted.map(({ fav, visitCount }) => {
        const navUrl = resolveUrl(fav, currentEnvironment);
        return (
          <div key={fav.key} className="group flex items-center gap-1 px-3 py-1.5 hover:bg-card transition-colors duration-[0.12s]">
            <button
              className={cn(
                'flex items-center gap-2 flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer py-0',
                'text-slate-300 hover:text-card-foreground'
              )}
              onClick={() => onNavigate(navUrl)}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onNavigateNewTab(navUrl); } }}
              title={`${fav.title}\n${navUrl}\n\nMiddle-click to open in new tab`}
            >
              <span className="text-sm leading-none shrink-0">{getFlag(fav.language)}</span>
              <span className="text-[0.8125rem] font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {fav.title}
              </span>
            </button>
            {visitCount !== undefined && (
              <span className="text-[0.68rem] font-semibold text-slate-500 shrink-0 tabular-nums mr-1">
                {visitCount}×
              </span>
            )}
            <button
              onClick={() => onRemove(fav.key)}
              title="Remove from favorites"
              className="shrink-0 text-yellow-400 hover:text-slate-500 transition-colors bg-transparent border-none cursor-pointer p-0.5 leading-none"
            >
              <Star size={13} fill="currentColor" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
