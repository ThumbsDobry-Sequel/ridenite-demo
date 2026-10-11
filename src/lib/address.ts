import type { Address } from '../venue.config';

/** Forgiving address matching (UI 9b): normalize, expand abbreviations, edit distance up to 2. */
const ABBR: Record<string, string> = {
  st: 'street', str: 'street', ave: 'avenue', av: 'avenue', pl: 'place', blvd: 'boulevard', bl: 'boulevard',
  rd: 'road', dr: 'drive', pk: 'pike', n: 'north', s: 'south', e: 'east', w: 'west', nw: 'northwest',
  ne: 'northeast', sw: 'southwest', se: 'southeast', ct: 'court', ln: 'lane',
};
const NUM_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** "six fifty five" -> "655", "six hundred fifty five" -> "655" */
function numberWords(tokens: string[]): string[] {
  const out: string[] = [];
  let buf: number[] = [];
  const flush = () => {
    if (!buf.length) return;
    // Spoken house numbers are often digit groups: "six fifty five" = 6 | 55
    let s = '';
    let i = 0;
    while (i < buf.length) {
      let v = buf[i];
      if (v >= 20 && v % 10 === 0 && i + 1 < buf.length && buf[i + 1] < 10) { v += buf[i + 1]; i++; }
      s += String(v);
      i++;
    }
    out.push(s);
    buf = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in NUM_WORDS) buf.push(NUM_WORDS[t]);
    else if (t === 'hundred' && buf.length) { const h = buf.pop()! * 100; buf.push(h); }
    else { flush(); out.push(t); }
  }
  flush();
  // collapse "600" + "55" from "six hundred fifty five"
  return out.reduce<string[]>((acc, t) => {
    const prev = acc[acc.length - 1];
    if (prev && /^\d+00$/.test(prev) && /^\d{1,2}$/.test(t)) acc[acc.length - 1] = String(Number(prev) + Number(t));
    else acc.push(t);
    return acc;
  }, []);
}

export function normalize(s: string): string[] {
  const raw = s.toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return numberWords(raw).map((t) => ABBR[t] ?? t);
}

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Score: lower is better. Each query token must match some candidate token within distance 2. */
function score(query: string[], cand: string[]): number | null {
  let total = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const q = query[qi];
    const isLast = qi === query.length - 1;
    let best = Infinity;
    for (const c of cand) {
      if (/^\d/.test(q) || /^\d/.test(c)) {
        if (q === c || (isLast && c.startsWith(q))) best = 0;
        continue;
      }
      // the word being typed matches as a prefix from the first letter
      const d = c.startsWith(q) && (isLast || q.length >= 2) ? 0 : editDistance(q, c);
      best = Math.min(best, d);
    }
    const allowed = q.length <= 3 ? 1 : 2;
    if (best > allowed) return null;
    total += best;
  }
  return total;
}

export function suggest(input: string, list: readonly Address[], max = 3): Address[] {
  const q = normalize(input);
  if (!q.length) return [];
  const scored: { a: Address; s: number; i: number }[] = [];
  list.forEach((a, i) => {
    const forms = [normalize(`${a.line} ${a.area}`), ...(a.aliases ?? []).map(normalize)];
    let best: number | null = null;
    for (const f of forms) {
      const s = score(q, f);
      if (s != null && (best == null || s < best)) best = s;
    }
    if (best != null) scored.push({ a, s: best, i });
  });
  return scored.sort((x, y) => x.s - y.s || x.i - y.i).slice(0, max).map((x) => x.a);
}
