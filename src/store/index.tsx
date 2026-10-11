import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { DemoState, DemoStore } from './types';

const StoreCtx = createContext<DemoStore | null>(null);

export function StoreProvider({ store, children }: { store: DemoStore; children: ReactNode }) {
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}

export function useStore(): DemoStore {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function useDemoState(): DemoState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export type { DemoState, DemoStore } from './types';
