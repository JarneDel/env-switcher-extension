import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@/shared/router'
import '@/index.css'
import App from './App'
import { isRunningInTab } from '@/shared/extension'

// The same page serves the toolbar popup and the full-tab view; the tab gets a
// roomier, centred layout instead of the fixed popup width.
isRunningInTab().then((inTab) => {
  if (inTab) document.documentElement.dataset.view = 'tab';
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>,
)
