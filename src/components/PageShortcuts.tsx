import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search, ChevronRight, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import type { VisitedPage } from '@/types';

// ── types ─────────────────────────────────────────────────────────────────────

interface TreeNode {
  /** Display label — may be "seg1/seg2" after path-compression */
  name: string;
  /** Canonical key: URL pathname up to this segment */
  fullPath: string;
  children: TreeNode[];
  page?: VisitedPage;
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

function decodeSeg(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

// ── tree builder ──────────────────────────────────────────────────────────────

function buildTree(pages: VisitedPage[]): TreeNode[] {
  const root: TreeNode = { name: '', fullPath: '', children: [] };

  for (const page of pages) {
    try {
      const rawSegs = new URL(page.url).pathname.split('/').filter(Boolean);
      let node = root;
      for (let i = 0; i < rawSegs.length; i++) {
        const fullPath = '/' + rawSegs.slice(0, i + 1).join('/');
        let child = node.children.find(c => c.fullPath === fullPath);
        if (!child) {
          child = { name: decodeSeg(rawSegs[i]), fullPath, children: [] };
          node.children.push(child);
        }
        if (i === rawSegs.length - 1) child.page = page;
        node = child;
      }
    } catch { /* skip invalid URLs */ }
  }

  return compressNodes(root.children);
}

/** Collapse single-child, page-free intermediate nodes into their child. */
function compressNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(node => {
    const children = compressNodes(node.children);
    if (children.length === 1 && !node.page) {
      return { ...children[0], name: node.name + '/' + children[0].name };
    }
    return { ...node, children };
  });
}

// ── leaf page row ─────────────────────────────────────────────────────────────

interface PageLeafProps {
  page: VisitedPage;
  depth: number;
  isFavorite: boolean;
  onNavigate: (url: string) => void;
  onNavigateNewTab: (url: string) => void;
  onToggleFavorite: (page: VisitedPage) => void;
}

function PageLeaf({ page, depth, isFavorite, onNavigate, onNavigateNewTab, onToggleFavorite }: PageLeafProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-0 w-full text-left',
        'transition-colors duration-[0.12s] hover:bg-card'
      )}
    >
      <button
        className="flex items-center gap-2 flex-1 min-w-0 py-1.5 text-left border-none cursor-pointer bg-transparent text-slate-300 hover:text-card-foreground"
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => onNavigate(page.url)}
        onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onNavigateNewTab(page.url); } }}
        title={`${page.title}\n${page.url}\n\nMiddle-click to open in new tab`}
      >
        <span className="text-sm leading-none shrink-0">{getFlag(page.language)}</span>
        <span className="text-[0.8125rem] font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {page.title}
        </span>
        <span className="text-[0.68rem] font-semibold text-slate-500 shrink-0 tabular-nums">
          {page.visitCount}×
        </span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(page); }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className={cn(
          'shrink-0 px-2 py-1.5 bg-transparent border-none cursor-pointer transition-colors leading-none',
          isFavorite
            ? 'text-yellow-400 hover:text-slate-500'
            : 'text-slate-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
        )}
      >
        <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

// ── recursive tree row ────────────────────────────────────────────────────────

interface TreeNodeRowProps {
  node: TreeNode;
  collapsed: Set<string>;
  favoriteKeys: Set<string>;
  onToggle: (path: string) => void;
  onNavigate: (url: string) => void;
  onNavigateNewTab: (url: string) => void;
  onToggleFavorite: (page: VisitedPage) => void;
  depth: number;
}

function getPagePathname(page: VisitedPage): string {
  try { return new URL(page.url).pathname; } catch { return ''; }
}

function TreeNodeRow({ node, collapsed, favoriteKeys, onToggle, onNavigate, onNavigateNewTab, onToggleFavorite, depth }: TreeNodeRowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.fullPath);

  if (!hasChildren) {
    return node.page
      ? <PageLeaf page={node.page} depth={depth} isFavorite={favoriteKeys.has(getPagePathname(node.page))} onNavigate={onNavigate} onNavigateNewTab={onNavigateNewTab} onToggleFavorite={onToggleFavorite} />
      : null;
  }

  return (
    <div>
      {/* Folder row */}
      <button
        className={cn(
          'group flex items-center gap-1.5 w-full py-1.5 text-left bg-transparent border-none cursor-pointer',
          'transition-colors duration-[0.12s] text-slate-400 hover:text-slate-100 hover:bg-card'
        )}
        style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: '12px' }}
        onClick={() => onToggle(node.fullPath)}
      >
        <ChevronRight
          size={11}
          className={cn('shrink-0 transition-transform duration-150 text-slate-500', !isCollapsed && 'rotate-90')}
        />
        <span className="text-[0.75rem] font-medium truncate">{node.name}</span>
      </button>

      {/* Children */}
      {!isCollapsed && (
        <div>
          {/* Index page for this folder (path matches both a page and has children) */}
          {node.page && (
            <PageLeaf
              page={node.page}
              depth={depth + 1}
              isFavorite={favoriteKeys.has(getPagePathname(node.page))}
              onNavigate={onNavigate}
              onNavigateNewTab={onNavigateNewTab}
              onToggleFavorite={onToggleFavorite}
            />
          )}
          {node.children.map(child => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              collapsed={collapsed}
              favoriteKeys={favoriteKeys}
              onToggle={onToggle}
              onNavigate={onNavigate}
              onNavigateNewTab={onNavigateNewTab}
              onToggleFavorite={onToggleFavorite}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  pages: VisitedPage[];
  favoriteKeys: Set<string>;
  currentEnvironmentOrigin?: string;
  onNavigate: (url: string) => void;
  onNavigateNewTab: (url: string) => void;
  onToggleFavorite: (page: VisitedPage) => void;
  focusSearchTrigger?: number;
}

function resolvePageUrl(page: VisitedPage, origin?: string): string {
  if (!origin) return page.url;
  try {
    const u = new URL(page.url);
    return origin + u.pathname + u.search + u.hash;
  } catch {
    return page.url;
  }
}

export default function PageShortcuts({ pages, favoriteKeys, currentEnvironmentOrigin, onNavigate, onNavigateNewTab, onToggleFavorite, focusSearchTrigger }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const resolvedNavigate = (page: VisitedPage) => onNavigate(resolvePageUrl(page, currentEnvironmentOrigin));
  const resolvedNavigateNewTab = (page: VisitedPage) => onNavigateNewTab(resolvePageUrl(page, currentEnvironmentOrigin));

  useEffect(() => {
    if (focusSearchTrigger) searchRef.current?.focus();
  }, [focusSearchTrigger]);

  const toggle = (path: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const tree = useMemo(() => buildTree(pages), [pages]);

  const flatFiltered = useMemo((): VisitedPage[] | null => {
    if (!search.trim()) return null;
    const q = search.trim();
    const fuse = new Fuse(pages, {
      keys: [
        'title',
        { name: 'path', getFn: (p: VisitedPage) => { try { return new URL(p.url).pathname; } catch { return ''; } } },
        'language',
      ],
      threshold: 0.4,
      includeScore: true,
    });
    return fuse.search(q).map(r => r.item);
  }, [pages, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-card shrink-0">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          ref={searchRef}
          className="bg-transparent border-none outline-none text-foreground text-sm w-full p-0 placeholder:text-slate-500"
          placeholder="Search pages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              if (search) setSearch('');
              else (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto py-1">
        {pages.length === 0 ? (
          <p className="text-slate-500 text-[0.8125rem] p-8 text-center leading-relaxed">
            Open pages on this project to build shortcuts
          </p>
        ) : flatFiltered !== null ? (
          flatFiltered.length === 0 ? (
            <p className="text-slate-500 text-[0.8125rem] p-4 text-center">No pages match</p>
          ) : (
          flatFiltered.map(page => (
              <PageLeaf
                key={page.key}
                page={page}
                depth={0}
                isFavorite={favoriteKeys.has(getPagePathname(page))}
                onNavigate={() => resolvedNavigate(page)}
                onNavigateNewTab={() => resolvedNavigateNewTab(page)}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          )
        ) : (
          tree.map(node => (
            <TreeNodeRow
              key={node.fullPath}
              node={node}
              collapsed={collapsed}
              favoriteKeys={favoriteKeys}
              onToggle={toggle}
              onNavigate={(url) => onNavigate(resolvePageUrl({ url } as VisitedPage, currentEnvironmentOrigin))}
              onNavigateNewTab={(url) => onNavigateNewTab(resolvePageUrl({ url } as VisitedPage, currentEnvironmentOrigin))}
              onToggleFavorite={onToggleFavorite}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}
