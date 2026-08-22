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

export const RouterProvider: React.FC<RouterProviderProps> = ({ initialPath = '/', children }) => {
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPath = history[currentIndex] || '/';

  const navigate: NavigateFunction = (to) => {
    if (typeof to === 'number') {
      const nextIndex = currentIndex + to;
      if (nextIndex >= 0 && nextIndex < history.length) {
        setCurrentIndex(nextIndex);
      }
      return;
    }

    setHistory((prev) => {
      const updated = prev.slice(0, currentIndex + 1);
      return [...updated, to];
    });
    setCurrentIndex((prev) => prev + 1);
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
