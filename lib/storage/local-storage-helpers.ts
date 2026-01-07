// localStorage helper utilities
// Provides robust serialization, error handling, and debugging for localStorage operations

const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// Storage Keys - Centralized key definitions
// ============================================================================

export const STORAGE_KEYS = {
  ACTIVE_COMPARISON: 'ccc:activeComparison',
  PREFERENCES: (userId: string) => `ccc:prefs:${userId}`,
  STORAGE_VERSION: 'ccc:version',
} as const;

// Current storage schema version - increment when making breaking changes
export const STORAGE_VERSION = 1;

// ============================================================================
// Type Guards and Serialization
// ============================================================================

/**
 * Converts Date objects to ISO strings for JSON serialization
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Converts ISO date strings back to Date objects
 * Handles common date field names
 */
export function deserializeDates<T>(obj: T, dateFields: string[] = []): T {
  if (obj === null || obj === undefined) return obj;

  // Default date fields to check
  const defaultDateFields = [
    'createdAt',
    'updatedAt',
    'uploadedAt',
    'startedAt',
    'generatedAt',
  ];

  const allDateFields = [...new Set([...defaultDateFields, ...dateFields])];

  if (Array.isArray(obj)) {
    return obj.map(item => deserializeDates(item, dateFields)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (allDateFields.includes(key) && typeof value === 'string') {
        // Attempt to parse as date
        const parsed = new Date(value);
        result[key] = isNaN(parsed.getTime()) ? value : parsed;
      } else if (typeof value === 'object') {
        result[key] = deserializeDates(value, dateFields);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

// ============================================================================
// Core localStorage Operations
// ============================================================================

/**
 * Safely retrieves and parses data from localStorage
 * Returns null if key doesn't exist or parsing fails
 */
export function loadFromLocalStorage<T>(
  key: string,
  options?: {
    dateFields?: string[];
    validator?: (data: unknown) => data is T;
  }
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawData = localStorage.getItem(key);

    if (!rawData) {
      if (DEBUG) {
        console.log(`[Storage] Key "${key}" not found in localStorage`);
      }
      return null;
    }

    const parsed = JSON.parse(rawData);
    const deserialized = deserializeDates<T>(parsed, options?.dateFields);

    // Run validator if provided
    if (options?.validator && !options.validator(deserialized)) {
      console.warn(`[Storage] Validation failed for key "${key}", returning null`);
      return null;
    }

    if (DEBUG) {
      console.log(`[Storage] Loaded from "${key}":`, deserialized);
    }

    return deserialized;
  } catch (error) {
    console.error(`[Storage] Failed to load from "${key}":`, error);
    return null;
  }
}

/**
 * Safely serializes and saves data to localStorage
 * Returns true on success, false on failure
 */
export function saveToLocalStorage<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const serialized = serializeDates(data);
    const jsonString = JSON.stringify(serialized);

    localStorage.setItem(key, jsonString);

    if (DEBUG) {
      console.log(`[Storage] Saved to "${key}":`, {
        data: serialized,
        size: `${(jsonString.length / 1024).toFixed(2)} KB`,
      });
    }

    return true;
  } catch (error) {
    console.error(`[Storage] Failed to save to "${key}":`, error);

    // Check if it's a quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[Storage] localStorage quota exceeded. Consider clearing old data.');
    }

    return false;
  }
}

/**
 * Removes a specific key from localStorage
 */
export function removeFromLocalStorage(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);

    if (DEBUG) {
      console.log(`[Storage] Removed key "${key}"`);
    }

    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove "${key}":`, error);
    return false;
  }
}

// ============================================================================
// Specialized Clear Operations
// ============================================================================

/**
 * Clears all contract comparator data from localStorage
 * Useful for logout or data reset
 */
export function clearAllStorageData(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    // Find all keys that start with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ccc:')) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (DEBUG) {
      console.log(`[Storage] Cleared ${keysToRemove.length} keys:`, keysToRemove);
    }
  } catch (error) {
    console.error('[Storage] Failed to clear all storage data:', error);
  }
}

/**
 * Clears only active comparison state
 * Useful when a comparison completes or fails
 */
export function clearActiveComparisonStorage(): void {
  removeFromLocalStorage(STORAGE_KEYS.ACTIVE_COMPARISON);
}

/**
 * Clears user preferences for a specific user
 */
export function clearUserPreferencesStorage(userId: string): void {
  removeFromLocalStorage(STORAGE_KEYS.PREFERENCES(userId));
}

// ============================================================================
// Storage Health and Diagnostics
// ============================================================================

/**
 * Gets information about current localStorage usage
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  items: number;
  cccItems: number;
} {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, items: 0, cccItems: 0 };
  }

  let used = 0;
  let cccItems = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
      if (key.startsWith('ccc:')) {
        cccItems++;
      }
    }
  }

  // localStorage typically has a 5MB limit
  const available = 5 * 1024 * 1024 - used;

  return {
    used,
    available,
    items: localStorage.length,
    cccItems,
  };
}

/**
 * Checks and migrates storage schema if needed
 */
export function checkStorageVersion(): void {
  if (typeof window === 'undefined') return;

  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
    const currentVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

    if (currentVersion < STORAGE_VERSION) {
      if (DEBUG) {
        console.log(`[Storage] Migrating from version ${currentVersion} to ${STORAGE_VERSION}`);
      }

      // Add migration logic here as needed
      // For now, just update the version
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STORAGE_VERSION.toString());
    }
  } catch (error) {
    console.error('[Storage] Failed to check storage version:', error);
  }
}
