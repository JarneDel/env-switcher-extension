import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface Location {
  pathname: string;
}

export type NavigateFunction = (to: string | number) => void;

interface RouterContextType {
  location: Location;
  navigate: NavigateFunction;
}

const RouterContext = createContext<RouterContextType>({
  location: { pathname: '/' },
  navigate: () => {},
});

export const useRouter = () => useContext(RouterContext);
export const useNavigate = () => useContext(RouterContext).navigate;
export const useLocation = () => useContext(RouterContext).location;

interface RouterProviderProps {
  initialPath?: string;
  children: ReactNode;
}

interface HistoryState {
  entries: string[];
  index: number;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ initialPath = '/', children }) => {
  // The stack and the cursor live in one piece of state so they can only ever
  // move together. Keeping them apart meant navigate() truncated using an index
  // captured at render time while incrementing the cursor unconditionally, so
  // two navigate() calls in a single handler — which is what the Settings back
  // button does, via onSettingsChange() plus its own navigate() — pushed one
  // entry but advanced the cursor twice. The cursor then pointed past the end
  // of the stack, every later lookup fell through to '/', and navigation
  // silently stopped working for the rest of the session.
  const [{ entries, index }, setHistoryState] = useState<HistoryState>({
    entries: [initialPath],
    index: 0,
  });

  const currentPath = entries[index] ?? '/';

  const navigate: NavigateFunction = (to) => {
    setHistoryState((prev) => {
      if (typeof to === 'number') {
        const nextIndex = prev.index + to;
        return nextIndex >= 0 && nextIndex < prev.entries.length
          ? { ...prev, index: nextIndex }
          : prev;
      }

      const truncated = prev.entries.slice(0, prev.index + 1);

      // Navigating to the path already showing is a no-op, so paired
      // callback+navigate call sites don't stack duplicate entries.
      if (truncated[truncated.length - 1] === to) return prev;

      return { entries: [...truncated, to], index: truncated.length };
    });
  };

  const value = {
    location: { pathname: currentPath },
    navigate,
  };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export interface RouteProps {
  path: string;
  element: ReactNode;
}

export const Route: React.FC<RouteProps> = () => null;

export const Routes: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { location } = useRouter();
  const childrenArray = React.Children.toArray(children) as React.ReactElement<RouteProps>[];

  for (const child of childrenArray) {
    if (!React.isValidElement<RouteProps>(child)) continue;
    const { path, element } = child.props;

    if (path === location.pathname) {
      return <>{element}</>;
    }
    if (path.endsWith('/*')) {
      const base = path.slice(0, -2);
      if (location.pathname === base || location.pathname.startsWith(`${base}/`)) {
        return <>{element}</>;
      }
    }
  }

  // Fallback to exact root '/' or first matching child
  const rootChild = childrenArray.find((c) => c.props.path === '/');
  return rootChild ? <>{rootChild.props.element}</> : null;
};
