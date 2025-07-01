import React from 'react';
import type {LanguageOption} from '../types';

interface Props {
  languages?: LanguageOption[];
  currentLanguage?: string;
  onSwitch: (language: LanguageOption) => void;
}

const LanguageSwitcher: React.FC<Props> = ({ 
  languages, 
  currentLanguage, 
  onSwitch 
}) => {
  if (languages?.length === 0) return null;

  // Helper function to normalize language codes for comparison
  const normalizeLanguageCode = (code: string): string => {
    return code.split('-')[0].toLowerCase();
  };

  return (
    <div className="switcher-section">
      <h3>Language</h3>
      <div className="language-grid">
        {languages?.map(lang => {
          const isActive = currentLanguage &&
            normalizeLanguageCode(currentLanguage) === normalizeLanguageCode(lang.code);

          return (
            <button
              key={lang.code}
              className={`lang-button ${isActive ? 'active' : ''}`}
              onClick={() => onSwitch(lang)}
              title={`Switch to ${lang.name}`}
            >
              <span className="lang-code">{lang.code.toUpperCase()}</span>
              <span className="lang-name">{lang.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
