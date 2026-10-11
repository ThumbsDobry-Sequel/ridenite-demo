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

/** Venue logo PNG (night and day recolors; CSS shows the one for the current theme). The name is the alt text. */
export function VenueLogo() {
  const { night, day, width, height } = venue.logo;
  return (
    <span className="venue-logo" role="img" aria-label={venue.name}>
      <img className="venue-logo__night" src={night} alt="" width={width} height={height} />
      <img className="venue-logo__day" src={day} alt="" width={width} height={height} />
    </span>
  );
}

export function VenueChip() {
  return (
    <span className="venue-chip">
      <VenueLogo />
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
