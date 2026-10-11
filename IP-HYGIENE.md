# IP hygiene report (RideNite v1, local build)

Date: Sat Oct 10, 2026, about 11:10 PM ET. Scope: git-tracked app source (`src/`, `public/`, `index.html`, `scripts/`, `tests/`, config) and the build output `dist/`. `node_modules/` is covered by the license list only. Report only: nothing was changed to produce it.

## 1. Fonts

- Font files (`.ttf .otf .woff .woff2 .eot .ttc .dfont`): **none** in tracked files, `public/` or `dist/`.
- `@font-face` rules, Google Fonts, Typekit or other web font URLs: **none** in `src/`, `index.html`, `public/` or `dist/`.
- "SF Pro Text" and "SF Mono" appear **only as names in CSS font stacks** (`src/theme/tokens.css` lines 8 and 9, and the same tokens in `dist/assets/index-*.css`). They select the system font on Apple devices. No Apple font file is shipped, and other platforms fall back to system-ui, Segoe UI, Roboto, Helvetica Neue or Arial.
- No Libre Baskerville. `--font-venue` was removed in the theme pass.

## 2. Ride-hail brands (Uber, Lyft)

- Case-insensitive search for `uber` (whole word) and `lyft` across all files except `node_modules/` and `.git/`: **0 matches** (source, tests, scripts, README, public, dist).
- No file names contain those brands.
- Image assets shipped in `public/` and `dist/`: RideNite icons and favicons (from `design/icon/`), splash images (from `design/splash/`), and Maison Cheryl logos (`maison-cheryl-window.png`, `mc-horizontal-light.png`, `mc-horizontal-teal.png`). None show a ride-hail brand.
- UI icons are hand-written SVG paths in `src/components/Icon.tsx`, not an icon library or SF Symbols.
- Also checked: Waymo, Curb, Via (as the rideshare company), Gett: 0 matches. The sample car service is the fictional "Northside Car Service".

## 3. Production dependency licenses (`npm ls --omit=dev --all`)

| Package | Version | License |
|---|---|---|
| js-tokens | 4.0.0 | MIT |
| loose-envify | 1.4.0 | MIT |
| qrcode-generator | 1.5.2 | MIT |
| react | 18.3.1 | MIT |
| react-dom | 18.3.1 | MIT |
| scheduler | 0.23.2 | MIT |

**Flagged (GPL, AGPL, LGPL, unknown): none.** All 6 production packages are MIT. Dev-only tools (Vite, Vitest, Playwright, axe-core, TypeScript) are not shipped in `dist/`.

## 4. Notes for the product lead (not changed)

- Maison Cheryl logos: the design README says Maison Cheryl "appears with permission", but the app's footer says it is "an illustrative example, not a live RideNite partner." Someone should confirm the permission and pick one wording.
- `public/venue/maison-cheryl-window.png` is no longer referenced in source since the theme pass (the header now uses the horizontal logo). It still ships in `dist/`. It can be removed whenever convenient.
- "Tab closed. Ride booked." is not used in the app. Design README item 1 (attorney trademark search) applies to marketing and decals only.
