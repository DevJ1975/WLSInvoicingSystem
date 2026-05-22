# WLS Invoicing System — Handoff (React Native / Expo migration)

This project is being migrated from a React + Vite **web** app to **Expo (React Native +
react-native-web)** so it ships to **web, iOS, and Android** from one codebase. The original
web implementation (git history before the migration on this branch, and draft PR #1) is the
reference spec for behavior and visual design.

## What it is
A mobile expense, mileage, and invoicing app for "Workplace Learning System" (WLS), rebuilt
from a spreadsheet. Modules: Expense Statement (branded invoice output), Expense Report
(itemized expenses by category), Mileage (trips @ IRS rate $0.725/mi), Work Log (daily
entries), Receipts (photo capture), Dashboard. Single-user email/password auth, data isolated
per user.

## Target stack
- Expo (managed) + Expo Router + React Native
- react-native-web for the web target
- NativeWind (Tailwind syntax for RN) for styling
- Firebase JS SDK (firebase/*) for Auth + Firestore + Storage (web parity across platforms)
- expo-image-picker (camera/gallery receipts), expo-location + expo-task-manager (GPS, incl.
  background tracking on native), expo-print + expo-sharing (branded PDF statement)
- TanStack Query; Cloud Functions unchanged (sendReport via Resend, shareReport public read)

## Firebase project: wls-invoice
.env is git-ignored — recreate with EXPO_PUBLIC_* vars:

    EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCyhJCS9GdsRRtV8OQLcWd3UeOLPzp1kFA
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wls-invoice.firebaseapp.com
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=wls-invoice
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=wls-invoice.firebasestorage.app
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=373668684819
    EXPO_PUBLIC_FIREBASE_APP_ID=1:373668684819:web:4b548af579aa0a94020be6
    EXPO_PUBLIC_FUNCTIONS_BASE_URL=
    EXPO_PUBLIC_MAPBOX_TOKEN=

## Reuse vs rebuild
REUSE (platform-agnostic TS): lib/types.ts, lib/calc.ts, lib/statement.ts, lib/db.ts,
hooks/data.ts, lib/geo.ts, hooks/{useImageUrl,useResetForm,useUid}.
PORT WITH CHANGES: lib/firebase.ts (RN auth persistence via AsyncStorage; gate Analytics to
web), lib/storage.ts (upload from file URI: fetch(uri)->blob; use expo-crypto for UUIDs),
lib/api.ts (replace react-pdf with expo-print HTML render), context/AuthContext.tsx,
hooks/useGeoTracker.ts (rewrite with expo-location; optional background tracking).
REBUILD: all screens/components (RN + NativeWind, Expo Router) and the PDF (expo-print HTML
template matching brand: red #E2231A, ink #2E2224, logo, "Making the world a safer place",
line-item table, TOTAL DUE).

## Data model (unchanged — Firestore)
users/{uid}/meta/{profile,settings}; users/{uid}/clients/{id};
users/{uid}/reports/{id}/{workLog,receipts,mileage}/{id}; shares/{token}.
Report totals are denormalized onto the report doc and recomputed on every receipt/mileage
edit (recomputeReportTotals in lib/db.ts).

## Build/deploy
- Web: `npx expo export -p web` -> static dist/; deploy to Vercel.
- iOS/Android: EAS Build; camera + background location need app.json plugin config and
  Info.plist/AndroidManifest usage strings.
- Cloud Functions unchanged; email/share need Firebase Blaze + RESEND_API_KEY.

## Required backend setup (Production mode denies all access until rules deploy)
1. Firebase console (wls-invoice): enable Email/Password; Firestore DB (Production); Storage.
2. firebase login && firebase use wls-invoice &&
   firebase deploy --only firestore:rules,firestore:indexes,storage
3. Email/share (optional): Blaze + RESEND_API_KEY + deploy functions; set
   EXPO_PUBLIC_FUNCTIONS_BASE_URL and the function ALLOWED_ORIGIN.

## Gotchas
- Auth won't persist on native without getReactNativePersistence(AsyncStorage).
- crypto.randomUUID / some Intl currency formatting aren't guaranteed in Hermes — use
  expo-crypto and verify formatCurrency.
- expo-image-picker / expo-location need permission prompts + app.json plugin config.
- firebase/analytics and @react-pdf/renderer are web-only — never import on native.
