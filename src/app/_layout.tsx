import '../../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { firebaseConfigured } from '../lib/firebase';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ConfigMissing } from '../components/ConfigMissing';
import { Spinner } from '../components/ui';
import { COLORS } from '../lib/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    const inPublic = root === 'login' || root === 'share';
    if (!user && !inPublic) router.replace('/login');
    else if (user && root === 'login') router.replace('/');
  }, [user, loading, segments, router]);

  if (loading) return <Spinner />;

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
          <StatusBar style="dark" />
          <Gate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
