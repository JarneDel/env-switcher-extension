---
name: browser-extension-deployment
description: "Deploy browser extensions to Chrome Web Store and Mozilla Add-ons platforms. Covers manifest versioning, build target management, packaging, signing, store submission workflows, and automated Deployment pipelines. USE FOR: Chrome Web Store deployment, Firefox Add-ons deployment, manifest version management, multi-target builds, extension packaging, signing requirements, store submission automation, release workflows, version management. DO NOT USE FOR: local testing setup, Vite configuration, content script development."
---

# env-switcher: Browser Extension Deployment

Complete guide for packaging and deploying env-switcher to **Chrome Web Store** and **Mozilla Add-ons**, with version management and build target handling.

## Project Structure

The env-switcher project supports dual builds for Chrome and Firefox:

- **Chrome manifest**: [manifest.json](manifest.json)
- **Firefox manifest**: [manifest-firefox.json](manifest-firefox.json)
- **Chrome output**: `dist-chrome/`
- **Firefox output**: `dist-firefox/`

## Manifest Versioning

### Chrome Manifest

Update [manifest.json](manifest.json):

```json
{
  "manifest_version": 3,
  "name": "env-switcher",
  "version": "1.0.5",
  "description": "Smart environment switcher for multi-environment development",
  "permissions": ["storage", "scripting", "tabs", "webRequest"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "index.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ]
}
```

### Firefox Manifest

Update [manifest-firefox.json](manifest-firefox.json):

```json
{
  "manifest_version": 3,
  "name": "env-switcher",
  "version": "1.0.5",
  "browser_specific_settings": {
    "gecko": {
      "id": "{your-addon-id}@mozilla",
      "strict_min_version": "109.0"
    }
  },
  "permissions": ["storage", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "scripts": ["background.js"]
  },
  "browser_action": {
    "default_popup": "index.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ]
}
```

### Version Sync Script

Create `.github/scripts/sync-versions.js`:

```javascript
const fs = require('fs');
const packageJson = require('../../package.json');

const version = packageJson.version;

// Update Chrome manifest
const chromeManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
chromeManifest.version = version;
fs.writeFileSync('manifest.json', JSON.stringify(chromeManifest, null, 2));

// Update Firefox manifest
const firefoxManifest = JSON.parse(fs.readFileSync('manifest-firefox.json', 'utf-8'));
firefoxManifest.version = version;
fs.writeFileSync('manifest-firefox.json', JSON.stringify(firefoxManifest, null, 2));

console.log(`✓ Synced version to ${version}`);
```

Add to [package.json](package.json):

```json
{
  "scripts": {
    "sync-versions": "node .github/scripts/sync-versions.js"
  }
}
```

## Build & Packaging

### Build Commands

All builds defined in [package.json](package.json):

```bash
# Chrome development
npm run dev:chrome

# Firefox development
npm run dev:firefox

# Chrome production build
npm run build:chrome

# Firefox production build
npm run build:firefox

# Watch for changes (Chrome)
npm run watch:chrome

# Watch for changes (Firefox)
npm run watch:firefox
```

### Packaging for Distribution

Create `.github/scripts/package-extension.sh`:

```bash
#!/bin/bash

VERSION=${1:-$(jq -r '.version' package.json)}

# Package Chrome extension
echo "📦 Packaging Chrome extension..."
npm run build:chrome
cd dist-chrome
zip -r ../env-switcher-chrome-${VERSION}.zip .
cd ..
echo "✓ Created env-switcher-chrome-${VERSION}.zip"

# Package Firefox extension
echo "📦 Packaging Firefox extension..."
npm run build:firefox
cd dist-firefox
zip -r ../env-switcher-firefox-${VERSION}.zip .
cd ..
echo "✓ Created env-switcher-firefox-${VERSION}.zip"

echo "✓ All packages ready for submission"
```

Make executable:

```bash
chmod +x .github/scripts/package-extension.sh
```

## Chrome Web Store Deployment

### Preparation

1. **Create Chrome Web Store developer account**: https://chrome.google.com/webstore/devconsole
2. **Register extension**: Pay one-time $5 developer fee
3. **Get extension ID**: Available in Web Store dashboard

### Submission Steps

1. **Prepare build**:
   ```bash
   npm run build:chrome
   ```

2. **Create distribution package**:
   ```bash
   cd dist-chrome
   zip -r ../env-switcher-chrome.zip .
   cd ..
   ```

3. **Upload to Web Store**:
   - Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
   - Click "Upload new package"
   - Select `env-switcher-chrome.zip`
   - Review permissions carefully
   - Click "Submit for review"

4. **Review process**:
   - Google reviews manually (typically 1-3 days)
   - Check status in dashboard
   - If rejected, update and resubmit

### Required Store Assets

- **Icon**: 128x128 PNG (store listing)
- **Screenshots**: 1280x800 PNG (3-5 screenshots recommended)
- **Detailed description**: Highlight key features, use cases, and differentiators
- **Privacy policy**: Required if extension accesses sensitive data

### Review Checklist

- [ ] No obtrusive permissions
- [ ] Clear description of functionality
- [ ] Single, well-defined purpose
- [ ] No malware or security issues
- [ ] Complies with Chrome Web Store policies
- [ ] Privacy policy disclosed
- [ ] Icons and screenshots are clear

## Firefox Add-ons Deployment

### Preparation

1. **Create Mozilla Developer account**: https://addons.mozilla.org/developers/
2. **Verify email**
3. **Accept developer agreement**

### Submission Steps

1. **Get Extension ID**:
   - Add to [manifest-firefox.json](manifest-firefox.json) under `browser_specific_settings.gecko.id`
   - Example: `"{your-addon-id}@mozilla"`

2. **Prepare build**:
   ```bash
   npm run build:firefox
   ```

3. **Create distribution package**:
   ```bash
   cd dist-firefox
   zip -r ../env-switcher-firefox.zip .
   cd ..
   ```

4. **Upload to Mozilla Add-ons**:
   - Go to [Add-ons Developer Hub](https://addons.mozilla.org/developers/addon/submit/)
   - Select "On-site hosting" or "Source code upload"
   - Upload `env-switcher-firefox.zip`
   - Review submission info
   - Click "Submit for review"

5. **Review process**:
   - Mozilla auto-reviews code (usually instant)
   - Then manual review by Mozilla team (1-5 days)
   - Email notification of approval or necessary changes

### Firefox-Specific Details

- **Strict security policy**: No remote scripts or eval
- **Manifest V2 vs V3**: Use MV3; Firefox supports full MV3 as of v109
- **Icon requirements**: 48x48 and 96x96 PNG minimum

## Automated Deployment (CI/CD)

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Sync versions
        run: npm run sync-versions

      - name: Build Chrome
        run: npm run build:chrome

      - name: Build Firefox
        run: npm run build:firefox

      - name: Package Chrome
        run: |
          cd dist-chrome
          zip -r ../env-switcher-chrome-${{ github.ref_name }}.zip .

      - name: Package Firefox
        run: |
          cd dist-firefox
          zip -r ../env-switcher-firefox-${{ github.ref_name }}.zip .

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            env-switcher-chrome-*.zip
            env-switcher-firefox-*.zip

      # Chrome Web Store upload (requires API credentials)
      - name: Upload to Chrome Web Store
        if: success()
        run: |
          # Use Chrome Web Store API with stored credentials
          # Requires: CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN
          # See: https://developer.chrome.com/docs/webstore/using_webstore_api/

      # Firefox Add-ons upload (requires API key)
      - name: Upload to Mozilla Add-ons
        if: success()
        run: |
          # Use web-ext CLI for submission
          # Requires: MOZILLA_API_KEY, MOZILLA_API_SECRET
          # npx web-ext sign --api-key=${{ secrets.MOZILLA_API_KEY }} ...
```

## Version Management Strategy

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org):

- **MAJOR**: Breaking changes, UI overhaul, new required permissions
- **MINOR**: New features, non-breaking enhancements
- **PATCH**: Bug fixes, performance improvements

### Release Workflow

1. **Update version** in [package.json](package.json):
   ```bash
   npm version patch|minor|major
   ```

2. **Sync manifests**:
   ```bash
   npm run sync-versions
   ```

3. **Commit and tag**:
   ```bash
   git add manifest.json manifest-firefox.json package.json
   git commit -m "Bump version to 1.0.5"
   git tag v1.0.5
   git push origin main --tags
   ```

4. **CI/CD pipeline** automatically:
   - Builds both targets
   - Packages for distribution
   - Creates GitHub release
   - Optionally uploads to stores

## Testing Before Deployment

### Local Testing

**Chrome**:
```bash
npm run build:chrome
# Open chrome://extensions/
# Enable "Developer mode" (top right)
# Click "Load unpacked"
# Select dist-chrome/ folder
```

**Firefox**:
```bash
npm run build:firefox
# Open about:debugging#/runtime/this-firefox
# Click "Load Temporary Add-on"
# Select dist-firefox/manifest.json
```

### Pre-submission Checklist

- [ ] All tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] Builds succeed for both targets
- [ ] Manual testing in Chrome and Firefox completed
- [ ] Versions synced across all manifests and package.json
- [ ] Changelogs updated
- [ ] Privacy policy and permissions documented
- [ ] Store assets (icons, screenshots) prepared

## Store-Specific Best Practices

### Chrome Web Store

- **Update frequency**: Users expect regular updates; minimum quarterly recommended
- **Permission creep**: Minimize permissions; explain each one in store listing
- **Accessibility**: Ensure keyboard navigation works
- **Performance**: 100ms max latency for popup interactions

### Mozilla Add-ons

- **Code review**: All code must pass Mozilla's security review; no external scripts
- **User support**: Include contact info or support URL
- **Localization**: Support multiple languages if possible
- **Community**: Respond to user reviews; maintain reputation score

## Troubleshooting

### Chrome Web Store Submission Denied

Common reasons:
- Permissions too broad (e.g., `<all_urls>` without justification)
- Unclear privacy policy
- Deceptive functionality or mimicking system UI
- External script loading or code injection

**Fix**: Update [manifest.json](manifest.json) to use specific host permissions, clarify privacy, and resubmit.

### Firefox Review Stuck

- Check Mozilla bug tracker for add-on status
- Respond to reviewer comments in dashboard
- Contact Mozilla Support if needed (typically 1-2 days response)

### Version Mismatch

If manifests are out of sync:
```bash
npm run sync-versions
git diff
```

Verify both manifests updated before submission.
