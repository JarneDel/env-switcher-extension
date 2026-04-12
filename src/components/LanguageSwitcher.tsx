import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LanguageOption } from '@/types';

interface Props {
  languages?: LanguageOption[];
  currentLanguage?: string;
  onSwitch: (language: LanguageOption) => void;
  /** Controlled open state — when provided the parent owns open/close */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const LANG_FLAGS: Record<string, string> = {
  nl: '🇳🇱', fr: '🇫🇷', de: '🇩🇪', en: '🇬🇧', es: '🇪🇸',
  it: '🇮🇹', pt: '🇵🇹', pl: '🇵🇱', cs: '🇨🇿', sk: '🇸🇰',
  hu: '🇭🇺', ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮',
  da: '🇩🇰', sv: '🇸🇪', fi: '🇫🇮', nb: '🇳🇴', no: '🇳🇴',
  el: '🇬🇷', tr: '🇹🇷', ru: '🇷🇺', uk: '🇺🇦', ja: '🇯🇵',
  zh: '🇨🇳', ko: '🇰🇷', ar: '🇸🇦',
};

function getFlag(code: string) {
  return LANG_FLAGS[(code || '').split('-')[0].toLowerCase()] ?? '🌐';
}

function sameRoot(a: string, b: string) {
  return a.split('-')[0].toLowerCase() === b.split('-')[0].toLowerCase();
}

// ── shared chin wrapper ───────────────────────────────────────────────────────
const Chin = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    'flex items-center gap-1.5 px-3 py-2 border-t border-border bg-background shrink-0',
    className
  )}>
    {children}
  </div>
);

// ── main component ────────────────────────────────────────────────────────────
const LanguageSwitcher: React.FC<Props> = ({ languages, currentLanguage, onSwitch, isOpen: controlledIsOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isOpen) : val;
    if (onOpenChange !== undefined) onOpenChange(next);
    else setInternalOpen(next);
  };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // focus search when dropdown opens
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 0);
  }, [isOpen]);

  if (!languages?.length) return null;

  const activeLang = languages.find(l => currentLanguage && sameRoot(currentLanguage, l.code));

  const handleSelect = (lang: LanguageOption) => {
    onSwitch(lang);
    setIsOpen(false);
    setSearch('');
  };

  // ── always use dropdown ───────────────────────────────────────────────────
  const filtered = search.trim()
    ? languages.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
      )
    : languages;

  return (
    <Chin className="relative" >
      <div ref={wrapperRef} className="relative">
        {/* trigger */}
        <button
          onClick={() => { setIsOpen(v => !v); setSearch(''); }}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-100',
            isOpen
              ? 'bg-accent border-accent text-foreground'
              : 'bg-transparent border-border text-muted-foreground hover:bg-accent hover:border-accent hover:text-foreground'
          )}
        >
          <span className="text-sm leading-none select-none">{getFlag(activeLang?.code ?? '')}</span>
          <span className="max-w-27.5 truncate">{activeLang?.name ?? 'Language'}</span>
          <ChevronDown
            size={11}
            className={cn('shrink-0 text-muted-foreground transition-transform duration-150', isOpen && 'rotate-180')}
          />
        </button>

        {/* dropdown panel — opens upward */}
        {isOpen && (
          <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-52 rounded-lg border border-border bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* search row */}
            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
              <Search size={12} className="text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent border-none outline-none text-foreground text-xs p-0 placeholder:text-muted-foreground"
              />
            </div>

            {/* list */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">No match</p>
              ) : (
                filtered.map(lang => {
                  const active = !!currentLanguage && sameRoot(currentLanguage, lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang)}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-2.5 py-2 text-left text-xs transition-colors duration-100',
                        active
                          ? 'bg-accent text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <span className="text-sm leading-none select-none shrink-0">{getFlag(lang.code)}</span>
                      <span className="flex-1 truncate">{lang.name}</span>
                      <span className="text-[0.65rem] text-muted-foreground tracking-wider shrink-0">
                        {lang.code.toUpperCase()}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Chin>
  );
};

export default LanguageSwitcher;