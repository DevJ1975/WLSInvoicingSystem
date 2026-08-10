import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import {
  COOLDOWN_MS,
  MAX_ATTEMPTS,
  clearLockState,
  getLockState,
  hasPin as hasPinRemote,
  saveLockState,
  verifyPin,
} from '../lib/pin';

export interface UnlockResult {
  ok: boolean;
  error?: string;
}

interface PinLockValue {
  /** Whether the signed-in user has a PIN configured. */
  hasPin: boolean;
  /** Whether the app is currently locked behind the PIN screen. */
  locked: boolean;
  /** True while we're loading the user's PIN state (avoid flashing screens). */
  checking: boolean;
  /** Epoch ms until which entry is throttled after too many failures (0 = none). */
  cooldownUntil: number;
  unlock: (pin: string) => Promise<UnlockResult>;
  lock: () => void;
  /** Re-read PIN state from Firestore after enabling/changing/clearing it. */
  refresh: () => Promise<void>;
}

const PinLockContext = createContext<PinLockValue | undefined>(undefined);

export function PinLockProvider({ children }: { children: ReactNode }) {
  const { user, consumeFreshLogin } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const attemptsRef = useRef(0);
  const hasPinRef = useRef(false);

  // Mirror hasPin into a ref so the AppState listener sees the latest value
  // without needing to re-subscribe on every change.
  useEffect(() => {
    hasPinRef.current = hasPin;
  }, [hasPin]);

  // Load PIN + lockout state whenever the signed-in user changes.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        if (!active) return;
        setHasPin(false);
        setLocked(false);
        setCooldownUntil(0);
        attemptsRef.current = 0;
        setChecking(false);
        return;
      }
      setChecking(true);
      const [exists, lockState] = await Promise.all([
        hasPinRemote(user.uid),
        getLockState(user.uid),
      ]);
      if (!active) return;
      // Someone who just typed their email + password shouldn't be re-prompted
      // for the PIN; only lock a session restored on cold start.
      const fresh = consumeFreshLogin();
      attemptsRef.current = lockState.attempts;
      setCooldownUntil(lockState.cooldownUntil);
      setHasPin(exists);
      setLocked(exists && !fresh);
      setChecking(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  // Re-lock whenever the app leaves the foreground (also fires on web tab hide).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && hasPinRef.current) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback<PinLockValue['unlock']>(
    async (pin) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      const now = Date.now();
      if (cooldownUntil > now) {
        const secs = Math.ceil((cooldownUntil - now) / 1000);
        return { ok: false, error: `Too many attempts. Try again in ${secs}s.` };
      }
      const ok = await verifyPin(user.uid, pin);
      if (ok) {
        attemptsRef.current = 0;
        setCooldownUntil(0);
        await clearLockState(user.uid);
        setLocked(false);
        return { ok: true };
      }
      const attempts = attemptsRef.current + 1;
      attemptsRef.current = attempts;
      const hitCooldown = attempts % MAX_ATTEMPTS === 0;
      const until = hitCooldown ? now + COOLDOWN_MS : 0;
      setCooldownUntil(until);
      await saveLockState(user.uid, { attempts, cooldownUntil: until });
      if (hitCooldown) {
        return {
          ok: false,
          error: `Too many attempts. Locked for ${Math.round(COOLDOWN_MS / 1000)}s.`,
        };
      }
      const remaining = MAX_ATTEMPTS - (attempts % MAX_ATTEMPTS);
      return {
        ok: false,
        error: `Incorrect PIN. ${remaining} ${remaining === 1 ? 'try' : 'tries'} left.`,
      };
    },
    [user, cooldownUntil],
  );

  const lock = useCallback(() => {
    if (hasPinRef.current) setLocked(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setHasPin(false);
      setLocked(false);
      return;
    }
    const exists = await hasPinRemote(user.uid);
    setHasPin(exists);
    if (!exists) {
      setLocked(false);
      attemptsRef.current = 0;
      setCooldownUntil(0);
      await clearLockState(user.uid);
    }
  }, [user]);

  const value = useMemo<PinLockValue>(
    () => ({ hasPin, locked, checking, cooldownUntil, unlock, lock, refresh }),
    [hasPin, locked, checking, cooldownUntil, unlock, lock, refresh],
  );

  return <PinLockContext.Provider value={value}>{children}</PinLockContext.Provider>;
}

export function usePinLock(): PinLockValue {
  const ctx = useContext(PinLockContext);
  if (!ctx) throw new Error('usePinLock must be used within PinLockProvider');
  return ctx;
}
