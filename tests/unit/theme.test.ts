import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = (p: string) => resolve(__dirname, '../..', p);
const design = (p: string) => resolve(__dirname, '../../../design', p);
const read = (p: string) => readFileSync(p, 'utf8');

describe('theme pass (design rev 04.1)', () => {
  const manifest = JSON.parse(read(app('public/manifest.webmanifest')));
  const html = read(app('index.html'));
  const tokens = read(app('src/theme/tokens.css'));

  it('manifest and index.html use #0B0F14, standalone, design icon set at stable paths', () => {
    expect(manifest.background_color).toBe('#0B0F14');
    expect(manifest.theme_color).toBe('#0B0F14');
    expect(manifest.display).toBe('standalone');
    expect(html).toContain('<meta name="theme-color" content="#0B0F14" />');
    expect(html).toContain('href="/icons/apple-touch-icon.png"');
    const want = [['/icons/icon-192.png', 'any'], ['/icons/icon-512.png', 'any'], ['/icons/icon-maskable-192.png', 'maskable'], ['/icons/icon-maskable-512.png', 'maskable']];
    for (const [src, purpose] of want) expect(manifest.icons).toContainEqual(expect.objectContaining({ src, purpose }));
  });

  it.runIf(existsSync(design('icon')))('icon files are byte-identical to design/icon (logo option A)', () => {
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png'])
      expect(readFileSync(app(`public/icons/${f}`)).equals(readFileSync(design(`icon/${f}`)))).toBe(true);
  });

  it('tokens: Vera palette merged, Riley names kept, no venue font', () => {
    expect(tokens).toMatch(/--bg: #0B0F14/);
    expect(tokens).toMatch(/--text: #FFF3E0/);
    expect(tokens).toMatch(/--primary: #FFC83D/);
    expect(tokens).toMatch(/--slide-thumb: 76px/);
    expect(tokens).toMatch(/--slide-thumb-rest: #FFD45E/);
    for (const name of ['--bg-elevated', '--surface', '--surface-2', '--text-2', '--text-3', '--on-primary', '--venue', '--success', '--info', '--warning', '--danger', '--s1', '--r-card', '--tap-guest'])
      expect(tokens).toContain(`${name}:`);
    expect(tokens).not.toMatch(/--font-venue\s*:/);
    const all = tokens + read(app('src/theme/app.css')) + read(app('src/theme/bar.css')) + html;
    expect(all).not.toMatch(/Libre Baskerville|var\(--font-venue\)/);
  });
});
