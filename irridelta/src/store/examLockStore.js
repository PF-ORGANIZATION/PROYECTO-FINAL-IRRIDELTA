import { useEffect } from "react";
import { create } from "zustand";

const EXAM_LOCKS_STORAGE_KEY = "irridelta:active-exam-locks";
const EXAM_LOCK_TTL_MS = 15000;
const EXAM_LOCK_HEARTBEAT_MS = 5000;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readSharedExamLocks() {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(EXAM_LOCKS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};
    const now = Date.now();

    return Object.fromEntries(
      Object.entries(parsedValue).filter(([, expiresAt]) => Number(expiresAt) > now)
    );
  } catch {
    return {};
  }
}

function writeSharedExamLocks(locks) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    if (Object.keys(locks).length === 0) {
      window.localStorage.removeItem(EXAM_LOCKS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(EXAM_LOCKS_STORAGE_KEY, JSON.stringify(locks));
  } catch {
    // If storage is unavailable, same-tab in-memory locks still protect the UI.
  }
}

function hasSharedExamLocks() {
  return Object.keys(readSharedExamLocks()).length > 0;
}

function touchSharedExamLock(lockId) {
  const locks = readSharedExamLocks();
  locks[lockId] = Date.now() + EXAM_LOCK_TTL_MS;
  writeSharedExamLocks(locks);
}

function removeSharedExamLock(lockId) {
  const locks = readSharedExamLocks();
  delete locks[lockId];
  writeSharedExamLocks(locks);
}

export function createExamLockId(prefix) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}:${Date.now()}:${randomPart}`;
}

export const useExamLockStore = create((set, get) => ({
  activeExamLocks: [],
  isExamInProgress: hasSharedExamLocks(),
  syncExamLocks: () =>
    set((state) => ({
      isExamInProgress:
        state.activeExamLocks.length > 0 || hasSharedExamLocks(),
    })),
  startExamLock: (lockId) => {
    if (!lockId) {
      return;
    }

    touchSharedExamLock(lockId);
    set((state) => {
      const activeExamLocks = state.activeExamLocks.includes(lockId)
        ? state.activeExamLocks
        : [...state.activeExamLocks, lockId];
      return {
        activeExamLocks,
        isExamInProgress: true,
      };
    });
  },
  refreshExamLock: (lockId) => {
    if (!lockId || !get().activeExamLocks.includes(lockId)) {
      return;
    }

    touchSharedExamLock(lockId);
    set({ isExamInProgress: true });
  },
  endExamLock: (lockId) => {
    if (!lockId) {
      return;
    }

    removeSharedExamLock(lockId);
    set((state) => {
      const activeExamLocks = state.activeExamLocks.filter(
        (activeLockId) => activeLockId !== lockId
      );

      return {
        activeExamLocks,
        isExamInProgress:
          activeExamLocks.length > 0 || hasSharedExamLocks(),
      };
    });
  },
}));

export function useExamLockSync() {
  const syncExamLocks = useExamLockStore((state) => state.syncExamLocks);

  useEffect(() => {
    syncExamLocks();

    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorageChange = (event) => {
      if (event.key === EXAM_LOCKS_STORAGE_KEY) {
        syncExamLocks();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const intervalId = window.setInterval(syncExamLocks, EXAM_LOCK_HEARTBEAT_MS);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.clearInterval(intervalId);
    };
  }, [syncExamLocks]);
}

export function useExamAvailabilityLock(isActive, lockId) {
  const startExamLock = useExamLockStore((state) => state.startExamLock);
  const refreshExamLock = useExamLockStore((state) => state.refreshExamLock);
  const endExamLock = useExamLockStore((state) => state.endExamLock);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    startExamLock(lockId);
    const heartbeatId =
      typeof window === "undefined"
        ? null
        : window.setInterval(
            () => refreshExamLock(lockId),
            EXAM_LOCK_HEARTBEAT_MS
          );

    const releaseLock = () => {
      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }

      endExamLock(lockId);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", releaseLock);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", releaseLock);
      }

      releaseLock();
    };
  }, [endExamLock, isActive, lockId, refreshExamLock, startExamLock]);
}
