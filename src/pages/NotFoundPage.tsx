import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="h-10" />
      <h1 className="text-2xl font-bold text-wls-ink">Page not found</h1>
      <Link to="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
