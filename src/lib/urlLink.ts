/**
 * Tab link from the QR URL, read on every load (never from storage).
 * Accepts ?tab=4468&seat=Table%207 in the query string or in the hash (#/v?tab=...).
 */
export interface UrlLink { tab: string; seat: string }

export function readUrlLink(loc: { search: string; hash: string }, defaultSeat: string): UrlLink | null {
  const fromHash = loc.hash.includes('?') ? loc.hash.slice(loc.hash.indexOf('?') + 1) : '';
  for (const q of [new URLSearchParams(loc.search), new URLSearchParams(fromHash)]) {
    const tab = q.get('tab');
    if (tab && /^[\w-]{1,12}$/.test(tab)) {
      const seat = (q.get('seat') ?? defaultSeat).replace(/[^\w #.-]/g, '').slice(0, 24) || defaultSeat;
      return { tab, seat };
    }
  }
  return null;
}

/** Remove storage the app owns so every load starts a fresh demo. */
export function clearOwnedStorage(prefix = 'ridenite'): void {
  for (const st of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      if (!st) continue;
      const keys: string[] = [];
      for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith(prefix)) keys.push(k); }
      keys.forEach((k) => st.removeItem(k));
    } catch { /* storage blocked: nothing to clear */ }
  }
  try {
    const idb = globalThis.indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
    idb?.databases?.().then((dbs) => dbs.forEach((d) => d.name?.startsWith(prefix) && idb.deleteDatabase(d.name))).catch(() => {});
  } catch { /* no IndexedDB */ }
}
