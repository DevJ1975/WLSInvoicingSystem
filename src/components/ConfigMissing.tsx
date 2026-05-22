import { Logo } from './Logo';

export function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card max-w-lg p-8">
        <Logo className="mb-6 h-10" />
        <h1 className="text-xl font-bold text-wls-ink">Firebase isn't configured yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a <code className="rounded bg-slate-100 px-1">.env</code> file (copy{' '}
          <code className="rounded bg-slate-100 px-1">.env.example</code>) and fill in your Firebase
          web app credentials, then restart the dev server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-wls-ink p-4 text-xs text-slate-100">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
        </pre>
        <p className="mt-4 text-xs text-slate-500">
          See <code className="rounded bg-slate-100 px-1">README.md</code> for full setup steps.
        </p>
      </div>
    </div>
  );
}
