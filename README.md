# RideNite v1 (M0 + M1 + M2)

iPhone web app (PWA), Vite + TypeScript + React. SIMULATED DEMO: fictional sample data only, no real cars, charges, texts or POS.

## Run

```
npm install
npx playwright install --with-deps webkit   # once
npm run dev          # http://localhost:5173
npm run lint:copy    # copy rules (UI spec section 1 + em/en dashes); exits non-zero on a hit
npm run build        # type check + production build into dist/
npm test             # vitest unit tests, then Playwright WebKit (390x844, 375x667, 430x932, iPad 1024x768 for @bar)
npm run shots        # screenshots into ../shots/m1 (needs a build first)
node scripts/shots-m2.mjs ../shots/m2              # bartender screens at 390x844
W=375 H=667 node scripts/shots-m2.mjs ../shots/m2 -se
```

CI: `.github/workflows/ci.yml` runs lint:copy, then build, then test. A failing lint stops everything after it.

## Where things live

- `src/venue.config.ts`: every venue value (Maison Cheryl: name, address, menu, 11% tax, $21.00 quote, driver, guest), plus the venue words and date settings: `terms` (bill noun "tab", staff role "bartender"; screens read them as `T.bill`, `T.staff`), `nightHeading`, `nightCutoffHour` (6), `holdHours` (24). Swap venues here only. `tests/e2e/copy-snapshot.spec.ts` compares the rendered text of 48 screens against `tests/golden/copy-snapshot.json` at a fixed clock (Sat Oct 10, 10:30 PM ET); regenerate with `UPDATE_COPY=1` only for intended copy changes.
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

## Bartender view (M2)

- Routes: `/#/b` (B0 welcome, then B1 Tonight), `/#/b/new` (B2 who asked), `/#/b/book?tab=` (B3 book: link, QR or staff-saw-price modes; Book needs a quote AND "Guest saw the price"), `/#/b/booked`, `/#/b/live` (B4), `/#/b/history` (B5), `/#/b/tab?tab=` (B6), `/#/b/plate?tab=` (B9), `/#/b/help` (B10), `/#/b/more`, `/#/b/settings` (B8 with Reset). Menu > "Switch to bartender view" / "Switch to guest view". At 768 px and wider, sheets open as a right drawer over Tonight.
- No free text on bar screens. New guests come from the sample list in `venue.config.ts`.
- B6: ride lines post only at pickup; adjustment is its own line; tip base excludes the ride.

## Ride status and charge timing (SCOPE 21:39, 22:22, 22:28, 22:29)

- Guest slide starts a 10 s undo ("Requesting your ride..." / "Nothing is requested yet." / "We request your ride when the timer ends.", then "Requesting in a moment." near the end). No driver can accept during it. The guest confirmation is logged when the undo ends, stamped with the slide time.
- Then "Ride requested. Finding a driver." with "$21.00 goes on your tab when you're picked up. Final fare may differ by up to $4.20." (live values). On accept: "Ride booked." / "Fare goes on your tab at pickup."
- The fare line and "Confirmed by guest, h:mm PM" post at PICKUP, not accept. No driver: "Requested by guest, h:mm PM. No driver found. Not charged." Driver accepts then cancels: "Requested by guest, h:mm PM. Driver cancelled. Not charged." Demo controls: force no driver, driver accepts then cancels, force stale quote.
- Quotes are valid 5 minutes (`QUOTE_VALID_MS`). Keep looking after that shows the new price and needs a new slide; never a silent rebook.
- Slider (design rev 04.1): 88 px track, 76 px thumb resting 24 px in (6 px vertical inset); resting thumb `#FFD45E`, lit fill `#FFC83D` to the thumb edge, then a 10 px fade to `--surface-2`.
- Confirm shows "You pay the final fare, never more than $X unless you approve a change." (X = live quote + cap).
- Receipt / night summary: "[Night date]. Tab closed. Ride home on your tab." right before the itemized ride line, only after pickup.
- Morning receipt (P9, M1) itemized ride line, after pickup only: "RideNite car home, [pickup area] area to [drop-off area] area, picked up h:mm PM, $XX.XX". Areas, never street addresses (pickup = venue neighborhood, drop-off = neighborhood of the ride's destination area). The fare is the final ride total on the tab (quote + adjustment + any approved over-cap amount): $24.60 in the default sample, $27.40 in the over-cap-approved scenario. The marketing tagline is not used in the app.
- Bar: B6 shows the POS line "RideNite car home, [area] area, [pickup time]"; the guest record is shown separately as the RideNite record, never on the POS line. Closing a tab with a ride not yet picked up shows "Ride pending pickup"; it finishes closing at pickup (ride line posts) or closes clean on cancel, inside the 24 h hold.

## Bar vs RideNite split (SCOPE 23:01)

- Every line carries a kind, `'bar'` or `'ride'`: B6 tab lines (`TabLine.kind`, with `type` for item, tax or ride line) and the guest check (`src/lib/checkLines.ts`). Ride lines carry a fictional ride ID (`RN-xxxxxx`; the sample ride is `venue.sampleRideId`), shown on the receipt ride line detail.
- P9 and M1 show two sections with subtotals. Bar sales covers drinks, food, 11% tax and the tip for bar staff. RideNite rides covers the quote, the adjustment within the cap, and any stop the guest approved over the cap. Subtotals are sums of the lines, so they always equal the check (over-cap approved sample: $64.19 + $27.40 = $91.59). Each section has its own question: drinks and food go to the venue; the ride question uses the approved ride copy.
- Owner preview data (`src/lib/ownerData.ts`, no UI yet, waits on Riley's mock): `evidencePack()` returns ride lines only, grouped by ride ID; `monthlyStatement()` splits Bar sales and RideNite rides with exact sums. Both are labeled Sample data, and the model has no payout-return or reimbursement field.
- Payout data (`src/lib/payouts.ts`, owner only, never shown to guests): ride lines carry `returnWindowEnds` = pickup date (ET) + `payoutReturnWindowDays` (90) calendar days. The statement status chip (muted, never amber) reads "Return window open until Jan 8", then "Payout final". Eligibility for a payout return is keyed on the processor's dispute notice date: notice date <= pickup date + 90 days AND evidence filed before the processor deadline (`payoutReturnEligible()`). `sampleOwnerRides(now)` seeds Sample data rides relative to now, some past 90 days and some recent. `disputeNoticeDue()` = notice date + `disputeNoticeBusinessDays` (3) business days, Mon to Fri, no holiday calendar (data only). Copy lint also bans "cannot dispute", "can't dispute" and "no disputes after".
- Sample nights: standard $64.19 + $24.60 = $88.79; approved stop $64.19 + $27.40 = $91.59.
- Copy lint also bans "never hit the bar", "never reach the bar" and "off the bar's account".

## Theme (design rev 04.1)

- `src/theme/tokens.css`: Vera's night palette (`design/moodboard/palette-tokens-draft.css`) merged into Riley's token names; nothing renamed, NEW tokens added, `--font-venue` removed. No web fonts (no Libre Baskerville).
- Venue header is the venue PNG logo (`venue.logo` in `venue.config.ts`; light recolor on night, teal on day), with the venue name as its accessible label.
- Icons copied from `design/icon/` at the same public paths; manifest lists any + maskable at 192 and 512. Theme and background color `#0B0F14`; iOS startup images from `design/splash/` (mark only, no text).

## Dates (device clock, America/New_York)

- Night date = today, except 00:00 to 05:59 counts as the previous date (`src/lib/night.ts`).
- Morning heading: "Night of Sat, Oct 10", the night date of the tab-open time, so it reads true the same night and the next morning.
- Seeding is relative to now: the tab opens now minus 4 h (to the minute); sample times sit between open and now; a live booking happens at now.
- Charge time (`src/lib/hold.ts`): next 11:00 AM ET if it is in the future and less than 24 h after open, else the latest whole hour at least 1 h before open + 24 h. Shown as "charged Sun, Oct 11 at 11:00 AM"; never "today" or "tomorrow".

## Freshness and the service worker

- Built assets have hashed filenames. `dist/sw.js` is generated at build time; its cache name is `ridenite-<version>`, where version is `<package version>+<content hash>`, the same string shown in the menu build stamp (with build time in ET).
- Network first for navigations and assets; the cache is only used when offline. Old caches are deleted on activate; `skipWaiting` + `clients.claim`, so a new deploy shows on the next refresh.
- `index.html` carries `http-equiv` no-cache meta tags. DigitalOcean App Platform static sites may not allow custom response headers, so freshness relies on the network-first service worker plus hashed assets rather than on `Cache-Control` headers.

## Tests

- Unit (`tests/unit`): cap edges, the five POS fare scenarios and E2, tip recompute, store guards (no duplicate rides, no tab, undo, faults never stack, reset), address matching, handoff parsing, URL tab link, copy lint.
- Playwright WebKit (`tests/e2e`): 2-tap launch to booked, Ride home largest and in view at three sizes, confirm quote and cap line visible above the sticky buttons, undo, quote refresh, unlinked home, cold QR first visit, reload resets, belongings, faults, P9 totals, second phone, owner labels, every route (banner, rendered-copy lint, 56px tap targets, axe serious/critical = 0), service worker version pickup.
