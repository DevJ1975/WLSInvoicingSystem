import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../context/AuthContext';
import { usePinLock } from '../context/PinLockContext';
import { Logo } from '../components/Logo';
import { PinPad } from '../components/PinPad';
import { Button, Field, Input } from '../components/ui';
import { clearPin } from '../lib/pin';

const friendly: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect password.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts. Try again shortly.',
};

export default function LockScreen() {
  const { user, logout, reauthenticate } = useAuth();
  const { unlock, refresh, cooldownUntil } = usePinLock();
  const [mode, setMode] = useState<'enter' | 'reset'>('enter');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick the clock while cooling down so the countdown stays live.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooling = cooldownUntil > now;
  const secsLeft = cooling ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  async function submitPin(entered: string) {
    setBusy(true);
    setError('');
    const res = await unlock(entered);
    setBusy(false);
    setPin('');
    if (!res.ok) setError(res.error ?? 'Incorrect PIN.');
    // On success, PinLock clears `locked` and the root gate routes away.
  }

  async function resetViaPassword() {
    if (!password) {
      setError('Enter your account password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await reauthenticate(password);
      if (user) await clearPin(user.uid);
      await refresh(); // drops hasPin + locked; the gate routes to the dashboard
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setError(friendly[code] ?? 'Could not verify your password. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="items-center">
          <Logo width={150} />
        </View>

        {mode === 'enter' ? (
          <View className="mt-8 items-center">
            <Text className="text-xl font-bold text-wls-ink">Enter your PIN</Text>
            {user?.email ? (
              <Text className="mb-8 mt-1 text-sm text-slate-500">{user.email}</Text>
            ) : (
              <View className="mb-8" />
            )}

            <PinPad
              value={pin}
              onChange={setPin}
              onComplete={submitPin}
              disabled={busy || cooling}
            />

            <View className="mt-6 h-6">
              {cooling ? (
                <Text className="text-sm text-wls-red">
                  Too many attempts. Try again in {secsLeft}s.
                </Text>
              ) : error ? (
                <Text className="text-sm text-wls-red">{error}</Text>
              ) : null}
            </View>

            <View className="mt-4 items-center gap-3">
              <Pressable onPress={() => { setError(''); setPin(''); setMode('reset'); }}>
                <Text className="text-sm text-wls-red">Forgot PIN?</Text>
              </Pressable>
              <Pressable onPress={() => logout()}>
                <Text className="text-sm text-slate-500">Sign out</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mt-8">
            <View className="rounded-2xl border border-slate-200 bg-white p-6">
              <Text className="text-xl font-bold text-wls-ink">Reset your PIN</Text>
              <Text className="mb-5 mt-1 text-sm text-slate-500">
                Confirm your account password to turn off the PIN. You can set a new one from
                Settings afterward.
              </Text>

              <Field label="Account password">
                <Input
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
              </Field>

              {error ? <Text className="mt-1 text-sm text-wls-red">{error}</Text> : null}

              <Button
                title="Reset PIN"
                onPress={resetViaPassword}
                loading={busy}
                className="mt-4"
              />

              <View className="mt-6 items-center">
                <Pressable
                  onPress={() => {
                    setError('');
                    setPassword('');
                    setMode('enter');
                  }}
                >
                  <Text className="text-sm text-wls-red">Back to PIN</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
