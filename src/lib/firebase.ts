import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence ships only in Firebase's React Native build, which
// Metro resolves at runtime; it is absent from the default (web) type defs.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

const env = process.env;

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = initializeApp(firebaseConfig);

// Native needs explicit AsyncStorage persistence so sessions survive restarts;
// web uses the default (IndexedDB/local storage) persistence.
export const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db = getFirestore(app);
export const storage = getStorage(app);

export const functionsBaseUrl = (env.EXPO_PUBLIC_FUNCTIONS_BASE_URL ?? '').replace(/\/$/, '');
export const webBaseUrl = (env.EXPO_PUBLIC_WEB_BASE_URL ?? '').replace(/\/$/, '');
export const mapboxToken = env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

// Analytics is web-only in the Firebase JS SDK.
if (Platform.OS === 'web' && firebaseConfig.measurementId) {
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((ok) => {
        if (ok) getAnalytics(app);
      }),
    )
    .catch(() => {});
}
