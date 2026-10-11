import { describe, expect, it } from 'vitest';
import { suggest, normalize } from '../../src/lib/address';
import { encodeHandoff, parseHandoff } from '../../src/lib/handoff';
import { readUrlLink } from '../../src/lib/urlLink';
import { venue } from '../../src/venue.config';
// @ts-expect-error plain JS module
import { APPROVED, MONEY_FILES, lintMoneyText, lintStatementText, lintText } from '../../scripts/copy-lint.mjs';

describe('forgiving address match (UI 9b)', () => {
  it('suggests from the first keystroke', () => {
    expect(suggest('6', venue.addresses).length).toBeGreaterThan(0);
    expect(suggest('w', venue.addresses).length).toBeGreaterThan(0);
  });
  it('tolerates typos and abbreviations', () => {
    expect(suggest('655 n harison st', venue.addresses)[0].line).toBe('655 N Harrison St');
    expect(suggest('655 harrisn', venue.addresses).map((a) => a.line)).toContain('655 N Harrison St');
    expect(suggest('3100 clarendn blvd', venue.addresses)[0].line).toBe('3100 Clarendon Blvd');
  });
  it('spoken numbers and landmarks', () => {
    expect(normalize('six fifty five')).toEqual(['655']);
    expect(suggest('capital one arena', venue.addresses)[0].line).toBe('Capital One Arena');
  });
  it('max 3 suggestions, none for gibberish', () => {
    expect(suggest('655', venue.addresses).length).toBeLessThanOrEqual(3);
    expect(suggest('zzzzqqq', venue.addresses)).toHaveLength(0);
  });
});

describe('handoff link', () => {
  const base = { v: 1 as const, venue: venue.slug, tab: '4468', seat: 'Table 7', guest: 'Maya R.', ep: 'guest_request' as const, q: 2100 };
  it('round trips tab, entry point, quote and bookedAt', () => {
    const r = parseHandoff(encodeHandoff({ ...base, at: 1760000000000, dest: '655 N Harrison St' }), venue.slug);
    expect(r).toEqual({ ok: true, handoff: { ...base, at: 1760000000000, dest: '655 N Harrison St' } });
  });
  it('rejects bad input', () => {
    expect(parseHandoff(null).ok).toBe(false);
    expect(parseHandoff('not-base64!!').ok).toBe(false);
    expect(parseHandoff(encodeHandoff({ ...base, ep: 'auto' as any })).ok).toBe(false);
    expect(parseHandoff(encodeHandoff({ ...base, q: -5 })).ok).toBe(false);
    expect(parseHandoff(encodeHandoff({ ...base, venue: 'other' }), venue.slug).ok).toBe(false);
  });
});

describe('URL tab link', () => {
  it('reads ?tab= from query or hash', () => {
    expect(readUrlLink({ search: '?tab=4468&seat=Table%207', hash: '' }, 'X')).toEqual({ tab: '4468', seat: 'Table 7' });
    expect(readUrlLink({ search: '', hash: '#/v?tab=12&seat=Bar%203' }, 'X')).toEqual({ tab: '12', seat: 'Bar 3' });
    expect(readUrlLink({ search: '', hash: '#/g/home' }, 'X')).toBeNull();
    expect(readUrlLink({ search: '?tab=<script>', hash: '' }, 'X')).toBeNull();
  });
});

describe('copy lint', () => {
  it('flags em and en dashes and banned words', () => {
    expect(lintText('Ride home \u2014 fast')).toHaveLength(1);
    expect(lintText('9\u201310 PM')).toHaveLength(1);
    expect(lintText('Certified drivers')).toHaveLength(1);
    expect(lintText('Get home safe tonight').length).toBeGreaterThan(0);
    expect(lintText('You made it home safe.').length).toBeGreaterThan(0);
    expect(lintText('We will Leave The Light On for you').length).toBeGreaterThan(0);
    expect(lintText('Get LIT tonight').length).toBeGreaterThan(0);
    expect(lintText('We get Every Guest Home').length).toBeGreaterThan(0);
    expect(lintText('lit.').length).toBeGreaterThan(0);
    expect(lintText('A little split, literally, splitting').length).toBe(0);
    expect(lintText('We guarantee a car').length).toBeGreaterThan(0);
    // Harper legal items (money-promises memo), whole word or phrase
    for (const t of ['Rides are Guaranteed', 'Every ride is insured', 'Add a Protection Plan', 'Zero risk for the bar', 'A guarantee.']) expect(lintText(t).length, t).toBeGreaterThan(0);
    for (const t of ['uninsuredish', 'zero risky']) expect(lintText(t).filter((p) => /insured|zero risk/i.test(p.match)).length, t).toBe(0);
    expect(lintText('No liability for the bar')).toHaveLength(1);
    // "included" only with the amount right after it (Harper 23:11)
    expect(lintText('Tab closed. Ride home included: $27.40.')).toEqual([]);
    for (const t of ['Ride home included.', 'Ride home included', 'A ride is included with your tab', 'included $5']) expect(lintText(t).length, t).toBeGreaterThan(0);
    // bar screens and statements: insurance and guaranty words, whole words only
    for (const t of ['Dispute coverage', 'File a claim', 'Claims', 'Your loss', 'We indemnify you', 'No deductible', 'Premium tier', 'Dispute plan', 'Return policy', 'We guarantee it', 'We reimburse the fare', 'Reimbursement'])
      expect(lintStatementText(t).length, t).toBeGreaterThan(0);
    for (const t of ['planned', 'explained', 'reclaimed', 'glossy', 'airplane', 'Ride Payout returned (RideNite fee), ride 4821, Oct 9, dispute lost: -$1.00'])
      expect(lintStatementText(t), t).toEqual([]);
    expect(lintStatementText("follow venue policy")).toHaveLength(1);
    expect(lintStatementText("follow the venue's procedure.")).toEqual([]);
    // bar vs RideNite split (SCOPE 23:01): no claims that ride disputes stay off the bar
    for (const t of ['Ride disputes Never Hit The Bar.', 'Chargebacks never reach the bar', "Disputes stay off the bar's account", 'Kept off the bar\u2019s account', 'You cannot dispute this', "You can't dispute it later", 'You can\u2019t dispute', 'No disputes after Friday']) expect(lintText(t).length, t).toBeGreaterThan(0);
  });
  it('has no approved exceptions: any safe or unsafe in user copy fails (Quinn, Oct 11)', () => {
    expect(lintText('If you feel unsafe or just need to get home, you can put your ride home on your bar tab. No app, no phone, no separate payment.')).toHaveLength(1);
    expect(lintText('If you feel unsafe or just need to get home, you can put your ride home on your bar {T.bill}. No app, no phone, no separate payment.')).toHaveLength(1);
    expect(lintText('Guest says they feel unsafe?')).toHaveLength(1);
    expect(lintText('Feeling unsafe?')).toHaveLength(1);
    expect(lintText('Get there safe.')).toHaveLength(1);
    expect(lintText('SAFE')).toHaveLength(1);
    expect(APPROVED).toEqual([]);
    // technical CSS token is not copy
    expect(lintText('padding: env(safe-area-inset-bottom)')).toEqual([]);
    // the neutral replacement passes
    expect(lintText('Need to get home? Ask staff for a car. It goes on your bar tab. No app, no phone, no separate payment.')).toEqual([]);
    expect(lintText('Venue procedure')).toEqual([]);
  });
  it('rejects drink names in user copy (Quinn/Nico, Oct 11)', () => {
    for (const t of ['Old Fashioned x3', 'House Beer', 'The Pear Necessities', 'Two beers', 'Glass of wine', 'Cocktail menu', 'Martini'])
      expect(lintText(t).length, t).toBeGreaterThan(0);
    for (const t of ['Table snacks', 'Dinner for two', 'Madeleines', 'Wilson Blvd']) expect(lintText(t), t).toEqual([]);
  });
  it('fare, statement and receipt copy: no pays/covers/absorbs/settles/reimburses/protection/guarantee/insured (over-cap memo, Oct 11)', () => {
    for (const t of ['Absorbed by RideNite', 'RideNite covers the rest', 'Covered by RideNite', 'RideNite pays the driver', 'RideNite settles the rest with the car service', 'We reimburse the fare', 'Reimbursement', 'Fare protection', 'Guaranteed fare', 'Every ride is insured'])
      expect(lintMoneyText(t).length, t).toBeGreaterThan(0);
    for (const t of ["Ride home: $25.20. That's the most you approved, so the final fare can't add more.", 'Quote adjustment credit, ride RN-ABC123, Oct 9: -$3.10', 'If you say no, it is not charged.', 'You pay $11.00 on your tab.', 'recovery', 'discover'])
      expect(lintMoneyText(t), t).toEqual([]);
    for (const f of ['src/lib/fare.ts', 'src/lib/payouts.ts', 'src/screens/morning.tsx', 'src/screens/owner.tsx', 'src/screens/bar/tab.tsx']) expect(MONEY_FILES.some((re: RegExp) => re.test(f)), f).toBe(true);
    // safe/unsafe still fails everywhere
    expect(lintText('Ride home safe').length).toBeGreaterThan(0);
  });
  it('passes the belongings copy', () => {
    expect(lintText("Card, keys, phone, jacket, bag. Check with staff if they're holding your card.")).toHaveLength(0);
  });
});
