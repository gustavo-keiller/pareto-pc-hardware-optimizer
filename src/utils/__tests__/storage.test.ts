import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  runStorageMigrations,
  safeGetBool,
  safeGetInt,
  safeGetJSON,
  safeGetString,
  safeSetJSON,
} from '../storage';

describe('safe storage utilities (src/utils/storage.ts)', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mockStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  it('returns defaultValue when key is missing or malformed JSON', () => {
    const fallback = { price: 35, rasterFps1440p: 30 };
    expect(safeGetJSON('missing_key', fallback)).toEqual(fallback);

    localStorage.setItem('corrupt_json', '{bad json');
    expect(safeGetJSON('corrupt_json', fallback)).toEqual(fallback);

    // Array vs object shape mismatch falls back safely
    localStorage.setItem('wrong_shape', '[1, 2, 3]');
    expect(safeGetJSON('wrong_shape', fallback)).toEqual(fallback);
  });

  it('round-trips valid objects and arrays via safeSetJSON and safeGetJSON', () => {
    const weights = { price: 50, vramGb: 50 };
    safeSetJSON('user_weights', weights);
    expect(safeGetJSON('user_weights', { price: 0, vramGb: 0 })).toEqual(
      weights,
    );

    const compareIds = ['gpu-2', 'gpu-4'];
    safeSetJSON('compare_ids', compareIds);
    expect(safeGetJSON<string[]>('compare_ids', [])).toEqual(compareIds);
  });

  it('clamps integers and handles non-numeric strings in safeGetInt', () => {
    expect(safeGetInt('missing', 500)).toBe(500);
    localStorage.setItem('nan_val', 'not-a-number');
    expect(safeGetInt('nan_val', 500)).toBe(500);

    localStorage.setItem('budget', '1200');
    expect(safeGetInt('budget', 500, 100, 1000)).toBe(1000);
    expect(safeGetInt('budget', 500, 1500, 2000)).toBe(1500);
  });

  it('parses booleans and strings safely', () => {
    localStorage.setItem('flag_true', 'true');
    localStorage.setItem('flag_one', '1');
    localStorage.setItem('flag_false', 'false');
    expect(safeGetBool('flag_true', false)).toBe(true);
    expect(safeGetBool('flag_one', false)).toBe(true);
    expect(safeGetBool('flag_false', true)).toBe(false);
    expect(safeGetBool('missing_flag', true)).toBe(true);

    localStorage.setItem('quoted_str', '"balanced"');
    expect(safeGetString('quoted_str', 'default')).toBe('balanced');
  });

  it('runs schema migrations and stamps paretopc_schema_version', () => {
    runStorageMigrations();
    expect(safeGetInt('paretopc_schema_version', 0)).toBe(
      CURRENT_SCHEMA_VERSION,
    );
  });
});
