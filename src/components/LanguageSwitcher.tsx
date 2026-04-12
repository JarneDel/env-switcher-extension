import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type {LanguageOption} from '../types';

interface Props {
  languages?: LanguageOption[];
  currentLanguage?: string;
  onSwitch: (language: LanguageOption) => void;
}

const LANG_FLAGS: Record<string, string> = {
  nl: '🇳🇱', fr: '🇫🇷', de: '🇩🇪', en: '🇬🇧', es: '🇪🇸',
  it: '🇮🇹', pt: '🇵🇹', pl: '🇵🇱', cs: '🇨🇿', sk: '🇸🇰',
  hu: '🇭🇺', ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮',
  da: '🇩🇰', sv: '🇸🇪', fi: '🇫🇮', nb: '🇳🇴', no: '🇳🇴',
  el: '🇬🇷', tr: '🇹🇷', ru: '🇷🇺', uk: '🇺🇦', ja: '🇯🇵',
  zh: '🇨🇳', ko: '🇰🇷', ar: '🇸🇦',
};

function getFlag(code: string): string {
  const base = (code || '').split('-')[0].toLowerCase();
  return LANG_FLAGS[base] || '🌐';
}

function normalizeCode(code: string): string {
  return code.split('-')[0].toLowerCase();
}

const LanguageSwitcher: React.FC<Props> = ({ languages, currentLanguage, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!languages?.length) return null;

  const currentLang = languages.find(l =>
    currentLanguage && normalizeCode(currentLanguage) === normalizeCode(l.code)
  );

  const handleSwitch = (lang: LanguageOption) => {
    onSwitch(lang);
    setIsOpen(false);
    setSearchQuery('');
  };

  // ── Buttons mode (< 4 languages) ─────────────────────────────
  if (languages.length < 4) {
    return (
      <div className="lang-chin">
        {languages.map(lang => {
          const isActive = currentLanguage && normalizeCode(currentLanguage) === normalizeCode(lang.code);
          return (
            <button
              key={lang.code}
              className={`lang-chin-btn${isActive ? ' active' : ''}`}
              onClick={() => handleSwitch(lang)}
              title={lang.name}
            >
              <span className="lang-flag">{getFlag(lang.code)}</span>
              <span className="lang-chin-code">{lang.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Dropdown mode (≥ 4 languages) ────────────────────────────
  const filtered = searchQuery.trim()
    ? languages.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  return (
    <div className="lang-chin lang-chin-dropdown" ref={dropdownRef}>
      <button
        className="lang-dropdown-trigger"
        onClick={() => { setIsOpen(!isOpen); setSearchQuery(''); }}
      >
        <span className="lang-flag">{getFlag(currentLang?.code || '')}</span>
        <span className="lang-dropdown-label">{currentLang?.name || 'Select language'}</span>
        <ChevronDown size={12} className={`lang-dropdown-chevron${isOpen ? ' open' : ''}`} />
      </button>

      {isOpen && (
        <div className="lang-dropdown-panel">
          <div className="lang-dropdown-search">
            <Search size={12} className="lang-dropdown-search-icon" />
            <input
              ref={searchInputRef}
              className="lang-dropdown-search-input"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="lang-dropdown-list">
            {filtered.length === 0 && (
              <p className="lang-dropdown-empty">No match</p>
            )}
            {filtered.map(lang => {
              const isActive = currentLanguage && normalizeCode(currentLanguage) === normalizeCode(lang.code);
              return (
                <button
                  key={lang.code}
                  className={`lang-dropdown-item${isActive ? ' active' : ''}`}
                  onClick={() => handleSwitch(lang)}
                >
                  <span className="lang-flag">{getFlag(lang.code)}</span>
                  <span className="lang-dropdown-name">{lang.name}</span>
                  <span className="lang-dropdown-code">{lang.code.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
