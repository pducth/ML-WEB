/** Small JSON helpers around Web Storage; every access is guarded because storage can be blocked. */
export function readJson<T>(storage: 'local' | 'session', key: string, fallback: T): T {
  try {
    const raw = (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(storage: 'local' | 'session', key: string, value: unknown): void {
  try {
    const target = storage === 'local' ? localStorage : sessionStorage;
    if (value === null || value === undefined) target.removeItem(key);
    else target.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: state stays in memory only
  }
}
