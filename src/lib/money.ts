/** Money is integer cents everywhere. */
export const fmt = (cents: number): string => {
  const abs = Math.abs(Math.round(cents));
  const s = `$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
  return cents < 0 ? `-${s}` : s;
};
/** Signed amount for adjustment lines: +$3.60 / -$2.10 */
export const fmtSigned = (cents: number): string => (cents < 0 ? fmt(cents) : `+${fmt(cents)}`);
