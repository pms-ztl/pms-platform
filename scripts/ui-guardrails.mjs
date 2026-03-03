#!/usr/bin/env node
// ---------------------------------------------------------------------------
// UI Guardrails — CI script that fails if anti-patterns are introduced
// ---------------------------------------------------------------------------
// Run: node scripts/ui-guardrails.mjs
// Exit 0 = pass, Exit 1 = violations found
//
// Scans apps/web/src/ for known anti-patterns that cause blank-space defects.
// Each rule can be suppressed with an inline comment pragma:
//   // ui-allow: <rule-name> — <reason>
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(process.cwd(), 'apps', 'web', 'src');
const PAGE_DIR = join(SRC_DIR, 'pages');

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const rules = [
  {
    id: 'fixed-viewport-height',
    description: 'Viewport-based height classes create fixed-height traps',
    // Match h-screen, min-h-screen, h-[100vh], min-h-[100vh], h-[calc(100vh...)], min-h-[calc(100vh...)]
    pattern: /\b(h-screen|min-h-screen|h-\[\d*vh\]|min-h-\[\d*vh\]|h-\[calc\(100vh|min-h-\[calc\(100vh)/g,
    dirs: [PAGE_DIR],
    // Allowed in layouts (DashboardLayout uses flex-1 which is fine)
    excludeFiles: ['DashboardLayout.tsx', 'AuthLayout.tsx', 'SuperAdminLayout.tsx', 'LandingPage.tsx'],
    pragma: 'ui-allow: fixed-height',
  },
  {
    id: 'min-h-viewport-value',
    description: 'Large min-height values (60vh+) create empty space on sparse pages',
    pattern: /min-h-\[(\d+)vh\]/g,
    dirs: [PAGE_DIR],
    excludeFiles: ['LandingPage.tsx'],
    pragma: 'ui-allow: fixed-height',
    // Custom check: only flag if the value is >= 50
    customCheck: (match) => {
      const m = match.match(/min-h-\[(\d+)vh\]/);
      return m && parseInt(m[1], 10) >= 50;
    },
  },
  {
    id: 'rigid-grid-for-collections',
    description: 'Rigid grid-cols-3 on dynamic collections — use SafeGrid instead',
    // Match grid-cols-3 in page files (not forms or layout)
    pattern: /grid-cols-3(?!\s)/g,
    dirs: [PAGE_DIR],
    excludeFiles: ['LandingPage.tsx'],
    pragma: 'ui-allow: rigid-grid',
    // Only flag in JSX className context (approximate: preceded by "or space)
    contextRequired: /className.*grid-cols-3/,
  },
  {
    id: 'giant-padding-empty-state',
    description: 'py-16 or larger padding creates oversized empty states',
    pattern: /\bpy-(1[6-9]|[2-9]\d)\b/g,
    dirs: [PAGE_DIR],
    excludeFiles: ['LandingPage.tsx'],
    pragma: 'ui-allow: large-padding',
  },
  {
    id: 'giant-padding-empty-state-20',
    description: 'py-20 or py-24 creates oversized empty states',
    pattern: /\bpy-(2[0-9]|3\d)\b/g,
    dirs: [PAGE_DIR],
    excludeFiles: ['LandingPage.tsx'],
    pragma: 'ui-allow: large-padding',
  },
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function walkDir(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...walkDir(full));
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        results.push(full);
      }
    }
  } catch {
    // directory may not exist
  }
  return results;
}

function scanFile(filePath, rule) {
  const fileName = filePath.split(/[/\\]/).pop();
  if (rule.excludeFiles?.includes(fileName)) return [];

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines with the pragma comment
    if (line.includes(rule.pragma)) continue;

    // Check next line for pragma too (sometimes on line above)
    if (i > 0 && lines[i - 1]?.includes(rule.pragma)) continue;

    const matches = line.matchAll(rule.pattern);
    for (const match of matches) {
      // Custom check if defined
      if (rule.customCheck && !rule.customCheck(match[0])) continue;

      // Context check if defined
      if (rule.contextRequired && !rule.contextRequired.test(line)) continue;

      violations.push({
        file: relative(process.cwd(), filePath),
        line: i + 1,
        column: match.index + 1,
        match: match[0],
        rule: rule.id,
        description: rule.description,
        pragma: rule.pragma,
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let totalViolations = 0;
const allViolations = [];

for (const rule of rules) {
  for (const dir of rule.dirs) {
    const files = walkDir(dir);
    for (const file of files) {
      const violations = scanFile(file, rule);
      allViolations.push(...violations);
      totalViolations += violations.length;
    }
  }
}

// Output
if (totalViolations === 0) {
  console.log('✅ UI Guardrails: All checks passed — no anti-patterns detected.');
  process.exit(0);
} else {
  console.error(`\n❌ UI Guardrails: ${totalViolations} violation(s) found\n`);
  console.error('─'.repeat(70));
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}:${v.column}`);
    console.error(`    Rule: ${v.rule} — ${v.description}`);
    console.error(`    Match: "${v.match}"`);
    console.error(`    Fix: Remove the anti-pattern or add pragma: ${v.pragma} — <reason>`);
    console.error('');
  }
  console.error('─'.repeat(70));
  console.error(`\nTo suppress a violation, add this comment on the same line:`);
  console.error(`  // ui-allow: <rule-name> — <reason>\n`);
  process.exit(1);
}
