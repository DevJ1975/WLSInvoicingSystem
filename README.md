# WLS Invoicing System

A mobile-friendly expense, mileage, and invoicing app for **Workplace Learning System**, rebuilt from the original spreadsheet. Track client work, snap receipt photos, record mileage (live GPS or manual), and send a branded expense statement to anyone as a PDF, an email, or a read-only link.

- **Frontend:** React + Vite + TypeScript + Tailwind (deploys to Vercel)
- **Backend:** Firebase — Authentication, Cloud Firestore, Cloud Storage, Cloud Functions
- **Email:** Cloud Function + [Resend](https://resend.com)

## Features

| Spreadsheet tab | App feature |
| --- | --- |
| Expense Statement | Branded statement output → PDF / email / share link |
| Expense Report | Itemized expenses by category (Hotel, Meals, Fuel, …) |
| Mileage | Live GPS trip tracker + manual entry @ IRS rate |
| Work Log | Daily work entries (client, hours, summary, findings) |
| Receipts | Photo capture from phone camera, stored in Cloud Storage |
| Reset / Dashboard | Auto-incrementing report numbers + totals dashboard |

## 1. Prerequisites

- Node.js 20+
- A Google account (for Firebase)
- The [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

## 2. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) → **Add project**.
2. Enable these products:
   - **Authentication** → Sign-in method → enable **Email/Password**.
   - **Firestore Database** → Create database (Production mode).
   - **Storage** → Get started.
3. Project settings → **General** → *Your apps* → add a **Web app**. Copy the config values.

> **Cloud Functions require the Blaze (pay-as-you-go) plan.** The PDF download and
> share-PDF features work without it; only **in-app email** and the **public share link**
> need the deployed functions. Upgrade under Firebase console → Usage and billing.

## 3. Configure the frontend

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase web config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# After deploying functions (step 5), set this to the functions base URL:
VITE_FUNCTIONS_BASE_URL=https://us-central1-your-project.cloudfunctions.net

# Optional: enables "calculate driving distance" for manual mileage entries
VITE_MAPBOX_TOKEN=
```

Install and run locally:

```bash
npm install
npm run dev
```

## 4. Deploy the security rules & indexes

```bash
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

`firestore.rules` and `storage.rules` lock all data to its owner (`/users/{uid}/…`).

## 5. Deploy the Cloud Functions (email + share link)

```bash
cd functions
npm install
cd ..

# Set your Resend API key (create one free at resend.com)
firebase functions:secrets:set RESEND_API_KEY

# Optional config — copy functions/.env.example to functions/.env and edit:
#   RESEND_FROM    -> a verified Resend sender (or onboarding@resend.dev for testing)
#   ALLOWED_ORIGIN -> your Vercel URL (or * during development)

firebase deploy --only functions
```

After deploying, copy the printed function URL base (e.g.
`https://us-central1-your-project.cloudfunctions.net`) into `VITE_FUNCTIONS_BASE_URL`
in `.env` (and in your Vercel environment variables).

## 6. Deploy the frontend to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com) → **New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist`.
4. Add all `VITE_*` variables from your `.env` under **Environment Variables**.
5. Deploy. Set `ALLOWED_ORIGIN` (functions) to the resulting `*.vercel.app` URL and
   redeploy functions so the email/share endpoints accept requests from your site.

## Data model (Firestore)

```
users/{uid}
  meta/profile                # your name, address, contact, tagline
  meta/settings               # mileage rates by year
  clients/{clientId}          # saved clients + default day rate
  reports/{reportId}          # report no, client, period, labor, denormalized totals
    workLog/{id}              # daily work entries
    receipts/{id}             # receipts (+ Storage image path)
    mileage/{id}              # trips (manual or live GPS path)
shares/{token}                # { uid, reportId } lookup for public share links
```

Receipt/map images are stored in Cloud Storage under `users/{uid}/reports/{reportId}/…`.

## Notes & limitations

- **Live GPS tracking** records your path only while the app is open and the screen is on —
  mobile browsers suspend geolocation in the background. For long drives, keep the screen
  awake or enter the trip manually (typing miles always works; address auto-distance needs a
  Mapbox token).
- **Email & share links** require the Cloud Functions (Blaze plan). Without them, you can
  still download and share the PDF directly from your device.
- Report numbers auto-increment from your highest existing report.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |
