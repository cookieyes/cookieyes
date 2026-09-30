"use client";

/**
 * Safe localStorage + cookie helpers. Every read/write is try/catch-wrapped
 * and never throws — private browsing, a full quota, or (for the JSON
 * helpers) a corrupt stored value all degrade to "nothing stored", never a
 * crash. This whole package only ever runs in development (see the package's
 * conditional exports), but the same "runtime side effects are best-effort"
 * rule applies here as everywhere else in the SDK.
 */

export function readLocalStorage(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // quota exceeded / private browsing / storage disabled — nothing to do
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage disabled — nothing to do
  }
}

export function readLocalStorageJson<T>(key: string): T | undefined {
  const raw = readLocalStorage(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeLocalStorageJson(key: string, value: unknown): void {
  try {
    writeLocalStorage(key, JSON.stringify(value));
  } catch {
    // a value that can't be serialised is dropped, not thrown
  }
}

/** Read one cookie's value from `document.cookie`. */
export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  try {
    for (const part of document.cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim();
      if (key !== name) continue;
      const value = part.slice(eq + 1).trim();
      return value ? decodeURIComponent(value) : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Write (or clear, when `value` is undefined) a cookie readable/writable from client JS. */
export function writeCookie(name: string, value: string | undefined): void {
  if (typeof document === "undefined") return;
  try {
    if (value === undefined) {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    } else {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // cookies disabled — nothing to do
  }
}
