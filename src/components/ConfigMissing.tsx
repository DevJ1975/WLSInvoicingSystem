import { ScrollView, Text, View } from 'react-native';
import { Logo } from './Logo';

export function ConfigMissing() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <View className="rounded-2xl border border-slate-200 bg-white p-6">
        <Logo width={160} />
        <Text className="mt-5 text-xl font-bold text-wls-ink">Firebase isn't configured</Text>
        <Text className="mt-2 text-sm text-slate-600">
          Create a .env file (copy .env.example) with your Firebase web config, then restart the
          app:
        </Text>
        <View className="mt-3 rounded-xl bg-wls-ink p-4">
          <Text className="text-xs text-slate-100">
            EXPO_PUBLIC_FIREBASE_API_KEY=...{'\n'}
            EXPO_PUBLIC_FIREBASE_PROJECT_ID=...{'\n'}
            EXPO_PUBLIC_FIREBASE_APP_ID=...
          </Text>
        </View>
        <Text className="mt-4 text-xs text-slate-500">See README.md for full setup steps.</Text>
      </View>
    </ScrollView>
  );
}
