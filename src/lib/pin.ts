import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// The app PIN is a 4-digit lock layered on top of Firebase email/password auth:
// the user signs in with their full credentials first, and the PIN is a quick
// gate for reopening the app. The salted hash lives in Firestore at
// users/{uid}/meta/security, which the security rules expose only to the
// authenticated owner — so the PIN is a privacy/convenience gate, not the
// primary access control. A 4-digit space is tiny, so brute-force resistance
// comes from the persisted attempt lockout below rather than from the hash.

export const PIN_LENGTH = 4;

export interface SecurityRecord {
  salt: string;
  hash: string;
  updatedAt: number;
}

const securityRef = (uid: string) => doc(db, 'users', uid, 'meta', 'security');

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

// Constant-time-ish comparison so a match doesn't leak via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function getSecurity(uid: string): Promise<SecurityRecord | null> {
  const snap = await getDoc(securityRef(uid));
  return snap.exists() ? (snap.data() as SecurityRecord) : null;
}

export async function hasPin(uid: string): Promise<boolean> {
  return (await getSecurity(uid)) !== null;
}

export async function setPin(uid: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`PIN must be ${PIN_LENGTH} digits.`);
  const salt = toHex(await Crypto.getRandomBytesAsync(16));
  const hash = await hashPin(pin, salt);
  await setDoc(securityRef(uid), { salt, hash, updatedAt: Date.now() });
}

export async function verifyPin(uid: string, pin: string): Promise<boolean> {
  const rec = await getSecurity(uid);
  if (!rec) return false;
  const hash = await hashPin(pin, rec.salt);
  return safeEqual(hash, rec.hash);
}

export async function clearPin(uid: string): Promise<void> {
  await deleteDoc(securityRef(uid));
}

// ---- Attempt lockout ----------------------------------------------------
// Persisted per-user so killing and relaunching the app can't reset the
// counter and sidestep the throttle.

export const MAX_ATTEMPTS = 5; // consecutive failures before a cooldown
export const COOLDOWN_MS = 30_000; // cooldown length once the limit is hit

export interface LockState {
  attempts: number;
  cooldownUntil: number; // epoch ms; 0 when not cooling down
}

const EMPTY_LOCK: LockState = { attempts: 0, cooldownUntil: 0 };
const lockKey = (uid: string) => `wls.pinlock.${uid}`;

export async function getLockState(uid: string): Promise<LockState> {
  try {
    const raw = await AsyncStorage.getItem(lockKey(uid));
    if (!raw) return { ...EMPTY_LOCK };
    const parsed = JSON.parse(raw) as Partial<LockState>;
    return {
      attempts: parsed.attempts ?? 0,
      cooldownUntil: parsed.cooldownUntil ?? 0,
    };
  } catch {
    return { ...EMPTY_LOCK };
  }
}

export async function saveLockState(uid: string, state: LockState): Promise<void> {
  try {
    await AsyncStorage.setItem(lockKey(uid), JSON.stringify(state));
  } catch {
    // Non-fatal: the lockout is a best-effort throttle.
  }
}

export async function clearLockState(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(lockKey(uid));
  } catch {
    // Non-fatal.
  }
}
