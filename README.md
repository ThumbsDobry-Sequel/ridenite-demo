# RideNite v1 (M0 + M1)

iPhone web app (PWA), Vite + TypeScript + React. SIMULATED DEMO: fictional sample data only, no real cars, charges, texts or POS.

## Run

```
npm install
npx playwright install --with-deps webkit   # once
npm run dev          # http://localhost:5173
npm run lint:copy    # copy rules (UI spec section 1 + em/en dashes); exits non-zero on a hit
npm run build        # type check + production build into dist/
npm test             # vitest unit tests, then Playwright WebKit (390x844, 375x667, 430x932)
npm run shots        # screenshots into ../shots/m1 (needs a build first)
```

CI: `.github/workflows/ci.yml` runs lint:copy, then build, then test. A failing lint stops everything after it.

## Where things live

- `src/venue.config.ts`: every venue value (Maison Cheryl: name, address, menu, 11% tax, $21.00 quote, driver, guest). Swap venues here only.
- `src/store/types.ts`: the `DemoStore` interface. App code depends only on it. `InMemoryStore` is the v1 implementation; a backend store can replace it later.
- `src/lib/fare.ts`: cap = lesser of 20% of quote or $5.00; reconciliation; P9 totals (tip on drinks and food only).
- `src/lib/rideState.ts`: ride stage derived from `bookedAt` (compressed demo timeline). `src/lib/handoff.ts`: base64url link with tab, entry point, quote and bookedAt so a second phone shows the same status (`#/h?d=...`).
- `src/theme/tokens.css`: every color, font, size, radius, spacing, shadow and motion value (night and day). Section A imports Riley's `../ui/tokens.css`; components use tokens only, so a brand package lands as a theme pass. Amber (`--primary`) is reserved for the one primary action per screen.
- `src/components/primitives.tsx`: Button, Sheet, Card, ListRow, Chip, Banner.

## Demo behavior

- Every page load is a fresh demo. State lives in memory; on load the app clears any `ridenite*` keys in localStorage and sessionStorage, then seeds. Reload or "Reset demo data" (menu, or long press on SIMULATED DEMO) are the same thing. See PITCH-NOTES.md.
- The tab link comes from the URL on every load: `/#/v?tab=4468&seat=Table%207` (or `?tab=` in the query). With no params the demo is linked to the seeded Maison Cheryl tab; the Demo controls can unlink (memory only).
- Opening a trip screen directly with no ride sends you home (a reload mid-ride resets). Add `?preview=1` to view a trip screen with sample data, e.g. `/#/g/p5?preview=1`. Demo controls list every screen this way.
- Menu > Demo controls: E1 to E7 faults (each starts from a fresh ride), fare scenarios, unlink tab, forget saved home, price moves on refresh, second-phone link.
- Menu > Owner preview: static placeholder screens; every number is tagged Sample data.

## Freshness and the service worker

- Built assets have hashed filenames. `dist/sw.js` is generated at build time; its cache name is `ridenite-<version>`, where version is `<package version>+<content hash>`, the same string shown in the menu build stamp (with build time in ET).
- Network first for navigations and assets; the cache is only used when offline. Old caches are deleted on activate; `skipWaiting` + `clients.claim`, so a new deploy shows on the next refresh.
- `index.html` carries `http-equiv` no-cache meta tags. DigitalOcean App Platform static sites may not allow custom response headers, so freshness relies on the network-first service worker plus hashed assets rather than on `Cache-Control` headers.

## Tests

- Unit (`tests/unit`): cap edges, the five POS fare scenarios and E2, tip recompute, store guards (no duplicate rides, no tab, undo, faults never stack, reset), address matching, handoff parsing, URL tab link, copy lint.
- Playwright WebKit (`tests/e2e`): 2-tap launch to booked, Ride home largest and in view at three sizes, confirm quote and cap line visible above the sticky buttons, undo, quote refresh, unlinked home, cold QR first visit, reload resets, belongings, faults, P9 totals, second phone, owner labels, every route (banner, rendered-copy lint, 56px tap targets, axe serious/critical = 0), service worker version pickup.
