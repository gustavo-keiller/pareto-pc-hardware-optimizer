/**
 * Safe localStorage utilities and versioned configuration migrations for ParetoPC.
 * Ensures user slider weights, hard constraints, and saved builds never white-screen the app.
 */

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Safely parses JSON from localStorage with fallback on error or malformed data.
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return defaultValue;
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || parsed === undefined) {
      return defaultValue;
    }
    if (Array.isArray(defaultValue)) {
      return (Array.isArray(parsed) ? parsed : defaultValue) as T;
    }
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return (
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? parsed
          : defaultValue
      ) as T;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely writes JSON to localStorage with error catching.
 */
export function safeSetJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save key '${key}' to localStorage:`, e);
  }
}

/**
 * Safely retrieves an integer from localStorage with optional min/max bounds checking.
 */
export function safeGetInt(
  key: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw.trim() === '') {
      return defaultValue;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      return defaultValue;
    }
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely retrieves a boolean from localStorage.
 */
export function safeGetBool(key: string, defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    const lower = raw.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely retrieves a string from localStorage.
 */
export function safeGetString(key: string, defaultValue: string): string {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    const trimmed = raw.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
      } catch {
        return trimmed.slice(1, -1);
      }
    }
    return trimmed;
  } catch {
    return defaultValue;
  }
}

/**
 * Runs versioned migrations on localStorage to ensure backward compatibility across releases.
 */
export function runStorageMigrations(): void {
  const currentVersion = safeGetInt('paretopc_schema_version', 0);

  if (currentVersion < 1) {
    try {
      localStorage.setItem('paretopc_schema_version', String(CURRENT_SCHEMA_VERSION));
    } catch {
      // Ignore quota or private-browsing storage errors
    }
  }
}
