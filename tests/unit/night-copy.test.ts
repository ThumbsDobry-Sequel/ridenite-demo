import { describe, expect, it } from 'vitest';
import { nightPossessive, nightRelative, receiptTitle } from '../../src/lib/night';
import { nightTagline } from '../../src/lib/brand';
import { tripEtaMinutes } from '../../src/screens/trip';

const ET = (iso: string) => Date.parse(iso);
const tabOpen = ET('2026-10-10T23:31:00Z'); // Sat Oct 10, 7:31 PM ET

describe('night date in copy (Quinn/Nico, Oct 11)', () => {
  it('same night: "Tonight\'s receipt", never "Last night\'s" (Sat 11:30 PM and Sun 12:40 AM ET)', () => {
    for (const now of [ET('2026-10-11T03:30:00Z'), ET('2026-10-11T04:40:00Z')]) {
      expect(nightRelative(tabOpen, now)).toBe('tonight');
      expect(receiptTitle(tabOpen, now)).toBe("Tonight's receipt");
      expect(nightPossessive(tabOpen, now)).toBe("tonight's");
    }
  });
  it('next morning: "Last night\'s receipt"; later: dated', () => {
    expect(receiptTitle(tabOpen, ET('2026-10-11T13:00:00Z'))).toBe("Last night's receipt");
    expect(receiptTitle(tabOpen, ET('2026-10-13T13:00:00Z'))).toBe('Receipt, Sat Oct 10');
  });
  it('tagline names Saturday when viewed Sunday morning (pass the tab-open time)', () => {
    expect(nightTagline(true, true, 2460, tabOpen)).toBe('Saturday night. Tab closed. Ride home added: $24.60.');
    expect(nightTagline(true, false, 2460, tabOpen)).toBe('Saturday night. Ride home is on your tab.');
  });
});

describe('P6 ETA from the simulated ride', () => {
  it('rounds up to whole minutes, at least 1', () => {
    const drop = ET('2026-10-11T03:43:00Z');
    expect(tripEtaMinutes(drop, drop - 11 * 60_000)).toBe(11);
    expect(tripEtaMinutes(drop, drop - 30_000)).toBe(1);
    expect(tripEtaMinutes(drop, drop + 5_000)).toBe(1);
  });
});
