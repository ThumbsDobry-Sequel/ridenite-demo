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
/** Drink names (Quinn/Nico, Oct 11): the demo tab carries food and neutral items only, nothing that reads as a drinking cue. */
export const DRINK_NAMES = /\b(old fashioned|house beer|pear necessities|beers?|wines?|cocktails?|martinis?|whiske?y|vodka|tequila|bourbon|margaritas?|sangria|ipa)\b/i;
/** 'drink'/'drinks' in user copy (Piper/Riley/Quinn, Oct 11): say 'your bar tab' or 'food and items'. The code token 'drink' (MenuItem kind) is skipped. */
export const DRINKS = /\bdrinks?\b/i;
const DRINK_TOKEN = /(['"])drink\1/g;
/** Street addresses (Oct 11): area-only labels everywhere. A number followed by a street word, or a ZIP after VA/DC. */
export const STREET = /\b\d{2,5} (?:[NSEW] )?[A-Z][a-z]+(?: [A-Z][a-z]+)? (?:St|Street|Blvd|Ave|Avenue|Dr|Rd|Pike|Way|Pl|Ln)\b|\b(?:VA|DC) \d{5}\b/;
/** Standalone 'lit' reads as alcohol related (founder, Oct 10). Whole word only: little, split, literally pass. */
export const LIT = /\blit\b/i;
/** Harper legal items (money-promises memo): whole word or phrase. */
export const LEGAL = /\bguarantee\b|\bguaranteed\b|\binsured\b|\bprotection plan\b|\bzero risk\b|\bnever hit the bar\b|\bnever reach the bar\b|\boff the bar['\u2019]s account\b|\bcannot dispute\b|\bcan['\u2019]t dispute\b|\bno disputes after\b/i;
/** "included" only with the dollar amount right after it; bare use reads as a free ride (Harper 23:11). */
export const INCLUDED = /\bincluded\b(?!: \$)/i;
/** Quinn/Nico, Oct 11: next to a charge these read as a free ride. Say "Ride home added: $24.60." and "RideNite Ride". */
export const FREE_RIDE_PHRASES = /ride home included|courtesy car/i;
/** Statement wording (Nico, Oct 11): RideNite credits its fee; never 'fee returns', 'payout returned' or 'return window' (reads like a securities word on a public page). */
export const RETURN_PHRASES = /fee returns?\b|payout returned|return window/i;
/**
 * Harper payout-return memo (23:11): insurance and guaranty words, banned on bar screens, bar-facing config copy
 * and owner statements (in addition to everything above). Whole words, with common inflections.
 */
export const STATEMENT_LEGAL = /\b(coverage|claims?|claimed|loss|losses|indemnif(?:y|ies|ied|ication)|deductibles?|premiums?|plans?|polic(?:y|ies)|guarantee[sd]?|reimburse[sd]?|reimbursements?|reimbursing)\b/i;
/**
 * Over-cap credit memo (Oct 11): on fare, statement and receipt surfaces (copy and comments) nothing may say RideNite
 * pays, covers, absorbs, settles or reimburses a fare, or sounds like insurance. Whole words, common inflections.
 */
export const MONEY_WORDS = /\b(absorb(?:s|ed|ing)?|cover(?:s|ed|ing)?|pays|settles?|settled|reimburs\w*|protection|guarantee[sd]?|insured)\b/i;
/** Fare, statement and receipt files (guest receipts, confirm, status, bar screens, owner statement and their libs). */
export const MONEY_FILES = [/^src\/lib\/(fare|payouts|ownerData|checkLines|confirmRecord|brand|morning|tab)\.ts$/, /^src\/screens\/(morning|confirm|trip|owner|edges)\.tsx$/, /^src\/screens\/bar\//, /^src\/components\/RideStatus\.tsx$/];
/** Files that hold bar-facing or statement copy. */
export const STATEMENT_FILES = [/^src\/screens\/bar\//, /^src\/screens\/owner\.tsx$/, /^src\/lib\/ownerData\.ts$/, /^src\/lib\/payouts\.ts$/, /^src\/venue\.config\.ts$/];
/** No approved exceptions for 'safe'/'unsafe' (Quinn, Oct 11): any use in user copy fails lint. */
export const APPROVED = [];
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
    const dn = line.match(DRINK_NAMES);
    if (dn) problems.push({ file, line: i + 1, match: dn[0] });
    const dk = line.replace(DRINK_TOKEN, '').match(DRINKS);
    if (dk) problems.push({ file, line: i + 1, match: dk[0] });
    const st = line.match(STREET);
    if (st) problems.push({ file, line: i + 1, match: st[0] });
    const l = line.match(LIT);
    if (l) problems.push({ file, line: i + 1, match: l[0] });
    const g = line.match(LEGAL);
    if (g) problems.push({ file, line: i + 1, match: g[0] });
    if (/where you were/i.test(line)) problems.push({ file, line: i + 1, match: 'where you were' });
    const inc = line.match(INCLUDED);
    if (inc) problems.push({ file, line: i + 1, match: 'included (without ": $" amount)' });
    const fr = line.match(FREE_RIDE_PHRASES);
    if (fr) problems.push({ file, line: i + 1, match: fr[0] });
    const rp = line.match(RETURN_PHRASES);
    if (rp) problems.push({ file, line: i + 1, match: rp[0] });
  });
  return problems;
}

/** Fare, statement and receipt copy: everything in lintText plus MONEY_WORDS. */
export function lintMoneyText(text, file = '<text>') {
  const problems = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const m = line.match(MONEY_WORDS);
    if (m) problems.push({ file, line: i + 1, match: m[0] });
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

/**
 * Guest-facing ride row guard (Quinn, Oct 11): 'quoted fare' is the bartender POS / B6 line only. Guest screens,
 * the morning receipt and email, and their libs must never contain it or reference the POS constant.
 */
export const GUEST_FILES = [/^src\/screens\/(confirm|demo|edges|entry|home|morning|trip|where)\.tsx$/, /^src\/components\/RideStatus\.tsx$/, /^src\/lib\/(morning|brand|night|confirmRecord)\.ts$/];
export const GUEST_BANNED = /quoted fare|RIDE_POS_LINE|RIDE_QUOTE_LINE/i;
export function lintGuestText(text, file = '<text>') {
  const problems = [];
  text.split(/\r?\n/).forEach((line, i) => { const m = line.match(GUEST_BANNED); if (m) problems.push({ file, line: i + 1, match: `${m[0]} (guest-facing: POS quote line only)` }); });
  return problems;
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
    if (MONEY_FILES.some((re) => re.test(rel))) problems = problems.concat(lintMoneyText(text, rel));
    if (GUEST_FILES.some((re) => re.test(rel))) problems = problems.concat(lintGuestText(text, rel));
  }
  if (problems.length) {
    for (const p of problems) console.error(`copy-lint: ${p.file}:${p.line} banned "${p.match}"`);
    console.error(`copy-lint: FAILED with ${problems.length} problem(s) in ${files.length} files.`);
    process.exit(1);
  }
  console.log(`copy-lint: OK (${files.length} files checked).`);
}
