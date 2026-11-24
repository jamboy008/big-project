import type { ChatSession } from '../types/api';

const STORAGE_PREFIX = 'aljabr_cc_chats_v1';
const LEGACY_SHARED_KEYS = ['cc_chats', 'aljabr_auth', 'cc_api_url'];

export function getTenantStorageKey(organizationId: string, userId: string): string {
  const safeOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}:${safeOrg}:${safeUser}`;
}

export function purgeLegacyUnsafeStorage(): void {
  try {
    for (const key of LEGACY_SHARED_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function loadTenantChats(
  organizationId: string,
  userId: string,
): ChatSession[] | null {
  try {
    const key = getTenantStorageKey(organizationId, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    // Enforce strict tenant match when reading back
    return (parsed as ChatSession[]).filter(
      (chat) =>
        chat &&
        typeof chat.id === 'string' &&
        chat.organizationId === organizationId &&
        chat.userId === userId &&
        Array.isArray(chat.messages),
    );
  } catch {
    return null;
  }
}

export function saveTenantChats(
  organizationId: string,
  userId: string,
  chats: ChatSession[],
): void {
  try {
    const key = getTenantStorageKey(organizationId, userId);
    const scoped = chats.filter(
      (c) => c.organizationId === organizationId && c.userId === userId,
    );
    localStorage.setItem(key, JSON.stringify(scoped));
  } catch {
    // Ignore quota errors
  }
}

export function clearAllSensitiveLocalData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(STORAGE_PREFIX) || LEGACY_SHARED_KEYS.includes(key))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}
