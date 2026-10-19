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
| M5 | Multi-user: join, claim, leave | ✅ Done | [#6](https://github.com/iamharish18/Trip-manager/pull/6) |
| M6 | Comments | ✅ Done | [#7](https://github.com/iamharish18/Trip-manager/pull/7) |
| M7 | Notifications | ✅ Done | [#8](https://github.com/iamharish18/Trip-manager/pull/8) |
| M8 | Trip lifecycle and settlements | ✅ Done | [#9](https://github.com/iamharish18/Trip-manager/pull/9) |
| M9 | Offline hardening | ✅ Done | [#10](https://github.com/iamharish18/Trip-manager/pull/10) |
| M10 | PDF export and trip deletion | 🧪 Built, needs new build on phones | — |
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

### M5 — Joining and leaving
- **No subscription, ever:** Firebase stays on the free Spark plan, so there are no Cloud Functions. Joining and leaving are transactions checked by security rules; M7 and M8 use the same approach (see SPEC §14).
- Anyone with the Trip ID can join an Active trip: claim an unclaimed name, or **add themselves** if not on the list (same name rules, 20-person limit).
- Anyone with the Trip ID can see the trip's preview (name, dates, names); expenses stay members-only.
- Joining and leaving need internet. Testing uses two phones.
- Join-by-link postponed to M11.

### M6 — Comments
- Up to 300 characters; delete your own after a confirmation; no editing.
- Times: "9:42 pm", "Yesterday, 9:42 pm", "14 Dec, 9:42 pm".
- Offline comments show "Sending…" until synced; counts show on the Expenses list.
- Stored in one comments list per trip (not inside each expense), so counts need a single listener.

### M7 — Notifications
- Free plan: the phone that adds an expense sends the push via Expo's push service; no server.
- Push addresses are stored per trip (`pushTokens`), visible only to that trip's members.
- Each expense notifies at most once (`notifyPending`); missed ones are sent the next time the adder opens the app online.
- **On by default:** Android's permission prompt appears right after login (no in-app card). Account has an on/off switch; tap opens the expense; banners show while the app is open.
- **Needs a new dev build** (expo-notifications) and **FCM V1 credentials uploaded to EAS** (one-time; see "Push notification credentials" below).

### M8 — Close, reopen and settle up
- Free plan: the creator's phone closes the trip and writes settlements in one write, then double-checks; the 24-hour reopen window is enforced by rules using the server clock.
- If the 24 hours run out, whoever opens the trip first finalises it.
- Close, final close and reopen notify everyone (personalised "You owe…" messages); tap opens Balances.
- Paid can be undone by the same people; "Everyone's settled up" when there's nothing to pay.

### M9 — Offline hardening
- Offline status comes from Firestore itself (no new build): sync icon in the trip header, offline banner on Home and trip screens.
- Rejected changes are reported while the app is open; after a full restart they can't be (accepted limitation).
- Online-only actions say "needs internet" at once; buttons stay tappable.
- Latest edit wins, no conflict UI.
- expo-doctor reported Expo patch updates; they were applied in M10 together with that milestone's new build.

### M10 — PDF export and trip deletion
- **New dev build** (expo-print, expo-sharing, expo-file-system) that also includes the Expo patch updates.
- PDF: any member, any time; marked "Not final" while open; no comments or per-expense splits; A4.
- Delete: creator only, any status, one strong confirmation, needs internet; members are notified; interrupted deletes resume.

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

## Manual offline checklist (M9)

Run on two phones (A and B) with a shared test trip. "Airplane mode" means Wi-Fi and mobile data off.

| # | Steps | Expected |
|---|---|---|
| 1 | A: airplane mode on, wait 5 s | Offline banner on Home and the trip; header icon ☁✕ "Offline" |
| 2 | A (offline): add an expense, a comment, a category; edit and delete an expense | All appear at once; icon tap says "N changes are saved on this phone…"; the comment shows "Sending…" |
| 3 | A: airplane mode off | Banner disappears; icon goes ☁↑ then ☁✓; B sees all changes; B gets the expense notification |
| 4 | A (offline): Create trip, Join trip, Leave, Close, Reopen | Each says "You're offline. … needs internet." at once |
| 5 | A and B (both offline): edit the same expense differently, then both go online | The later edit wins on both phones |
| 6 | A offline: add an expense. B (creator, online): close the trip. A: back online with the app open | A sees "Your expense "…" wasn't saved: the trip was closed." and the expense disappears |
| 7 | Same as 6, but A fully closes the app before going online | The expense just disappears (accepted limitation) |
| 8 | Log out and back in while offline | Logging in needs internet (Firebase message); staying logged in works offline |

## Deploying security rules

After changing `firebase/firestore.rules` and running `npm run test:rules`:

```bash
firebase deploy --only firestore:rules --project trip-manager-a75e6
```

## Push notification credentials (one-time, M7)

Android notifications go through Firebase Cloud Messaging (free on the Spark plan). Expo needs a Firebase service-account key to send them:

1. Firebase console → ⚙ **Project settings** → **Service accounts** → **Generate new private key** → **Generate key**. A JSON file downloads. It is a **secret**: never commit it or share it.
2. Upload it on **expo.dev** → project **trip-manager** → **Credentials** → **Android** → `com.iamharish18.tripmanager` → **FCM V1 service account key** → **Add a service account key** → upload → **Save**.
3. Delete the downloaded file from your computer afterwards (Expo keeps it).

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
