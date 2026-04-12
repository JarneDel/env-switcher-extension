---
name: popup-ui
description: "Use when: modifying the React popup, settings panels, or environment switcher components."
---

# env-switcher: Popup UI & Components

The extension's primary interface for environment switching and configuration.

## Component Structure ([src/components/](src/components/))

- **Main View**: [src/components/MainView.tsx](src/components/MainView.tsx) - Quick access to environment and language switching.
- **Settings View**: [src/components/SettingsView.tsx](src/components/SettingsView.tsx) - Tabbed interface for configuration.
- **Config Panels**:
    - `ConfigurationPanel`: Manage Projects and Environments.
    - `DisplaySettingsPanel`: Configure visual indicators.
    - `AISettingsPanel`: Configure LM Studio integration.

## React Patterns

- **Hooks**: Custom hooks like `useConfigurationState` handle complex CRUD logic.
- **Context**: `ConfigurationContext` provides global state to all UI components.
- **Validation**: Centralized utility in [src/libs/validationUtils.ts](src/libs/validationUtils.ts) for form feedback.

## UI Styling

Uses standard CSS modules and conditional classes (e.g., active environment highlighting).
- Main styles: [src/App.css](src/App.css), [src/index.css](src/index.css).
