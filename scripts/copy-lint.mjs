#!/usr/bin/env node
/**
 * Copy lint (UI spec section 1, POS 7). Fails (exit 1) on banned phrases, em dashes or
 * en dashes in user-facing source: src/** (ts, tsx, html, json, css content strings),
 * index.html and public/manifest.webmanifest.
 *
 * CSS: only `content:` strings render text, so CSS identifiers (e.g. the design token
 * `--danger`, `env(safe-area-inset-*)`) are not user copy and are skipped.
 * TS/TSX: the CSS environment token `safe-area-inset` is technical and allow-listed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

export const BANNED = /safe ride|get home safe|home safe|leave the light on|every guest home|guarantee|ensure your safety|protect|certified|date rape|assault|spiking|drugged|predator|danger|free ride with|included with drinks|liability|dram shop|angela|angel shot|nightcap|secret code|had too much|over-served|overserved|overdone it|crawl|bar hop|next bar|next stop|came from|previous venue|comes with your tab|every guest gets a ride|automatic ride|your limit|legal amount|offered, declined|coverage|covered if|just in case|ride insurance|peace of mind|worry-free|legal protection|drunk|intoxicat|\u2014|\u2013/i;
export const SAFE = /\bsafe\b|unsafe/i;
/** Standalone 'lit' reads as alcohol related (founder, Oct 10). Whole word only: little, split, literally pass. */
export const LIT = /\blit\b/i;
/** Harper legal items (money-promises memo): whole word or phrase. */
export const LEGAL = /\bguarantee\b|\bguaranteed\b|\binsured\b|\bprotection plan\b|\bzero risk\b|\bnever hit the bar\b|\bnever reach the bar\b|\boff the bar['\u2019]s account\b|\bcannot dispute\b|\bcan['\u2019]t dispute\b|\bno disputes after\b/i;
/** "included" only with the dollar amount right after it ("Ride home included: $27.40."); bare use reads as a free ride (Harper 23:11). */
export const INCLUDED = /\bincluded\b(?!: \$)/i;
/**
 * Harper payout-return memo (23:11): insurance and guaranty words, banned on bar screens, bar-facing config copy
 * and owner statements (in addition to everything above). Whole words, with common inflections.
 */
export const STATEMENT_LEGAL = /\b(coverage|claims?|claimed|loss|losses|indemnif(?:y|ies|ied|ication)|deductibles?|premiums?|plans?|polic(?:y|ies)|guarantee[sd]?|reimburse[sd]?|reimbursements?|reimbursing)\b/i;
/** Files that hold bar-facing or statement copy. */
export const STATEMENT_FILES = [/^src\/screens\/bar\//, /^src\/screens\/owner\.tsx$/, /^src\/lib\/ownerData\.ts$/, /^src\/lib\/payouts\.ts$/, /^src\/venue\.config\.ts$/];
export const APPROVED = [
  'If you feel unsafe or just need to get home, you can put your ride home on your bar tab. No app, no phone, no separate payment.',
  // same approved sentence with the venue bill noun read from venue.config.ts (renders identically)
  'If you feel unsafe or just need to get home, you can put your ride home on your bar {T.bill}. No app, no phone, no separate payment.',
  'Guest says they feel unsafe?',
];
const APPROVED_WHERE = "They won't see where you were before.";
const TECH_ALLOW = [/safe-area-inset(-[a-z]+)?/gi];

export function lintText(text, file = '<text>') {
  const problems = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    let line = raw;
    for (const a of APPROVED) line = line.split(a).join('');
    line = line.split(APPROVED_WHERE).join('');
    for (const re of TECH_ALLOW) line = line.replace(re, '');
    const m = line.match(BANNED);
    if (m) problems.push({ file, line: i + 1, match: m[0] === '\u2014' ? 'em dash' : m[0] === '\u2013' ? 'en dash' : m[0] });
    const s = line.match(SAFE);
    if (s) problems.push({ file, line: i + 1, match: s[0] });
    const l = line.match(LIT);
    if (l) problems.push({ file, line: i + 1, match: l[0] });
    const g = line.match(LEGAL);
    if (g) problems.push({ file, line: i + 1, match: g[0] });
    if (/where you were/i.test(line)) problems.push({ file, line: i + 1, match: 'where you were' });
    const inc = line.match(INCLUDED);
    if (inc) problems.push({ file, line: i + 1, match: 'included (without ": $" amount)' });
  });
  return problems;
}

/** Bar screens and statements: everything in lintText plus STATEMENT_LEGAL. */
export function lintStatementText(text, file = '<text>') {
  const problems = lintText(text, file);
  text.split(/\r?\n/).forEach((line, i) => {
    const m = line.match(STATEMENT_LEGAL);
    if (m) problems.push({ file, line: i + 1, match: m[0] });
  });
  return problems;
}

function cssContentStrings(css) {
  // keep only the string values of `content:` declarations, line-preserving
  return css.split(/\r?\n/).map((l) => (l.match(/content\s*:\s*(['"])(.*?)\1/g) || []).join(' ')).join('\n');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const files = [
    ...walk(join(ROOT, 'src')).filter((f) => ['.ts', '.tsx', '.html', '.json', '.css'].includes(extname(f))),
    join(ROOT, 'index.html'),
    join(ROOT, 'public', 'manifest.webmanifest'),
  ];
  let problems = [];
  for (const f of files) {
    let text = readFileSync(f, 'utf8');
    if (extname(f) === '.css') text = cssContentStrings(text);
    const rel = relative(ROOT, f).split('\\').join('/');
    problems = problems.concat(STATEMENT_FILES.some((re) => re.test(rel)) ? lintStatementText(text, rel) : lintText(text, rel));
  }
  if (problems.length) {
    for (const p of problems) console.error(`copy-lint: ${p.file}:${p.line} banned "${p.match}"`);
    console.error(`copy-lint: FAILED with ${problems.length} problem(s) in ${files.length} files.`);
    process.exit(1);
  }
  console.log(`copy-lint: OK (${files.length} files checked).`);
}
