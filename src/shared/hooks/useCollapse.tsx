import { useRef } from 'react';

interface UseCollapseOptions {
    isCollapsed: boolean;
    duration?: number;
}

export const useCollapse = ({ isCollapsed, duration = 200 }: UseCollapseOptions) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    const collapseProps = {
        ref: nodeRef,
        className: `collapse-wrapper ${isCollapsed ? 'collapsed' : 'expanded'}`,
        style: {
            '--duration': `${duration}ms`
        } as React.CSSProperties & { '--duration': string }
    };

    return {
        collapseProps,
        isAnimating: false,
        shouldRender: true
    };
};