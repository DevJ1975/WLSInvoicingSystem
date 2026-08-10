import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Re-verify the current user's password (used to reset a forgotten PIN). */
  reauthenticate: (password: string) => Promise<void>;
  /**
   * True exactly once after an explicit sign-in/sign-up via this session, so the
   * PIN gate can skip re-prompting someone who just entered full credentials.
   * Consuming it resets the flag.
   */
  consumeFreshLogin: () => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Set when the user signs in/up through the form so the PIN gate can tell an
  // explicit login apart from a session restored on cold start.
  const freshLoginRef = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
        freshLoginRef.current = true;
      },
      signUp: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password);
        freshLoginRef.current = true;
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
      },
      reauthenticate: async (password) => {
        const current = auth.currentUser;
        if (!current || !current.email) {
          throw new Error('No signed-in account to verify.');
        }
        const credential = EmailAuthProvider.credential(current.email, password);
        await reauthenticateWithCredential(current, credential);
      },
      consumeFreshLogin: () => {
        const wasFresh = freshLoginRef.current;
        freshLoginRef.current = false;
        return wasFresh;
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
