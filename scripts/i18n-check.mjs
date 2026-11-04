// scripts/i18n-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const arPath = path.join(rootDir, 'src', 'i18n', 'ar.json');
const enPath = path.join(rootDir, 'src', 'i18n', 'en.json');

if (!fs.existsSync(arPath) || !fs.existsSync(enPath)) {
  console.error('Error: ar.json or en.json is missing in src/i18n/');
  process.exit(1);
}

const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const arKeys = new Set(flattenKeys(arData));
const enKeys = new Set(flattenKeys(enData));

const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));

let hasErrors = false;

if (missingInEn.length > 0) {
  console.error(`\x1b[31m[i18n] Keys missing in en.json (${missingInEn.length}):\x1b[0m`);
  missingInEn.slice(0, 20).forEach((k) => console.error(`  - ${k}`));
  if (missingInEn.length > 20) console.error(`  ...and ${missingInEn.length - 20} more`);
  hasErrors = true;
}

if (missingInAr.length > 0) {
  console.error(`\x1b[31m[i18n] Keys missing in ar.json (${missingInAr.length}):\x1b[0m`);
  missingInAr.slice(0, 20).forEach((k) => console.error(`  - ${k}`));
  if (missingInAr.length > 20) console.error(`  ...and ${missingInAr.length - 20} more`);
  hasErrors = true;
}

// Check for unused keys across src/
function getAllSourceFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files = files.concat(getAllSourceFiles(fullPath));
      }
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = getAllSourceFiles(path.join(rootDir, 'src'));
const combinedSource = sourceFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const unusedKeys = [];
for (const key of arKeys) {
  // Check if key is used either as 'namespace.key' or last segment or in strings.js legacy
  const lastPart = key.split('.').pop();
  if (
    !combinedSource.includes(`'${key}'`) &&
    !combinedSource.includes(`"${key}"`) &&
    !combinedSource.includes(`\`${key}\``) &&
    !combinedSource.includes(`'${lastPart}'`) &&
    !combinedSource.includes(`"${lastPart}"`)
  ) {
    unusedKeys.push(key);
  }
}

if (unusedKeys.length > 0) {
  console.warn(`\x1b[33m[i18n] Potentially unused keys (${unusedKeys.length}):\x1b[0m`);
  unusedKeys.slice(0, 10).forEach((k) => console.warn(`  - ${k}`));
}

if (hasErrors) {
  console.error('\x1b[31m[i18n:check] FAILED: Missing keys detected between translation files.\x1b[0m');
  process.exit(1);
} else {
  console.log(`\x1b[32m[i18n:check] PASSED: All ${arKeys.size} keys match seamlessly across AR & EN.\x1b[0m`);
  process.exit(0);
}

