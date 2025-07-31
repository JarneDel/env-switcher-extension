
# Environment Switcher Browser Extension

[![Firefox Add-on](https://img.shields.io/amo/v/project-environment-switcher?logo=firefox-browser)](https://addons.mozilla.org/en-US/firefox/addon/project-environment-switcher/)

A React-based browser extension built with TypeScript and Vite that allows users to switch between different environments.

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Build Tools**: No additional build tools required (all handled by npm scripts)

## Installation Requirements

### Node.js and npm

1. **Download and Install Node.js**:
    - Visit [https://nodejs.org/](https://nodejs.org/)
    - Download the LTS version (recommended)
    - Install following the platform-specific instructions
    - This will automatically install npm as well

2. **Verify Installation**:
   ```bash
   node --version
   npm --version
   ```
    - Node.js should be v18.0.0 or higher
    - npm should be v8.0.0 or higher

## Build Instructions

```bash
npm install
```

#### For Firefox:

```bash
 npm run build:firefox
```

### Step 4: Package Extension (Optional)

```bash
npm run package:firefox
```
