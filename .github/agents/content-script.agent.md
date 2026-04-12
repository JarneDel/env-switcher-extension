---
name: content-script-logic
description: "Use when: working on browser UI interactions, favicon coloring, language detection, or page border management."
---

# env-switcher: Content Script & UI Interactions

Logic injected into web pages to provide visual cues and detect application state.

## Core Modules ([src/content/](src/content/))

- **Favicon Updater**: [src/content/favicon-updater.ts](src/content/favicon-updater.ts) - Draws colored borders on tab favicons using `<canvas>`.
- **Language Detector**: [src/content/language-detector.ts](src/content/language-detector.ts) - Extracts available languages from the current page.
- **Minimal Border**: [src/content/minimal-border-manager.ts](src/content/minimal-border-manager.ts) - Renders a fixed top-bar color indicator.

## Event Loop

1. **Initialization**: Detects current environment based on URL.
2. **Observation**: `MutationObserver` monitors DOM changes for SPA navigation.
3. **Execution**: Updates favicons and borders whenever the environment changes or the user switches tabs.

## Message Handling

Listens for:
- `refreshFavicon`: Triggers a redraw of the environment indicators.
- `getLanguages`: Scans the DOM for language options.
- `environmentChanged`: Global broadcast to update visual state.
