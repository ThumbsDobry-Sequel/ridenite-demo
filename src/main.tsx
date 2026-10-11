import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import './theme/app.css';
import './theme/bar.css';
import { App } from './App';
import { StoreProvider } from './store';
import { InMemoryStore } from './store/InMemoryStore';
import { clearOwnedStorage, readUrlLink } from './lib/urlLink';
import { OWNED_KEY_PREFIX } from './store/seed';
import { venue } from './venue.config';
import { installDemoClock, realNow, setDemoSkew } from './lib/demoClock';

// Every load is a fresh demo: clear anything the app owns, then seed in memory.
clearOwnedStorage(OWNED_KEY_PREFIX);
// The tab link comes from the QR URL on every load, never from storage.
installDemoClock();
const store = new InMemoryStore({ clock: realNow, onSkew: setDemoSkew, urlLink: readUrlLink(location, venue.seat) ?? undefined });
(window as any).__ridenite = { store }; // demo and test hook (fictional data only)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {}); });
}
