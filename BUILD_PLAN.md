# Trip Manager — Build Plan

> Implements [SPEC.md](SPEC.md). Each milestone ends with a working app on the Android phone and a merged PR.

## Working agreement

- **Roles:** Claude writes the code and explains it; the developer reviews and tests each milestone on their Android phone before it is merged.
- **Git:** one branch and one PR per milestone (`m0-setup`, `m1-auth`, …), merged into `main` after review.
- **Platform:** Android first (on Windows; iOS needs a Mac and an Apple developer account). The code stays cross-platform.
- **Testing:** an Android phone plus the Android emulator, which act as two users from M5 onward.

## Principles

1. **Value early:** a single-user app that tracks expenses comes first, then multi-user features, then the trip lifecycle.
2. **Logic separate from UI:** splitting, rounding, balances and debt simplification are pure JS functions covered by Jest unit tests.
3. **Security rules are built with each feature,** tested on the Firebase Emulator, not left to the end.
4. **Each milestone is shippable:** the app builds and runs at the end of every milestone.

---

## Milestones

### M0 — Setup
- Install: Node LTS, Git, Java JDK 17, Android Studio + emulator, Expo account + EAS CLI, Firebase CLI
- Create a Firebase project (Auth + Firestore) and register the Android app (`google-services.json`)
- Create the Expo project with React Native Firebase, then build and install the dev build on the phone
- Folder structure, ESLint/Prettier, Jest, Firebase Emulator config

**Done when:** the app opens on the phone and reads a test value from Firestore.

### M1 — Authentication & Home
- Sign up / log in (email + password), log out, user profile document
- Empty Home screen; session persists across restarts

**Done when:** you can sign up, close the app, reopen it and still be logged in.

### M2 — Trips & Participants
- Create a trip (name, dates, participant names) and generate the join code
- Trip list on Home
- Participants screen: add, rename, remove (blocked if the participant is in an expense)
- Default categories created with the trip

**Done when:** you can create a trip and manage its participants.

### M3 — Expenses & Core Logic ⭐
- Logic module + tests: equal split with the payer absorbing the remainder, balances, category totals
- Add / edit / soft-delete expenses
- Custom categories (add; delete only if unused)
- Expense list on the trip dashboard

**Done when:** you can record expenses and all unit tests pass.

### M4 — Balances & Insights
- Dashboard: total spent, "you owe / you are owed"
- Balances screen (Paid / Share / Net)
- Category breakdown pie chart

**Done when:** you can track a whole trip as a single user.

### M5 — Multi-user: Join, Claim, Leave
- Switch the Firebase project to the **Blaze** plan
- Cloud Function `joinTrip`; Join Trip screen; claiming a name
- Leave trip (Active only; name stays, becomes unclaimed, can be re-claimed)
- `memberUids`; Firestore security rules for membership and permissions

**Done when:** two accounts (phone + emulator) see and edit the same trip.

### M6 — Comments
- Comments on Expense Detail; authors delete their own

**Done when:** both users can comment and authors can delete their own comments.

### M7 — Notifications
- Store Expo push tokens; Cloud Function `onExpenseCreated`

**Done when:** adding an expense on one device sends a notification to the other.

### M8 — Trip Lifecycle & Settlements ⭐
- Debt simplification logic + tests, including recorded payments after a reopen
- Cloud Functions `closeTrip`, `reopenTrip`, `autoCloseReopened`
- Settlement screen with Paid / Not Paid toggles (payer, receiver, creator)
- Locking enforced in both the UI and the security rules

**Done when:** close → reopen → final close works end to end with correct amounts.

### M9 — Offline Hardening
- Sync indicator (Online / Offline / Pending)
- "Trip is closed — this change was not saved" for rejected writes
- Online-only actions guarded
- Test scenarios: airplane mode, conflicting edits, an expense synced after close

**Done when:** all offline scenarios behave as described in SPEC §12.

### M10 — PDF Export & Trip Deletion
- PDF trip summary (expenses, categories, balances, settlements) and sharing
- Cloud Function `deleteTrip`

**Done when:** a closed trip exports to a PDF that can be shared, and the creator can delete a trip.

### M11 — Polish & Release
- Empty, loading and error states; input validation
- App icon and splash screen; a release APK to install on friends' phones

**Done when:** a release APK installs on another phone and handles the main flows cleanly.

---

## Why this order

- **M3 and M8** contain the risky money logic, and both start with tested pure functions.
- Cloud Functions (and the Blaze plan) aren't needed until **M5**, so early setup stays light.
- Firestore syncs offline from day one, so **M9** handles only edge cases and user-facing messages. These depend on trip locking (M8).
