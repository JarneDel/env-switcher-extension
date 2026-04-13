import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

function bumpVersion() {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const wxtConfigPath = path.join(rootDir, 'wxt.config.ts');

    // 1. Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const oldVersion = packageJson.version;

    // 2. Run npm version patch to get the new version
    console.log(`Bumping version from ${oldVersion}...`);
    execSync('npm version patch --no-git-tag-version', { cwd: rootDir, stdio: 'inherit' });

    // 3. Read the new version from package.json
    const newPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const newVersion = newPackageJson.version;
    console.log(`New version: ${newVersion}`);

    // 4. Update wxt.config.ts
    let wxtConfig = fs.readFileSync(wxtConfigPath, 'utf-8');
    const versionRegex = /version:\s*'[^']+'/g;
    wxtConfig = wxtConfig.replace(versionRegex, `version: '${newVersion}'`);
    fs.writeFileSync(wxtConfigPath, wxtConfig);
    console.log(`Updated wxt.config.ts with version ${newVersion}`);

    // 5. Git commit and tag
    try {
        execSync(`git add package.json package-lock.json wxt.config.ts`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`git tag v${newVersion}`, { cwd: rootDir, stdio: 'inherit' });
        console.log('Committed and tagged new version.');
    } catch (error) {
        console.error('Git operations failed. Make sure you have a clean working directory.');
        process.exit(1);
    }

    // 6. Build and package
    console.log('Building and packaging...');
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    execSync('npm run package:chrome', { cwd: rootDir, stdio: 'inherit' });
    execSync('npm run package:firefox', { cwd: rootDir, stdio: 'inherit' });

    console.log(`Successfully bumped to ${newVersion} and packaged.`);
    console.log('Run "git push && git push --tags" to publish.');
}

bumpVersion();
