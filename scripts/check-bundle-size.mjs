// scripts/check-bundle-size.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('[bundle-budget] Error: dist/assets does not exist. Run "npm run build" first.');
  process.exit(1);
}

// Intentional Bundle Size Budgets (in Kilobytes)
const BUDGETS = {
  // Main application entry chunk (reduced via rolldown codeSplitting groups)
  mainJs: { name: 'Main JS Entry', pattern: /^index-.*\.js$/, maxRawKb: 450, maxGzipKb: 130 },
  // Main styling chunk
  mainCss: { name: 'Main CSS', pattern: /^index-.*\.css$/, maxRawKb: 50, maxGzipKb: 15 },
  // React vendor chunk
  reactVendor: { name: 'React Vendor', pattern: /^react-vendor-.*\.js$/, maxRawKb: 300, maxGzipKb: 100 },
  // Supabase vendor chunk
  supabaseVendor: { name: 'Supabase Vendor', pattern: /^supabase-vendor-.*\.js$/, maxRawKb: 260, maxGzipKb: 85 },
  // Recharts vendor chunk
  rechartsVendor: { name: 'Recharts Vendor', pattern: /^recharts-vendor-.*\.js$/, maxRawKb: 450, maxGzipKb: 140 },
  // CSV Export lazy chunk
  csvExport: { name: 'CSV Export', pattern: /^csvExport-.*\.js$/, maxRawKb: 420, maxGzipKb: 130 },
  // Zod vendor chunk
  zodVendor: { name: 'Zod Vendor', pattern: /^zod-vendor-.*\.js$/, maxRawKb: 120, maxGzipKb: 40 },
  // Form vendor chunk
  formVendor: { name: 'Form Vendor', pattern: /^form-vendor-.*\.js$/, maxRawKb: 60, maxGzipKb: 20 },
  // Sentry vendor chunk
  sentryVendor: { name: 'Sentry Vendor', pattern: /^sentry-vendor-.*\.js$/, maxRawKb: 30, maxGzipKb: 10 },
};

const files = fs.readdirSync(assetsDir);
let hasFailure = false;

console.log('\n--- Bundle Size Quality Gate & Budget Check ---');
console.log(
  `${'Chunk'.padEnd(20)} | ${'File'.padEnd(32)} | ${'Raw Size'.padStart(10)} | ${'Max Raw'.padStart(8)} | ${'Gzip Size'.padStart(10)} | ${'Max Gzip'.padStart(9)} | Status`
);
console.log('-'.repeat(108));

for (const budget of Object.values(BUDGETS)) {
  const match = files.find((f) => budget.pattern.test(f));
  if (!match) {
    console.warn(`[WARN] Chunk for "${budget.name}" not found with pattern ${budget.pattern}`);
    continue;
  }

  const filePath = path.join(assetsDir, match);
  const content = fs.readFileSync(filePath);
  const rawKb = (content.length / 1024).toFixed(2);
  const gzipKb = (zlib.gzipSync(content).length / 1024).toFixed(2);

  const rawExceeded = parseFloat(rawKb) > budget.maxRawKb;
  const gzipExceeded = parseFloat(gzipKb) > budget.maxGzipKb;

  const passed = !rawExceeded && !gzipExceeded;
  if (!passed) hasFailure = true;

  const status = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL (EXCEEDED)\x1b[0m';

  console.log(
    `${budget.name.padEnd(20)} | ${match.padEnd(32)} | ${(rawKb + ' kB').padStart(10)} | ${(budget.maxRawKb + ' kB').padStart(8)} | ${(gzipKb + ' kB').padStart(10)} | ${(budget.maxGzipKb + ' kB').padStart(9)} | ${status}`
  );
}

console.log('-'.repeat(108));

if (hasFailure) {
  console.error('\x1b[31m[bundle-budget] FAILED: One or more bundle chunks exceeded their documented budget.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m[bundle-budget] PASSED: All bundle chunks are within documented size budgets.\x1b[0m\n');
}

