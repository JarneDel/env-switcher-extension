---
name: storage-and-data
description: "Use when: modifying the extension state, storage logic, or data models (Project, Environment, Config)."
---

# env-switcher: Storage & Data Models

Centralized configuration management for projects, environments, and application settings.

## Data Models ([src/types/](src/types/))

- **`Project`**: Root organizational unit for environments.
- **`Environment`**: Specific deployment (Local, Staging, Prod) with its own `baseUrl` and UI `color`.
- **`ExtensionConfig`**: Global state including all projects, environments, AI settings, and display preferences.

## Storage Layer ([src/libs/storage.ts](src/libs/storage.ts))

The `ExtensionStorage` class handles persistence:
- **Provider**: Uses `browser.storage.sync` with a fallback to `local`.
- **Validation**: Ensures data integrity during load/save operations.
- **Defaults**: Sensible configuration for new users or fresh installs.

## Usage in React ([src/context/ConfigurationContext.tsx](src/context/ConfigurationContext.tsx))

- Configuration is exposed via a React Context.
- State changes (CRUD) are atomic and persisted immediately to browser storage.
- Background scripts are notified of changes to refresh UI across all open tabs.
