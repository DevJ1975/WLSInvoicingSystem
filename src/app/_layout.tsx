import '../../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { firebaseConfigured } from '../lib/firebase';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PinLockProvider, usePinLock } from '../context/PinLockContext';
import { ConfigMissing } from '../components/ConfigMissing';
import { Spinner } from '../components/ui';
import { COLORS } from '../lib/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function Gate() {
  const { user, loading } = useAuth();
  const { locked, checking } = usePinLock();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    const inPublic = root === 'login' || root === 'share';
    if (!user) {
      if (!inPublic) router.replace('/login');
      return;
    }
    if (root === 'login') {
      router.replace('/');
      return;
    }
    // Authed: gate the app behind the PIN once we know whether one is set.
    if (checking || inPublic) return;
    if (locked && root !== 'lock') router.replace('/lock');
    else if (!locked && root === 'lock') router.replace('/');
  }, [user, loading, locked, checking, segments, router]);

  const root = segments[0];
  const inPublic = root === 'login' || root === 'share';
  if (loading || (user && checking)) return <Spinner />;
  // Don't mount a protected screen for a locked session while the redirect to
  // /lock is still in flight — avoids a one-frame flash of the dashboard.
  if (user && locked && !inPublic && root !== 'lock') return <Spinner />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.red,
        headerTitleStyle: { color: COLORS.ink, fontWeight: '700' },
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="lock" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'Expense Reports' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="report/[id]" options={{ title: 'Report' }} />
      <Stack.Screen name="share/[token]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (!firebaseConfigured) return <ConfigMissing />;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PinLockProvider>
            <StatusBar style="dark" />
            <Gate />
          </PinLockProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
