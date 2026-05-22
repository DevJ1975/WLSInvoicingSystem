import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Button, Field, Input } from '../components/ui';

type Mode = 'signin' | 'signup' | 'reset';

const friendly: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again shortly.',
};

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        router.replace('/');
      } else if (mode === 'signup') {
        await signUp(email.trim(), password);
        router.replace('/');
      } else {
        await resetPassword(email.trim());
        setInfo('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setError(friendly[code] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const cta =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="rounded-2xl border border-slate-200 bg-white p-6">
          <Logo width={170} />
          <Text className="mb-5 mt-1 text-xs italic text-slate-400">
            Making the world a safer place
          </Text>
          <Text className="text-xl font-bold text-wls-ink">{cta}</Text>
          <Text className="mb-5 mt-1 text-sm text-slate-500">Invoicing &amp; Expense System</Text>

          <Field label="Email">
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password">
              <Input secureTextEntry value={password} onChangeText={setPassword} />
            </Field>
          )}

          {error ? <Text className="mt-1 text-sm text-wls-red">{error}</Text> : null}
          {info ? <Text className="mt-1 text-sm text-green-600">{info}</Text> : null}

          <Button title={cta} onPress={submit} loading={busy} className="mt-4" />

          <View className="mt-6 items-center gap-2">
            {mode === 'signin' && (
              <>
                <Pressable onPress={() => setMode('reset')}>
                  <Text className="text-sm text-wls-red">Forgot password?</Text>
                </Pressable>
                <Pressable onPress={() => setMode('signup')}>
                  <Text className="text-sm text-slate-500">
                    No account? <Text className="text-wls-red">Create one</Text>
                  </Text>
                </Pressable>
              </>
            )}
            {mode !== 'signin' && (
              <Pressable onPress={() => setMode('signin')}>
                <Text className="text-sm text-wls-red">Back to sign in</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
