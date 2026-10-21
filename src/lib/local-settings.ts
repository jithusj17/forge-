"use client";

import { useSyncExternalStore } from "react";

// Per-browser settings. The Anthropic key never touches our database: it is sent
// per request in a header and used only for that request.
const KEY = "forge:anthropic-key";
const THEME = "forge:theme";
export type Theme = "system" | "light" | "dark";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => (e.key === KEY || e.key === THEME) && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode): setting lasts for this page only
  }
  emit();
}

export function getApiKey() {
  return read(KEY);
}
export function setApiKey(value: string | null) {
  write(KEY, value?.trim() ? value.trim() : null);
}
export function useApiKey() {
  return useSyncExternalStore(subscribe, () => read(KEY), () => null);
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
}
export function setTheme(theme: Theme) {
  write(THEME, theme === "system" ? null : theme);
  applyTheme(theme);
}
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => (read(THEME) as Theme | null) ?? "system", () => "system");
}

/** Runs before paint (inlined in <head>) so a forced theme never flashes. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME)});if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`;
