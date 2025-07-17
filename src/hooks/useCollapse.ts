import { useRef, useLayoutEffect, useState } from 'react';

interface UseCollapseOptions {
  isCollapsed: boolean;
  duration?: number;
}

export const useCollapse = ({ isCollapsed, duration = 300 }: UseCollapseOptions) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(!isCollapsed);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    if (isCollapsed) {
      // Start collapse animation
      setIsAnimating(true);
      const scrollHeight = element.scrollHeight;
      setHeight(scrollHeight); // Set to current height first

      // Force a reflow, then animate to 0
      requestAnimationFrame(() => {
        setHeight(0);

        // Hide content after animation completes
        setTimeout(() => {
          setShouldRender(false);
          setIsAnimating(false);
        }, duration);
      });
    } else {
      // Start expand animation
      setShouldRender(true);
      setIsAnimating(true);

      // Wait for render, then measure and animate
      requestAnimationFrame(() => {
        const scrollHeight = element.scrollHeight;
        setHeight(0); // Start from 0

        requestAnimationFrame(() => {
          setHeight(scrollHeight);

          // End animation and set to auto after duration
          setTimeout(() => {
            setHeight('auto');
            setIsAnimating(false);
          }, duration);
        });
      });
    }
  }, [isCollapsed, duration]);

  const collapseProps = {
    ref: contentRef,
    style: {
      height: height === 'auto' ? 'auto' : `${height}px`,
      overflow: isAnimating || isCollapsed ? 'hidden' : 'visible',
      transition: isAnimating ? `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
    },
  };

  return { collapseProps, isAnimating, shouldRender };
};
