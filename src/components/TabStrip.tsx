import React from 'react';
import { cn } from '../lib/utils';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  /** Tailwind color classes for active state, e.g. 'text-yellow-400 border-yellow-400' */
  activeColorClass?: string;
  /** Tailwind class applied to the badge when this tab is active */
  activeBadgeClass?: string;
}

interface TabStripProps {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const TabStrip: React.FC<TabStripProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-border shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const activeColor = tab.activeColorClass ?? 'text-foreground border-blue-500';
        return (
          <button
            key={tab.id}
            className={cn(
              'flex-1 py-2 text-[0.8125rem] font-medium transition-colors duration-150 border-b-2',
              'flex items-center justify-center gap-1',
              isActive
                ? activeColor
                : 'text-slate-500 border-transparent hover:text-slate-400'
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  'text-[0.6rem] font-bold rounded-full px-1 leading-none py-0.5',
                  isActive
                    ? (tab.activeBadgeClass ?? 'bg-blue-500/20 text-foreground')
                    : 'bg-slate-700 text-slate-400'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabStrip;
