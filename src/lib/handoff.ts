/**
 * Handoff link: carries tab, entry point, quote and (optionally) the booking time,
 * so a second phone opening the link shows the same ride state with no backend.
 * Format: #/h?d=<base64url(JSON)>
 */
export type EntryPoint = 'guest_request' | 'staff_offer';

export interface Handoff {
  v: 1;
  venue: string;
  tab: string;
  seat: string;
  guest: string;
  ep: EntryPoint;
  /** Quote in cents. */
  q: number;
  /** Booking timestamp (ms). Present once a ride is booked. */
  at?: number;
  /** Drop-off line, present once chosen. */
  dest?: string;
}

const b64urlEncode = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (s: string): string => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function encodeHandoff(h: Handoff): string {
  return b64urlEncode(JSON.stringify(h));
}

export function handoffUrl(h: Handoff, origin = ''): string {
  return `${origin}/#/h?d=${encodeHandoff(h)}`;
}

export type ParseResult = { ok: true; handoff: Handoff } | { ok: false; error: string };

export function parseHandoff(param: string | null | undefined, expectedVenue?: string): ParseResult {
  if (!param) return { ok: false, error: 'missing' };
  let obj: unknown;
  try { obj = JSON.parse(b64urlDecode(param)); } catch { return { ok: false, error: 'unreadable' }; }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'unreadable' };
  const o = obj as Record<string, unknown>;
  if (o.v !== 1) return { ok: false, error: 'version' };
  if (typeof o.venue !== 'string' || (expectedVenue && o.venue !== expectedVenue)) return { ok: false, error: 'venue' };
  if (typeof o.tab !== 'string' || !/^[\w-]{1,12}$/.test(o.tab)) return { ok: false, error: 'tab' };
  if (o.ep !== 'guest_request' && o.ep !== 'staff_offer') return { ok: false, error: 'entry_point' };
  if (typeof o.q !== 'number' || !Number.isInteger(o.q) || o.q <= 0 || o.q > 100000) return { ok: false, error: 'quote' };
  if (o.at !== undefined && (typeof o.at !== 'number' || !Number.isFinite(o.at) || o.at <= 0)) return { ok: false, error: 'booked_at' };
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    ok: true,
    handoff: {
      v: 1, venue: o.venue, tab: o.tab, ep: o.ep, q: o.q,
      seat: str(o.seat, 24), guest: str(o.guest, 24),
      ...(o.at !== undefined ? { at: o.at as number } : {}),
      ...(typeof o.dest === 'string' ? { dest: str(o.dest, 80) } : {}),
    },
  };
}
