"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and the hydration pass, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
