---
name: project-architecture
description: "Use when: understanding the overall architecture, build process, and cross-browser support of the env-switcher extension."
---

# env-switcher: Project Architecture

A browser extension (Manifest V3) for switching between environments and languages with visual feedback.

## Core Components

- **Background (Service Worker)**: [src/background.ts](src/background.ts) - Manages tab updates and configuration broadcasts.
- **Content Script**: [src/content-script.ts](src-content-script.ts) - Injected into pages to handle UI modifications ([src/content/](src/content/)).
- **Popup UI**: [src/App.tsx](src/App.tsx) - React-based settings and environment switcher.

## Technical Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Abstraction**: `webextension-polyfill` for Chrome/Firefox compatibility.

## Build Process

The extension uses `TARGET_BROWSER` to generate distributions for different browsers:
- `npm run build:chrome` -> `dist-chrome/`
- `npm run build:firefox` -> `dist-firefox/`

## Key Patterns

- **Message Passing**: Uses `browser.runtime.sendMessage` for inter-component communication (Popup <-> Background <-> Content).
- **Visual Feedback**: Real-time favicon coloring and optional page borders to indicate the current environment.
- **SPA Support**: `MutationObserver` in the content script watches for URL changes in Single Page Applications.
