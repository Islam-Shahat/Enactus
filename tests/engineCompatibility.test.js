// tests/engineCompatibility.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Engine & Node Version Compatibility Quality Gate', () => {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  const readmePath = path.join(rootDir, 'README.md');
  const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  const readme = fs.readFileSync(readmePath, 'utf8');
  const ciWorkflow = fs.readFileSync(ciWorkflowPath, 'utf8');

  it('declares node >=22.12.0 and npm >=10.0.0 in package.json engines', () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBe('>=22.12.0');
    expect(packageJson.engines.npm).toBe('>=10.0.0');
  });

  it('keeps package-lock.json root package engines consistent with package.json', () => {
    const rootPkg = packageLock.packages[''];
    expect(rootPkg).toBeDefined();
    expect(rootPkg.engines).toBeDefined();
    expect(rootPkg.engines.node).toBe(packageJson.engines.node);
    expect(rootPkg.engines.npm).toBe(packageJson.engines.npm);
  });

  it('documents Node.js 22.12+ (LTS) in README.md', () => {
    expect(readme).toMatch(/Node\.js 22\.12\+/i);
  });

  it('configures Node 22 in GitHub Actions CI workflow', () => {
    expect(ciWorkflow).toMatch(/node-version:\s*['"]?22['"]?/);
  });

  it('verifies all locked dependencies are compatible with Node >=22.12.0', () => {
    const packages = packageLock.packages || {};
    const criticalPackages = [
      'node_modules/vitest',
      'node_modules/vite',
      'node_modules/oxlint',
      'node_modules/@supabase/supabase-js',
      'node_modules/@sentry/react',
    ];

    for (const pkgName of criticalPackages) {
      const pkg = packages[pkgName];
      expect(pkg, `${pkgName} should exist in package-lock.json`).toBeDefined();
      expect(pkg.engines?.node, `${pkgName} should declare a node engine`).toBeDefined();
    }

    // Vitest 5.1 requires ^22.12.0 || ^24.0.0 || >=26.0.0
    expect(packages['node_modules/vitest'].engines.node).toContain('22.12');

    // Supabase JS 2.118 requires >=22.0.0
    expect(packages['node_modules/@supabase/supabase-js'].engines.node).toBe('>=22.0.0');

    // Vite 8.3 requires >=22.12.0
    expect(packages['node_modules/vite'].engines.node).toContain('22.12');

    // Oxlint 1.88 requires >=22.12.0
    expect(packages['node_modules/oxlint'].engines.node).toContain('22.12');
  });
});

