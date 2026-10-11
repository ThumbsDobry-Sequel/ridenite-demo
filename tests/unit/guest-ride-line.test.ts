import { describe, it, expect } from 'vitest';
import { RIDE_GUEST_LINE, RIDE_POS_LINE, tabTotals } from '../../src/lib/tab';
import { readFileSync } from 'node:fs';

describe('guest vs POS ride line (Oct 11 regression)', () => {
  it('guest constant is exactly "RideNite car home"; POS constant keeps "quoted fare"', () => {
    expect(RIDE_GUEST_LINE).toBe('RideNite car home');
    expect(RIDE_GUEST_LINE).not.toMatch(/quoted/i);
    expect(RIDE_POS_LINE).toBe('RideNite car home, quoted fare');
  });
  it('guest receipt source never renders the POS line or the quote amount in the ride row', () => {
    const src = readFileSync(new URL('../../src/screens/morning.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/RIDE_POS_LINE|RIDE_QUOTE_LINE|quoted fare/);
    expect(src).not.toMatch(/data-testid="ride-line"[^\n]*fmt\((m|t)\.quoteCents\)/);
  });
  it('sample night math: ride lines (quote $21.00 + adjustment $3.60) total the final fare $24.60', () => {
    const t = tabTotals({ items: [], taxRate: 0, ride: { quoteCents: 2100, finalCents: 2460 } } as never);
    const ride = t.lines.filter((l) => l.kind === 'ride').reduce((a, l) => a + l.cents, 0);
    expect(ride).toBe(2460);
  });
});

describe('copy-lint guest guard: lintGuestText', () => {
  it('flags "quoted fare" and the POS constant in guest files, passes the guest wording', async () => {
    const { lintGuestText, GUEST_FILES } = await import('../../scripts/copy-lint.mjs');
    expect(lintGuestText('RideNite car home, quoted fare', 'src/screens/morning.tsx')).toHaveLength(1);
    expect(lintGuestText('{RIDE_POS_LINE}', 'src/screens/morning.tsx')).toHaveLength(1);
    expect(lintGuestText('RideNite car home $24.60', 'src/screens/morning.tsx')).toHaveLength(0);
    expect(GUEST_FILES.some((re: RegExp) => re.test('src/screens/morning.tsx'))).toBe(true);
    expect(GUEST_FILES.some((re: RegExp) => re.test('src/screens/bar/tab.tsx'))).toBe(false);
  });
});
