# Trip Manager — Progress & Developer Notes

> Living log, updated at the end of every milestone.
> What the app does: [SPEC.md](SPEC.md) · Build order: [BUILD_PLAN.md](BUILD_PLAN.md)

## Milestone status

| # | Milestone | Status | PR |
|---|---|---|---|
| M0 | Project setup | ✅ Done | [#1](https://github.com/iamharish18/Trip-manager/pull/1) |
| M1 | Accounts and Home | ✅ Done | [#2](https://github.com/iamharish18/Trip-manager/pull/2) |
| M2 | Trips and participants | ✅ Done | [#3](https://github.com/iamharish18/Trip-manager/pull/3) |
| M3 | Expenses and core logic | ✅ Done | [#4](https://github.com/iamharish18/Trip-manager/pull/4) |
| M4 | Balances and insights | ✅ Done | [#5](https://github.com/iamharish18/Trip-manager/pull/5) |
| M5 | Multi-user: join, claim, leave | ⏭️ Next | — |
| M6 | Comments | ⏳ Not started | — |
| M7 | Notifications | ⏳ Not started | — |
| M8 | Trip lifecycle and settlements | ⏳ Not started | — |
| M9 | Offline hardening | ⏳ Not started | — |
| M10 | PDF export and trip deletion | ⏳ Not started | — |
| M11 | Polish and release | ⏳ Not started | — |

---

## Decisions log

Decisions agreed in discussion, by milestone. SPEC.md holds the full rules; this is the quick history.

### Before M0 (product and design)
- Friends start as names and claim their spot later with the Trip ID.
- Equal split only; INR only, whole rupees; payer absorbs rounding leftovers.
- Settle-up appears only after the trip is closed; reopen once, auto-closes after 24 hours.
- Clean, minimal UI in **teal**, light and dark mode; React Native Paper.

### M0 — Setup
- Expo (SDK 58) with **React Native Firebase** for real offline storage; **EAS cloud builds** (no Android Studio).
- Public GitHub repo, so `google-services.json` is not committed; EAS reads it from a secret file.
- Expo Router with screens in `src/app`.

### M1 — Accounts
- No email verification. Passwords at least 8 characters. Forgot password included.
- Account name is editable; no account deletion.
- Create/Join trip buttons showed "coming soon" until their milestones.

### M2 — Trips
- Creating a trip needs internet (Trip ID reserved on the server); everything else works offline.
- Start date required, **end date optional**.
- Only the creator edits the trip and manages people; the creator can rename themself.
- Names unique per trip ignoring capitals; up to 20 people.
- One suitcase icon for all trips; default categories live in code.
- Removing people always allowed in M2; blocked from M3 for people in expenses.

### M3 — Expenses
- Maximum ₹10,00,000 per expense; any date (default today); description optional, up to 100 characters, category name shown when empty.
- Undo after deleting (soft delete).
- Your position ("You're owed ₹X") shown on the Expenses tab.
- Split list fixed at creation; "Paid by" can change only within it.
- Custom categories: 1–20 characters, unique, not a default name; added from "+ New" or Trip settings → Categories; deleted only when unused.

### M4 — Balances and insights
- Donut chart with `react-native-svg`, so **a new dev build was needed** (build of 18 Oct 2026). Install that APK; older builds crash on the Insights tab.
- Balances order: you first, then most owed to most owing.
- Percentages are whole numbers that always add up to 100%.
- Home cards show the trip total and your balance.
- No tapping through to filtered expense lists for now (possible M11 polish).

---

## Running the app

The phone can't reach the PC directly on the home Wi-Fi, so the dev server always runs through a **tunnel**.

```bash
npm start
```

1. Wait for the QR code (20–30 seconds; the tunnel has to start).
2. On the phone, open **Trip Manager** → **Scan QR Code** → scan it.
3. Code changes reload on the phone within seconds. Press `r` in the terminal to reload manually.

**Rules of thumb**
- The tunnel address changes every time the server starts, and goes stale after running for hours. Always scan the **fresh** QR code; never use "Recently opened".
- Restart the server after installing packages.
- A new **cloud build** is needed only when a package with native code is added:
  ```bash
  npm run build:dev
  ```

## Testing

| Command | What it checks |
|---|---|
| `npm test` | Unit tests (logic) and routing tests (which screens each user can reach) |
| `npm run test:rules` | Firestore security rules on the local emulator (needs JDK 21) |
| `npm run lint` | Code problems |
| `npx prettier --check .` | Formatting |
| `npx expo-doctor` | Expo dependency and config problems |

## Deploying security rules

After changing `firebase/firestore.rules` and running `npm run test:rules`:

```bash
firebase deploy --only firestore:rules --project trip-manager-a75e6
```

## Project facts

| Item | Value |
|---|---|
| Firebase project | `trip-manager-a75e6` (Firestore in `asia-south1`, Mumbai) |
| Android package | `com.iamharish18.tripmanager` |
| EAS project | `@iamharish18/trip-manager` |
| GitHub | `iamharish18/Trip-manager` (public) |
| Workflow | One branch and PR per milestone, merged into `main` after testing on the phone |

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone: **"Failed to open app"** / **"Host unreachable"** | The dev server isn't running or its tunnel is stale. Restart `npm start` and scan the new QR code. |
| Dev server stops right after starting with **`getaddrinfo ENOTFOUND …on.expo.app`** | A DNS timing blip with the brand-new tunnel address. Start it again and scan the new QR code. |
| Phone: **"Unmatched Route"** | A routing bug. Fixed in M1 with a start route at `/`; the routing tests guard against it. |
| `npm run test:rules` says Java is too old | `JAVA_HOME` must point to JDK 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`). |
| Rules tests fail only when run together | They share one emulator, so they must run one file at a time (`maxWorkers: 1` in `jest.rules.config.js`). |
