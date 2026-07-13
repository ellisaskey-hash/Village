/*
 * Custom lint grep (spec 00 rule 6, Elevra voice fixes #37/#38): no em-dashes and
 * no "the system" self-reference in user-facing source. Scans the src tree (ts + tsx).
 * Docs and specs are out of scope (they are prose about the build, not shipped copy).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const EM_DASH = /—/; // —
const SYSTEM = /\bthe system\b/i;

function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

// Only shipped copy is in scope: strip block and line comments first (Elevra fix #37 is
// scoped to strings "outside comments"). Blank the comment bodies rather than deleting so
// line numbers stay accurate.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

const violations = [];
for (const file of walk(ROOT)) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (EM_DASH.test(line)) violations.push(`${file}:${i + 1}  em-dash: ${line.trim()}`);
    if (SYSTEM.test(line)) violations.push(`${file}:${i + 1}  "the system": ${line.trim()}`);
  });
}

if (violations.length) {
  console.error('\nVoice violations (see docs/reference/elevra-audit voice rules):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(`\n${violations.length} violation(s).\n`);
  process.exit(1);
}
console.log('check-voice: clean');
