import { describe, expect, it } from 'vitest';
import { suggest, normalize } from '../../src/lib/address';
import { encodeHandoff, parseHandoff } from '../../src/lib/handoff';
import { readUrlLink } from '../../src/lib/urlLink';
import { venue } from '../../src/venue.config';
// @ts-expect-error plain JS module
import { lintText } from '../../scripts/copy-lint.mjs';

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
    expect(lintText('We guarantee a car')).toHaveLength(1);
    expect(lintText('No liability for the bar')).toHaveLength(1);
  });
  it('allows the two approved unsafe strings only', () => {
    expect(lintText('If you feel unsafe or just need to get home, you can put your ride home on your bar tab. No app, no phone, no separate payment.')).toHaveLength(0);
    expect(lintText('Guest says they feel unsafe?')).toHaveLength(0);
    expect(lintText('Feeling unsafe?')).toHaveLength(1);
  });
  it('passes the belongings copy', () => {
    expect(lintText("Card, keys, phone, jacket, bag. Check with staff if they're holding your card.")).toHaveLength(0);
  });
});
