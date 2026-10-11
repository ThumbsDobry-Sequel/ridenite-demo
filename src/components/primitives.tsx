import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { Icon, type IconName } from './Icon';

/* Shared primitives. Restyle these (and tokens.css) to restyle every screen. */

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'bad';

export function Button(props: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: 'md' | 'xl' | 'hero';
  sub?: ReactNode;
  icon?: IconName;
  onClick?: (e: MouseEvent) => void;
  href?: string;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const last = useRef(0);
  const cls = `btn btn--${props.variant ?? 'primary'}${props.size === 'xl' ? ' btn--xl' : props.size === 'hero' ? ' btn--hero' : ''}${props.className ? ` ${props.className}` : ''}`;
  const content = (
    <>
      {props.icon && <Icon name={props.icon} />}
      <span>{props.children}</span>
      {props.sub && <span className="btn__sub">{props.sub}</span>}
    </>
  );
  if (props.href) {
    return <a className={cls} href={props.href} data-testid={props.testId} aria-label={props.ariaLabel} onClick={props.onClick}>{content}</a>;
  }
  return (
    <button
      type={props.type ?? 'button'}
      className={cls}
      data-testid={props.testId}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={(e) => {
        // double-tap guard (UI 3 Button: 300 ms)
        const now = Date.now();
        if (now - last.current < 300) return;
        last.current = now;
        props.onClick?.(e);
      }}
    >
      {content}
    </button>
  );
}

export function TextLink({ children, onClick, href, testId }: { children: ReactNode; onClick?: () => void; href?: string; testId?: string }) {
  if (href) return <a className="textlink" href={href} data-testid={testId}>{children}</a>;
  return <button type="button" className="textlink" onClick={onClick} data-testid={testId}>{children}</button>;
}

export function Card({ children, className = '', testId, as = 'div' }: { children: ReactNode; className?: string; testId?: string; as?: 'div' | 'section' }) {
  const C = as;
  return <C className={`card ${className}`} data-testid={testId}>{children}</C>;
}

/** Tappable choice row (UI 3 ChoiceCard). */
export function ListRow(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  lead?: ReactNode;
  selected?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  testId?: string;
  compact?: boolean;
  static?: boolean;
}) {
  const body = (
    <>
      {props.icon && <Icon name={props.icon} className="icon icon--lead" />}
      {props.lead}
      <span className="listrow__text">
        <b className="listrow__title">{props.title}</b>
        {props.subtitle && <span className="listrow__sub">{props.subtitle}</span>}
      </span>
    </>
  );
  const cls = `listrow${props.selected ? ' is-selected' : ''}${props.compact ? ' listrow--compact' : ''}`;
  if (props.static) return <div className={cls}>{body}</div>;
  return (
    <button type="button" className={cls} onClick={props.onClick} data-testid={props.testId} aria-pressed={props.pressed}>
      {body}
    </button>
  );
}

export type Tone = 'info' | 'success' | 'warning' | 'bad' | 'neutral';

export function Chip({ tone, icon, children, testId }: { tone: Tone; icon?: IconName; children: ReactNode; testId?: string }) {
  return (
    <span className={`chip chip--${tone}`} data-testid={testId}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export function Banner({ tone, icon = 'alert', children, alert }: { tone: 'info' | 'warning' | 'bad'; icon?: IconName; children: ReactNode; alert?: boolean }) {
  return (
    <div className={`banner banner--${tone}`} role={alert ? 'alert' : 'status'}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

/** Bottom sheet with focus trap; Esc and Close call onClose (UI 3 Sheet, P8). */
export function Sheet({ title, children, onClose, testId, detent = 'medium' }: { title: string; children: ReactNode; onClose: () => void; testId?: string; detent?: 'medium' | 'large' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('button, a[href], input'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sheet-layer">
      <div className="scrim" aria-hidden="true" onClick={onClose} />
      <div className={`sheet${detent === 'large' ? ' sheet--large' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={ref} data-testid={testId}>
        <div className="sheet__grabber" aria-hidden="true" />
        <h2 className="h2" id="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Plate({ plate, spoken }: { plate: string; spoken: string }) {
  return <div className="plate" role="img" aria-label={`Plate ${spoken}`}>{plate}</div>;
}

export function Fict({ children }: { children: ReactNode }) {
  return <p className="fict">{children}</p>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="spinner-wrap" role="img" aria-label={label}>
      <div className="spinner" />
      <span className="spinner__static">Working...</span>
    </div>
  );
}
