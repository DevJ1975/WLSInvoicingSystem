import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';

type Mode = 'signin' | 'signup' | 'reset';

const friendlyErrors: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again shortly.',
};

export function LoginPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        navigate('/');
      } else if (mode === 'signup') {
        await signUp(email, password);
        navigate('/');
      } else {
        await resetPassword(email);
        setInfo('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setError(friendlyErrors[code] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md p-8">
        <Logo className="mb-1 h-10" />
        <p className="mb-6 text-xs italic text-slate-400">Making the world a safer place</p>
        <h1 className="text-xl font-bold text-wls-ink">
          {mode === 'signin' && 'Sign in'}
          {mode === 'signup' && 'Create your account'}
          {mode === 'reset' && 'Reset password'}
        </h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Invoicing &amp; Expense System</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-wls-red">{error}</p>}
          {info && <p className="text-sm text-green-600">{info}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Send reset email'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
          {mode === 'signin' && (
            <>
              <button className="text-wls-red hover:underline" onClick={() => setMode('reset')}>
                Forgot password?
              </button>
              <p>
                No account?{' '}
                <button className="text-wls-red hover:underline" onClick={() => setMode('signup')}>
                  Create one
                </button>
              </p>
            </>
          )}
          {mode !== 'signin' && (
            <button className="text-wls-red hover:underline" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
