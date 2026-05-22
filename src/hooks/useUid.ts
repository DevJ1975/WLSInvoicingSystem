import { useAuth } from '../context/AuthContext';

// Returns the signed-in user's uid; throws if called outside an authed route.
export function useUid(): string {
  const { user } = useAuth();
  if (!user) throw new Error('No authenticated user');
  return user.uid;
}
