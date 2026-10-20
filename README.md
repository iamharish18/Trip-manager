# Trip Manager

An Android app for tracking shared trip expenses with friends: add what everyone paid, see who owes whom, and settle up at the end of the trip.

<img src="assets/icon.png" width="96" alt="Trip Manager icon" />

## Features

- **Trips with friends**: add friends by name; they join later with a 6-character Trip ID or a join link and claim their name.
- **Expenses**: equal splits in whole rupees, custom categories, comments, undo after delete.
- **Balances and insights**: who owes whom (with simplified debts), category donut chart, per-person spending.
- **Close and settle up**: the creator closes the trip, members mark payments as paid; one 24-hour reopen.
- **Works offline**: changes are saved on the phone and sync when back online.
- **Notifications** for new expenses and trip events; **PDF summary** to share.
- Light and dark mode.

## Tech

- [Expo](https://expo.dev) SDK 58 · React Native · Expo Router · React Native Paper
- [React Native Firebase](https://rnfirebase.io): Authentication, Cloud Firestore (offline persistence), Crashlytics
- Firebase **Spark (free) plan only**: no Cloud Functions; server-side checks are Firestore security rules (`firebase/firestore.rules`) and transactions
- EAS Build (cloud APKs) and EAS Update (over-the-air updates)

## Project layout

| Path | What's there |
|---|---|
| `src/app` | Screens (Expo Router: every file is a route) |
| `src/components` | Shared UI pieces |
| `src/logic` | Pure logic (money, dates, validation…) with unit tests |
| `src/services` | Firebase and device APIs |
| `src/state` | React context providers and hooks |
| `firebase/` | Security rules, their tests, and the join-link web page |
| `scripts/make-icons.js` | Generates all icons from one drawing (`npm run icons`) |

## Getting started

Needs Node.js, a free Expo account and a Firebase project (Android app registered).

```bash
npm install
```

1. Put your Firebase `google-services.json` in the project root (it's gitignored; EAS builds read it from the `GOOGLE_SERVICES_JSON` secret file).
2. Build and install a development build: `npm run build:dev`.
3. Start the dev server: `npm start`, then scan the QR code from the development build.

## Checks

```bash
npm test             # unit and routing tests
npm run test:rules   # security rules on the Firestore emulator (needs JDK 21)
npm run lint
npx expo-doctor
```

## Docs

- [SPEC.md](SPEC.md): what the app does, in detail
- [BUILD_PLAN.md](BUILD_PLAN.md): the milestone plan
- [PROGRESS.md](PROGRESS.md): decisions, running, testing, releasing and troubleshooting
