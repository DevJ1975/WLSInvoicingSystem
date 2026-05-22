# WLS Invoicing System

A cross-platform (web, iOS, Android) expense, mileage, and invoicing app for **Workplace Learning System**, rebuilt from the original spreadsheet. Track client work, snap receipt photos, record mileage (live GPS or manual), and send a branded expense statement to anyone as a PDF, an email, or a read-only link.

- **App:** Expo (React Native + react-native-web) + Expo Router + NativeWind
- **Backend:** Firebase — Authentication, Cloud Firestore, Cloud Storage, Cloud Functions
- **Email:** Cloud Function + [Resend](https://resend.com)
- **Web hosting:** Vercel (static web export)

## Features

| Spreadsheet tab | App feature |
| --- | --- |
| Expense Statement | Branded statement output → PDF / email / share link |
| Expense Report | Itemized expenses by category (Hotel, Meals, Fuel, …) |
| Mileage | Live GPS trip tracker + manual entry @ IRS rate |
| Work Log | Daily work entries (client, hours, summary, findings) |
| Receipts | Photo capture (camera/library) stored in Cloud Storage |
| Reset / Dashboard | Auto-incrementing report numbers + totals |

## 1. Prerequisites

- Node.js 20+
- The [Expo CLI](https://docs.expo.dev) (via `npx`, no global install needed)
- For native builds: an [Expo account](https://expo.dev) + [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`)
- The [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

## 2. Create the Firebase project

1. [Firebase console](https://console.firebase.google.com) → **Add project**.
2. Enable: **Authentication** → Email/Password; **Firestore Database** (Production mode); **Storage**.
3. Project settings → **General** → *Your apps* → add a **Web app** and copy the config.

> **Cloud Functions require the Blaze (pay-as-you-go) plan.** PDF export and on-device
> sharing work without it; only **in-app email** and **public share links** need the functions.

## 3. Configure & run the app

```bash
cp .env.example .env     # fill in EXPO_PUBLIC_FIREBASE_* values
npm install
npx expo start           # press w (web), i (iOS sim), a (Android), or scan QR in Expo Go
```

`.env` keys (all prefixed `EXPO_PUBLIC_` so they're embedded at build time):

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FUNCTIONS_BASE_URL=        # set after deploying functions (email + share)
EXPO_PUBLIC_WEB_BASE_URL=              # your Vercel URL (used to build share links)
EXPO_PUBLIC_MAPBOX_TOKEN=             # optional: manual-mileage auto-distance
```

## 4. Deploy the security rules & indexes

```bash
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Production-mode Firestore/Storage denies all access until these rules are deployed.

## 5. Deploy the Cloud Functions (email + share link)

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set RESEND_API_KEY   # create a key at resend.com
# optional: copy functions/.env.example -> functions/.env (RESEND_FROM, ALLOWED_ORIGIN)
firebase deploy --only functions
```

Put the printed functions base URL into `EXPO_PUBLIC_FUNCTIONS_BASE_URL`.

## 6. Deploy the web app to Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Build command `npx expo export -p web`, output directory `dist` (see `vercel.json`).
3. Add all `EXPO_PUBLIC_*` variables under **Environment Variables**.
4. Set the functions' `ALLOWED_ORIGIN` to your Vercel URL and redeploy functions.

## 7. Build the mobile apps (iOS / Android)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android      # produces an .aab/.apk
eas build -p ios          # requires an Apple Developer account
```

Camera, photo library, and (background) location permissions are declared via the
plugins in `app.json`.

## Data model (Firestore)

```
users/{uid}
  meta/profile                # name, address, contact, tagline
  meta/settings               # mileage rates by year
  clients/{clientId}          # saved clients + default day rate
  reports/{reportId}          # report no, client, period, labor, denormalized totals
    workLog/{id}
    receipts/{id}             # + Cloud Storage image path
    mileage/{id}              # manual or live GPS path
shares/{token}                # { uid, reportId } lookup for public share links
```

## Notes & limitations

- **Live GPS** records while the app is foregrounded; native background tracking can be
  enabled (permissions are already declared). On web, manual entry is the fallback.
- **Email & share links** require the Cloud Functions (Blaze plan). PDF export/share work
  offline on-device.
- Dates are entered as `YYYY-MM-DD` text fields (no native date-picker dependency).
- Report numbers auto-increment from your highest existing report.

## Scripts

| Command | Description |
| --- | --- |
| `npx expo start` | Start the dev server (web + native) |
| `npm run web` / `ios` / `android` | Start a specific platform |
| `npm run export:web` | Build the static web bundle into `dist/` |
| `npm run typecheck` | Type-check the project |
