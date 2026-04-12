---
name: vitest-testing
description: "Unit Testing with Vitest, mocking strategies, test patterns for utilities and React components. USE FOR: writing Unit Tests, Vitest configuration, mocking browser APIs, mocking Chrome extensions APIs, testing utility functions, testing React components, test coverage, test helpers, localStorage mocking, message passing mocks. DO NOT USE FOR: E2E testing with Playwright, integration testing, visual regression testing."
---

# env-switcher: Vitest Unit Testing

Comprehensive guide for unit testing the env-switcher browser extension using **Vitest**, with mocking strategies for browser and extension APIs.

## Setup & Configuration

### Installation

Add Vitest and utilities to `devDependencies`:

```bash
npm install --save-dev vitest @vitest/ui happy-dom @testing-library/react @testing-library/dom
```

### Vite Configuration

Update [vite.config.ts](vite.config.ts) with Vitest configuration:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // lightweight DOM; use 'jsdom' if needed
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/content-script.ts', 'src/background.ts'],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

### Setup File

Create [vitest.setup.ts](vitest.setup.ts) for global mocks:

```typescript
import { vi } from 'vitest';

// Mock Chrome Runtime
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    getURL: vi.fn((path) => `chrome-extension://mock/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });
```

## Mocking Strategies

### 1. Mocking Chrome Extension APIs

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Extension Storage Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message to background script', async () => {
    const sendMessageMock = vi.fn().mockResolvedValue({ success: true });
    (chrome.runtime.sendMessage as any) = sendMessageMock;

    // Test code
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'GET_CONFIGURATION',
    });
  });
});
```

### 2. Mocking Storage Operations

For testing [src/libs/storage.ts](src/libs/storage.ts):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ExtensionStorage } from '../content/extension-storage';

describe('ExtensionStorage', () => {
  it('should save and retrieve configuration', async () => {
    const storage = new ExtensionStorage();
    
    const config = {
      projects: [{ id: '1', name: 'test', environments: [] }],
    };

    await storage.saveConfiguration(config);
    const retrieved = await storage.getConfiguration();
    
    expect(retrieved).toEqual(config);
  });
});
```

### 3. Mocking DOM and Browser APIs

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Favicon Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should update favicon link', () => {
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);

    updateFaviconDataUrl('data:image/png;base64,...');

    expect(link.href).toContain('data:image');
  });
});
```

### 4. Mocking Utility Functions

For testing [src/libs/validationUtils.ts](src/libs/validationUtils.ts):

```typescript
import { describe, it, expect } from 'vitest';
import { validateEnvironment } from '../libs/validationUtils';

describe('Validation Utils', () => {
  it('should validate environment URL', () => {
    const env = { name: 'Test', baseUrl: 'invalid-url', projectId: '1' };
    const errors = validateEnvironment(env, [{ id: '1', name: 'Project' }]);

    expect(errors).toContain('Invalid URL format');
  });

  it('should accept valid URLs', () => {
    const env = { name: 'Test', baseUrl: 'https://example.com', projectId: '1' };
    const errors = validateEnvironment(env, [{ id: '1', name: 'Project' }]);

    expect(errors).not.toContain('Invalid URL format');
  });
});
```

## Test Patterns

### Utility Function Tests

Keep utility tests focused on input/output validation:

```typescript
import { describe, it, expect } from 'vitest';
import { colorUtils } from '../libs/colorUtils';

describe('Color Utils', () => {
  describe('hexToRgb', () => {
    it('converts hex to RGB', () => {
      expect(colorUtils.hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    });

    it('handles lowercase hex', () => {
      expect(colorUtils.hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    });

    it('throws on invalid hex', () => {
      expect(() => colorUtils.hexToRgb('invalid')).toThrow();
    });
  });
});
```

### React Component Tests

Test components with [React Testing Library](https://testing-library.com):

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectsList } from '../components/ProjectsList';

describe('ProjectsList', () => {
  it('renders empty state when no projects', () => {
    render(<ProjectsList projects={[]} />);
    expect(screen.getByText('No projects added')).toBeInTheDocument();
  });

  it('displays project names', () => {
    const projects = [{ id: '1', name: 'API', environments: [] }];
    render(<ProjectsList projects={projects} />);
    expect(screen.getByText('API')).toBeInTheDocument();
  });
});
```

### Content Script Tests

Mock the DOM and runtime messaging for content scripts:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeLanguageDetector } from '../content/language-detector';

describe('Language Detector', () => {
  beforeEach(() => {
    document.documentElement.lang = '';
  });

  it('detects language from HTML element', () => {
    document.documentElement.lang = 'fr-FR';
    const lang = detectLanguage();
    expect(lang).toBe('fr');
  });
});
```

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI dashboard
npm run test:ui
```

Add to [package.json](package.json):

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Best Practices

1. **Keep unit tests fast**: Mock all external APIs and network calls.
2. **Test behavior, not implementation**: Focus on basics (inputs/outputs).
3. **Use `beforeEach` for setup**: Ensures test isolation and prevents state leakage.
4. **Mock browser APIs globally**: Define in [vitest.setup.ts](vitest.setup.ts) to avoid repetition.
5. **Cover edge cases**: Test invalid URLs, missing fields, null values.
6. **Name tests clearly**: Use descriptive `it()` labels that explain what is being tested.
7. **Avoid testing framework internals**: Don't test Vitest or React Testing Library; test your code.

## Common Gotchas

- **Happy DOM vs jsdom**: Happy DOM is minimal; use `jsdom` if you need full DOM support.
- **Async/await in tests**: Always `await` promises or return them from test functions.
- **localStorage in tests**: Must be explicitly mocked in [vitest.setup.ts](vitest.setup.ts).
- **Chrome API availability**: The global `chrome` object only exists in the extension context; mock it in tests.
