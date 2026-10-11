import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { Icon } from './Icon';

/** Fraction of travel that completes the slide. */
export const SLIDE_COMPLETE_AT = 0.7;
/** Hold the thumb still this long to confirm without sliding (accessible fallback). */
export const LONG_PRESS_MS = 1000;
const MOVE_SLOP = 8;

/**
 * Hold-and-slide confirm (founder decision 2026-10-10).
 * - Pointer Events with pointer capture; touch-action: none on the track only, so page scroll works elsewhere.
 * - Completes at about 70% of travel; released early it snaps back (animated; instant under Reduce Motion).
 * - The thumb rests at least 24 px from the screen edge so Safari's edge swipe-back does not fire.
 * - Visual feedback only: the track fills and the Porch Light glow grows. No haptics.
 * - Accessible: a real "Confirm ride" button that VoiceOver and Switch Control activate directly
 *   (visually hidden until focused), plus a 1 s long press on the thumb with visible progress.
 */
export function SlideToConfirm({ label, a11yLabel, onComplete, testId = 'confirm', disabled }: {
  label: string; a11yLabel: string; onComplete: (method: 'slide' | 'long_press' | 'a11y') => void; testId?: string; disabled?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; max: number; moved: boolean } | null>(null);
  const hold = useRef<{ start: number; timer: number } | null>(null);
  const done = useRef(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [dragging, setDragging] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const [complete, setComplete] = useState(false);
  const [maxPx, setMaxPx] = useState(0);

  useEffect(() => () => { if (hold.current) clearInterval(hold.current.timer); }, []);

  const finish = (method: 'slide' | 'long_press' | 'a11y') => {
    if (done.current || disabled) return;
    done.current = true;
    stopHold();
    if (track.current && thumb.current) setMaxPx(maxTravel());
    setProgress(1); setComplete(true); setDragging(false);
    onComplete(method);
  };
  const stopHold = () => { if (hold.current) { clearInterval(hold.current.timer); hold.current = null; } setHoldPct(0); };
  const maxTravel = () => {
    const t = track.current!.getBoundingClientRect();
    const th = thumb.current!.getBoundingClientRect();
    const pad = th.left - t.left;
    return Math.max(1, t.width - th.width - pad * 2);
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (done.current || disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const max = maxTravel();
    setMaxPx(max);
    drag.current = { id: e.pointerId, startX: e.clientX, max, moved: false };
    setDragging(true);
    const start = Date.now();
    hold.current = {
      start,
      timer: window.setInterval(() => {
        const pct = Math.min(1, (Date.now() - start) / LONG_PRESS_MS);
        setHoldPct(pct);
        if (pct >= 1) finish('long_press');
      }, 50),
    };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || done.current) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > MOVE_SLOP && !d.moved) { d.moved = true; stopHold(); }
    if (d.moved) setProgress(Math.min(1, Math.max(0, dx / d.max)));
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    stopHold();
    if (done.current) return;
    const dx = e.clientX - d.startX;
    const p = d.moved ? Math.min(1, Math.max(0, dx / d.max)) : 0;
    if (p >= SLIDE_COMPLETE_AT) finish('slide');
    else { setDragging(false); setProgress(0); } // snap back
  };

  const fill = complete ? 1 : Math.max(progress, holdPct);
  const style = {
    '--slide': String(progress), '--fill': String(fill),
    '--thumb-x': `${Math.round(progress * maxPx)}px`,
    '--label-op': String(Math.max(0, 1 - progress * 2.5)),
  } as CSSProperties;
  return (
    <div className="slide-wrap">
      <div
        ref={track}
        className={`slide${dragging ? ' is-dragging' : ''}${complete ? ' is-done' : ''}${holdPct > 0 ? ' is-holding' : ''}`}
        style={style}
        data-testid={testId}
        data-progress={fill.toFixed(2)}
        aria-hidden="true"
      >
        <span className="slide__fill" />
        <span className="slide__tick" style={{ left: `calc(var(--slide-inset) + var(--slide-thumb) / 2 + ${SLIDE_COMPLETE_AT} * (100% - 2 * var(--slide-inset) - var(--slide-thumb)))` }} />
        <span className="slide__label">{complete ? 'Confirmed' : holdPct > 0 ? 'Keep holding' : label}</span>
        <div
          ref={thumb}
          className="slide__thumb"
          style={{ transform: `translateX(${Math.round(progress * maxPx)}px)` }}
          data-testid={`${testId}-thumb`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Icon name={complete ? 'check' : 'chev'} />
          {holdPct > 0 && <svg className="slide__ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" pathLength="100" strokeDasharray={`${Math.round(holdPct * 100)} 100`} /></svg>}
        </div>
      </div>
      <button type="button" className="sr-only sr-only-focusable slide__a11y" data-testid={`${testId}-a11y`}
        disabled={disabled || complete} onClick={() => finish('a11y')}>{a11yLabel}</button>
      <p className="slide__hint foot">Slide to confirm, or press and hold. You can undo for 10 seconds.</p>
    </div>
  );
}
