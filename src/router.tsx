import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

/** Hash router: works on any static host (no server rewrites needed). URLs look like /#/g/p3 */
export interface Route { path: string; query: URLSearchParams }

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = h.split('?');
  const path = (p.startsWith('/') ? p : `/${p}`).replace(/\/+$/, '') || '/';
  return { path: path.toLowerCase(), query: new URLSearchParams(q) };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = `#${to}`;
  if (opts.replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== url) {
    location.hash = to;
  }
}

export function back(fallback: string) {
  if (history.length > 1 && document.referrer !== '' ) history.back();
  else navigate(fallback);
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setR((prev) => { const n = parseHash(location.hash); return n.path === prev.path && n.query.toString() === prev.query.toString() ? prev : n; });
    window.addEventListener('hashchange', on);
    on(); // child effects run before this one; catch a navigate() they made on mount
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...rest}>{children}</a>;
}
