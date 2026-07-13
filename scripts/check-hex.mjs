/*
 * Custom lint grep (spec 00 rule 3, Elevra fix #2): no hex colour literals in
 * component code or SVGs. Colour must come through CSS variables / Tailwind tokens.
 * The token source of truth (design/tokens.ts) and the runtime cascade (src/index.css)
 * are the only places hex is allowed, and neither is scanned here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['src/components', 'src/dev'];
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;

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

// Strip comments so token references inside comments are not flagged.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (HEX.test(line)) violations.push(`${file}:${i + 1}  ${line.trim()}`);
    });
  }
}

if (violations.length) {
  console.error('\nHex colour literals found in component code (use CSS variables / tokens):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(`\n${violations.length} violation(s).\n`);
  process.exit(1);
}
console.log('check-hex: clean');
