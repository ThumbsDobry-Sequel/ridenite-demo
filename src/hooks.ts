import { useEffect, useState } from 'react';
import { useDemoState, useStore } from './store';
import { navigate } from './router';
import { STAGE_ROUTE, type Stage } from './lib/rideState';
import type { Ride } from './store/types';

export function useNow(ms = 1000): number {
  const store = useStore();
  const [now, setNow] = useState(() => store.now());
  useEffect(() => {
    const id = setInterval(() => setNow(store.now()), ms);
    return () => clearInterval(id);
  }, [ms, store]);
  return now;
}

export const TRIP_ROUTES = ['/g/p4', '/g/p5', '/g/p5w', '/g/e3', '/g/p6', '/g/p7'];

/** Current ride and its derived stage; keeps trip screens in sync with the timeline. */
export function useLiveRide(path: string, follow = true): { ride: Ride | null; stage: Stage | null } {
  const store = useStore();
  const state = useDemoState();
  useNow(500);
  const ride = state.ride;
  const stage = ride ? store.stageOf(ride) : null;
  useEffect(() => {
    if (!follow || !ride || !stage) return;
    if (state.forceOffline) return;
    const target = STAGE_ROUTE[stage];
    if (TRIP_ROUTES.includes(path) && target !== path && TRIP_ROUTES.includes(target)) navigate(target, { replace: true });
  }, [follow, ride, stage, path, state.forceOffline]);
  return { ride, stage };
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}
