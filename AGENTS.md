# Developer & Agent Guide (`AGENTS.md`)

Welcome to the **Environment Switcher Extension** codebase. This document outlines the project architecture, design philosophy, key conventions, and development commands for both human contributors and AI agents.

---

## 🧭 Project Overview

**Environment Switcher** is a high-performance WebExtension (Manifest V3 for Chrome, Manifest V2/V3 for Firefox) designed to switch base URLs seamlessly across environments (e.g., Local, Dev, UAT, Staging, Production), preserve paths and parameters, auto-detect site languages, monitor environment health, and display visual indicators (page borders, favicon badges).

- **Framework**: [WXT](https://wxt.dev/) (Vite-based browser extension framework)
- **UI Layer**: [Preact](https://preactjs.com/) with `preact/compat` (aliased in place of React for ultra-compact bundle size)
- **Styling**: Tailwind CSS with native system font stack
- **Architecture**: Domain-Driven Design (DDD) with clear bounded contexts

---

## 🏗️ Architecture & Directory Structure

The codebase is organized into **Domain Modules** under `src/modules/`, cross-cutting infrastructure under `src/shared/`, and browser entrypoints under `src/entrypoints/`.

```
src/
├── entrypoints/                          # WXT Entry Points
│   ├── background.ts                     # Background service worker (omnibox, favicons, on-demand health)
│   ├── content.ts                        # In-page content script orchestrator
│   └── popup/                            # Extension Popup Shell
│       ├── index.html
│       ├── main.tsx                      # Root mount & providers
│       └── App.tsx                       # Top-level state & routing container
│
├── modules/                              # Domain Modules (Bounded Contexts)
│   ├── environments/                     # Core Environment & Project Switching
│   │   ├── types.ts                      # Environment, Project, TabInfo models
│   │   ├── components/                   # EnvironmentSwitcher, ProjectsList, ProjectListItem, etc.
│   │   ├── context/                      # ConfigurationContext
│   │   ├── hooks/                        # useConfigurationState
│   │   ├── utils/                        # urlUtils, validationUtils
│   │   └── index.ts                      # Public domain API
│   │
│   ├── pages/                            # Visited Pages & Starred Favorites
│   │   ├── types.ts                      # VisitedPage, FavoritePage
│   │   ├── components/                   # PageShortcuts, FavoritesView
│   │   ├── services/                     # HistoryService (browser.history searches)
│   │   └── index.ts
│   │
│   ├── language/                         # Language Detection & Switching
│   │   ├── types.ts                      # LanguageOption
│   │   ├── components/                   # LanguageSwitcher
│   │   ├── services/                     # LanguageDetector (DOM & URL extraction strategies)
│   │   └── index.ts
│   │
│   ├── visual-indicators/                # Visual Badges & Display Settings
│   │   ├── types.ts                      # DisplaySettings, FaviconInfo
│   │   ├── components/                   # DisplaySettingsPanel, ColorPicker
│   │   ├── content/                      # FaviconUpdater, MinimalBorderManager
│   │   └── index.ts
│   │
│   ├── health/                           # Environment Reachability & Health Probes
│   │   ├── types.ts                      # HealthEntry, HealthMap, HealthStatus
│   │   ├── services/                     # healthCheck (throttled probes, storage cache)
│   │   └── index.ts
│   │
│   ├── sync/                             # Config Export, Import, Storage & Transfer
│   │   ├── types.ts                      # ExtensionConfig, ShareableSettings
│   │   ├── components/                   # DataSettingsPanel
│   │   ├── services/                     # configTransfer, storage (multi-key sync adapter)
│   │   └── index.ts
│   │
│   ├── quick-access/                     # In-Page Quick Switcher Modal (Ctrl+E)
│   │   ├── content/                      # PopupController (Vanilla TS isolated Shadow DOM)
│   │   └── index.ts
│   │
│   └── views/                            # Top-Level Popup View Shells
│       ├── MainView.tsx                  # Main popup interface (Environment Switcher / Tabs)
│       ├── SettingsView.tsx              # Settings container & tabs
│       ├── SetupWelcome.tsx              # First-time onboarding screen
│       └── index.ts
│
├── shared/                               # Cross-Cutting Shared Infrastructure
│   ├── ui/                               # Primitives: Button, Input, Badge, Slider, TabStrip, etc.
│   ├── router/                           # Lightweight state router (RouterProvider, useNavigate, useLocation)
│   ├── extension/                        # extensionContext (tab vs popup), omnibox
│   ├── hooks/                            # useCollapse
│   └── utils/                            # cn, capitalize, colorUtils
│
└── types/
    └── index.ts                          # Unified type aggregator & re-exporter
```

---

## ⚡ Performance Principles (DO NOT VIOLATE)

1. **Pure Vanilla TypeScript in Content Scripts**:
   - Content scripts run in **every single browser tab**.
   - NEVER import React, Preact, or heavy dependencies into `src/entrypoints/content.ts` or `src/modules/quick-access/`.
   - The in-page quick-access modal (`Ctrl+E`) MUST remain pure Vanilla DOM inside an isolated Shadow DOM.
   - Content script bundle size target: `< 50 kB`.

2. **Preact Aliasing for Popup UI**:
   - The popup uses `preact/compat` via Vite aliases in `wxt.config.ts`.
   - Do NOT add heavy external UI libraries or oversized routing packages.
   - Popup bundle size target: `< 180 kB`.

3. **Instant Startup (< 15ms paint time)**:
   - Always parallelize initial async calls using `Promise.all([ExtensionStorage.getConfig(), browser.tabs.query(...)])`.
   - Synchronously derive `isConfigured` from `config.environments.length > 0`.
   - Set `loading: false` immediately on frame 1 without waiting for background history or content script language detection.
   - Secondary queries (language detection, history scanning) must run asynchronously in the background.

4. **Native System Font Stack**:
   - Do not bundle or import external webfonts (e.g. `@fontsource/*` or Google Fonts). Use the system font stack configured in `src/index.css`.

5. **Multi-Key Sync Storage Architecture**:
   - Config is split into `config_global` and `proj_envs_<projectId>` to stay well under `browser.storage.sync.QUOTA_BYTES_PER_ITEM` (8 kB limit).
   - Storage adapter in `src/modules/sync/services/storage.ts` transparently migrates legacy single-key configs.

---

## 🛠️ Build & Development Commands

```bash
# Build for Chrome (Manifest V3)
npm run build:chrome

# Build for Firefox (Manifest V2/V3)
npm run build:firefox

# Start development server with hot-reload
npm run dev

# Prepare WXT TypeScript types
npx wxt prepare
```

---

## 📐 Coding & Contribution Conventions

1. **Domain Boundaries**:
   - Features belonging to a domain context (types, components, hooks, services) must live in `src/modules/<domain>/`.
   - Each domain must export its public surface through `src/modules/<domain>/index.ts`.
   - External domains and entrypoints should import through domain barrels (e.g. `import { EnvironmentSwitcher } from '@/modules/environments'`).

2. **Types**:
   - Define domain-specific types in `src/modules/<domain>/types.ts`.
   - Re-export domain types in `src/types/index.ts` to keep the unified type interface clean.

3. **Shared Layer**:
   - Generic UI primitives belong in `src/shared/ui/`.
   - Shared browser extension utilities belong in `src/shared/extension/`.
   - Pure utility functions belong in `src/shared/utils/`.

4. **Path Aliases**:
   - `@/*` maps to `src/*` (configured in `wxt.config.ts` and `tsconfig.json`).
