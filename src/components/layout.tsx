import type { ReactNode } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { Icon } from './Icon';

export function Screen({ id, children, tight }: { id: string; children: ReactNode; tight?: boolean }) {
  return (
    <main className={`page${tight ? ' page--tight' : ''}`} data-screen={id} id="main">
      {children}
    </main>
  );
}

export function VenueChip() {
  return (
    <span className="venue-chip">
      <img src="/venue/maison-cheryl-window.png" alt="" width="38" height="32" />
      <span className="venue-name">{venue.name}</span>
    </span>
  );
}

export function BackButton({ to, label = 'Back' }: { to: string; label?: string }) {
  return (
    <button type="button" className="back-btn" onClick={() => navigate(to)}>
      <Icon name="back" />
      {label}
    </button>
  );
}

export function Top({ back, ctx, left }: { back?: string; ctx?: ReactNode; left?: ReactNode }) {
  return (
    <div className="topbar">
      {left ?? (back ? <BackButton to={back} /> : <VenueChip />)}
      {ctx && <span className="topbar__ctx">{ctx}</span>}
    </div>
  );
}
