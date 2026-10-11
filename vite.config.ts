import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/* One version string for the build stamp and the SW cache name:
   <package version>+<content hash of src, sw, public, index.html>. */
const root = new URL('.', import.meta.url).pathname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p]; });
}
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const h = createHash('sha256');
for (const f of [...files(join(root, 'src')), ...files(join(root, 'sw')), ...files(join(root, 'public')), join(root, 'index.html')].sort()) h.update(f.replace(root, '')).update(readFileSync(f));
const BUILD_HASH = h.digest('hex').slice(0, 8);
const APP_VERSION = `${pkg.version}+${BUILD_HASH}`;
const HIDE_STAMP = process.env.RIDENITE_HIDE_BUILD_STAMP === '1';
const BUILD_TIME_ET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date()) + ' ET';

/** Emits dist/sw.js with a version derived from the hashed bundle names. */
function serviceWorker(): Plugin {
  return {
    name: 'ridenite-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      void bundle;
      const version = APP_VERSION;
      const src = readFileSync(new URL('./sw/sw.template.js', import.meta.url), 'utf8').replace('__BUILD_VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  base: '/',
  // RIDENITE_HIDE_BUILD_STAMP=1 (set by the /pitch/demo/ export): no build stamp and no build time in the bundle.
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION), __BUILD_TIME_ET__: JSON.stringify(HIDE_STAMP ? '' : BUILD_TIME_ET), __SHOW_BUILD_STAMP__: JSON.stringify(!HIDE_STAMP) },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: { output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } },
  },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
} as any);
