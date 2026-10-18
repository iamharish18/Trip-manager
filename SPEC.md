# Trip Manager — Specification v1

> **Status:** Approved. Build order is in [BUILD_PLAN.md](BUILD_PLAN.md).
> **Last updated:** 2026-10-17

A mobile app where a group tracks shared trip expenses. One person creates a trip and adds friends by name. Everyone's expenses are recorded and split equally. When the trip closes, the app tells each person exactly whom to pay.

---

## 1. Scope

### In scope (v1)
- Trips with name-only participants who can later claim their spot via a Trip ID
- Expenses split equally, in INR whole rupees
- Live per-person balances and category breakdown (default + custom categories)
- Comments on expenses
- Push notifications for new expenses
- Offline-first with automatic sync
- Close / reopen-once trip lifecycle
- Simplified settlements with Paid / Not Paid tracking
- PDF export

### Out of scope (v1)
- Unequal splits (exact amounts, percentages, shares)
- Multiple payers per expense
- Multi-currency
- Budget and budget alerts
- Receipt photos
- Notifications for anything other than new expenses
- Email verification
- Deleting your account

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| App | React Native (Expo **development build**), JavaScript | Known language; one codebase for Android + iOS. Android first. |
| Firebase SDK | **React Native Firebase** (`@react-native-firebase/*`) | Native SDK: offline data survives app restarts (the Firebase JS SDK keeps it in memory only). Requires a dev build, not Expo Go. |
| Auth | Firebase Auth (email/password) | Simple, free |
| Database | Cloud Firestore | Built-in offline cache and auto-sync |
| Testing | Jest (logic), Firebase Emulator (security rules & functions) | Correctness of money logic and permissions |
| Server logic | Firebase Cloud Functions | Notifications, 24h auto-close, settlement generation |
| Notifications | Expo Push Notifications | Simplest option with Expo |
| PDF | expo-print + expo-sharing | HTML → PDF, then share |

**Cost note:** Cloud Functions require the Firebase **Blaze (pay-as-you-go)** plan, so a card must be added. Expected cost at this scale is ₹0.

---

## 3. Roles

| Role | Description |
|---|---|
| **Creator** | User who created the trip. Has all member rights plus admin actions. Cannot leave the trip (can only delete it). |
| **Member** | A participant who has claimed a name with their account. |
| **Placeholder** | A name-only participant without an account (never claimed, or the member left). |

### 3.1 Accounts
- **Sign up:** name (1–40 characters), email and password (at least 8 characters). No email verification; new users go straight into the app.
- **Log in / log out:** email and password. The session is remembered on the phone, so the app opens straight to Home, even offline.
- **Forgot password:** Firebase emails a reset link. The confirmation never reveals whether an email has an account.
- **Profile:** `users/{uid}` holds name, email and createdAt. Users can edit their own name; email and createdAt never change. Users can read and write only their own profile.
- The account name is separate from the name a user claims on each trip.
- Signing up, logging in and resetting a password require internet.

---

## 4. Trip Lifecycle

```
ACTIVE ──(creator closes)──► CLOSED ──(creator reopens, once)──► REOPENED ──(creator closes OR 24h elapse)──► FINAL
```

| Capability | Active | Closed | Reopened (≤24h) | Final |
|---|---|---|---|---|
| Add / edit / delete expenses | ✅ | ❌ | ✅ | ❌ |
| Add comments | ✅ | ❌ | ✅ | ❌ |
| Delete own comment | ✅ | ❌ | ✅ | ❌ |
| Claim a spot via Trip ID | ✅ | ❌ | ❌ | ❌ |
| Add / rename participants | ✅ | ❌ | ✅ | ❌ |
| Member leaves trip | ✅ | ❌ | ❌ | ❌ |
| Live balances & category breakdown | ✅ | ✅ | ✅ | ✅ |
| Settlement screen + Paid / Not Paid | ❌ | ✅ | ❌ | ✅ |
| PDF export | ❌ | ✅ | ❌ | ✅ |
| Reopen | — | ✅ (once) | — | ❌ |

### Rules
- Only the **creator** can close and reopen.
- **Closing requires an internet connection** (prevents a close made offline from conflicting with friends' unsynced expenses).
- The **Trip ID is created with the trip and expires on the first close**. It never becomes valid again, including during the reopen window.
- A trip can be **reopened only once**. A server job **auto-closes it 24 hours after reopening** if the creator hasn't closed it already. That close is final.
- Any offline change that reaches the server after the trip is locked is **rejected**, and the app shows: *"Trip is closed — this change was not saved."*

---

## 5. Participants

### Trips
- **Creating a trip:** name (1–60 characters), a required **start date**, an optional **end date** (on or after the start date), and the participants' names. The creator is added automatically using their account name. **Requires internet**, because the Trip ID is reserved on the server.
- **Trip ID:** 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no look-alikes such as 0/O or 1/I/L). Each code is reserved once in `joinCodes/{code}`; on a clash the app picks another.
- **Editing:** only the creator can edit the trip name and dates.
- **Dates display:** "From 12 Dec 2026" without an end date; "12 – 16 Dec 2026" with one.

### People on a trip
- The creator adds participants by name at trip creation or later, while the trip is Active or Reopened.
- Names are **unique within a trip, ignoring capitals** ("rahul" = "Rahul"), 1–40 characters each, at most **20 people** per trip.
- Only the creator can add, rename and remove participants. The creator can rename themselves; the creator's own participant cannot be removed.
- **Claiming:** a user signs up, enters the Trip ID, and picks an unclaimed name. That name is linked to their account, and all past expenses under that name are now theirs.
- The creator can **rename** any participant.
- The creator can **remove** a participant only if that participant is not part of any expense (as payer or in a split).
- Names never claimed before close stay as placeholders permanently.

### Leaving a trip
- A member (not the creator) can leave a trip **only while it is Active**. Leaving is not allowed once the trip has been closed (including during the reopen window).
- On leaving, the member **loses access** to the trip and stops receiving notifications.
- Their **name stays on the trip** as a placeholder participant:
  - it remains in all past expenses, splits, balances, settlements and the PDF
  - **new expenses are still split with them**, because they are still a participant
- Their name becomes **unclaimed** again. While the Trip ID is valid (until the first close), they can rejoin with the Trip ID and claim their name again. Like any unclaimed name, it can be claimed by whoever claims it first.

---

## 6. Expenses

| Field | Rules |
|---|---|
| Amount | Whole rupees, ₹1 to ₹10,00,000 |
| Paid by | Exactly one participant (claimed or placeholder), who must be in the expense's split |
| Category | A default category or one of the trip's custom categories |
| Date | Any date; defaults to today |
| Description | Optional, up to 100 characters. When empty, lists show the category name |

- **Who can add / edit / delete:** the creator and any claimed member, only while the trip is Active or Reopened.
- **Split:** equally among the participants on the trip **at the moment the expense is created**. This list is saved with the expense and does not change when participants are added later.
- **Editing:** amount, category, description and date can change; "Paid by" can change to anyone within that expense's split; the split list never changes.
- **Conflicts:** the latest edit wins.
- **Deletion:** a soft delete internally (`isDeleted = true`), so an offline delete and an offline edit resolve cleanly. To the user the expense simply disappears. An **Undo** message appears for about 5 seconds.
- **Offline:** adding, editing and deleting expenses works offline and syncs later.
- **Removing a person** (SPEC §5) is blocked while they paid for or share in any non-deleted expense.
- **Your position** ("You're owed ₹X" / "You owe ₹X") is shown on the Expenses tab.

### Rounding rule
All amounts are whole rupees; no decimals are shown anywhere.

```
base      = floor(amount / n)
remainder = amount − base × n
Each non-payer's share = base
Payer's share          = base + remainder
```

*Example:* ₹100 paid by Priya, split among Priya, Rahul and Amit → Priya ₹34, Rahul ₹33, Amit ₹33.

---

## 7. Categories

- **Default categories:** Food · Stay · Travel · Activities · Shopping · Other
- The creator or any member can **add custom categories** to a trip (while it is Active or Reopened).
- Custom categories are **per trip**.
- A custom category can be deleted only if no expense uses it. Default categories cannot be deleted.
- **Custom category names:** 1–20 characters, unique ignoring capitals, and different from the default names.
- Custom categories are added from the "+ New" chip on Add expense or from Trip settings → Categories, and deleted only from Trip settings → Categories. They use a generic tag icon and the next colour from a fixed palette.
- **Storage:** default categories are defined in the app's code with fixed IDs (`food`, `stay`, `travel`, `activities`, `shopping`, `other`); only custom categories are stored, in `trips/{tripId}/categories`.

---

## 8. Balances (visible at all times)

For each participant:

```
Paid  = sum of amounts of expenses they paid
Share = sum of their split shares across all expenses
Net   = Paid − Share + PaymentsMade − PaymentsReceived
```

- **Net > 0** → others owe this person
- **Net < 0** → this person owes others

`PaymentsMade` / `PaymentsReceived` come from settlements marked Paid (see §9). They are zero until the trip is closed for the first time.

Each user sees their own position prominently on the trip dashboard, e.g. *"You are owed ₹800"* / *"You owe ₹300"*.

---

## 9. Settlements

### Debt simplification
Settlement suggestions are generated by a greedy algorithm:
1. Take each participant's Net balance.
2. Repeatedly match the person owed the most with the person who owes the most, and create a payment for the smaller of the two amounts.
3. Repeat until everyone is at 0.

This gives at most *n − 1* payments, all in whole rupees.

### Marking as Paid
A settlement can be toggled Paid / Not Paid by:
- the **payer**
- the **receiver**
- the **creator**, for any settlement (needed when a party is an unclaimed placeholder)

### Close → Reopen → Final close (Option B: recorded payments)
1. **First close:** settlements are generated from Net balances.
2. During **Closed**, people mark settlements Paid.
3. **Reopen:** the settlement screen is hidden. Settlements already marked **Paid** become **Recorded Payments**: real money that changed hands, still counted in everyone's Net. Unpaid settlements are discarded.
4. **Final close:** new settlement suggestions are generated from the updated Net balances, which include recorded payments. A recorded payment may even lead to a reverse payment if expenses were removed.
5. In **Final**, the settlement screen shows:
   - **Earlier payments** (Recorded Payments, read-only)
   - **Remaining settlements**, each with a Paid / Not Paid toggle

Example:
- First close: Rahul → Priya ₹1,000. Rahul marks it Paid.
- Reopen: a new ₹300 expense paid by Priya, split 3 ways (Rahul's share ₹100).
- Final close: Earlier payment *Rahul → Priya ₹1,000 (paid)*; remaining *Rahul → Priya ₹100*.

---

## 10. Comments

- The creator and members can comment on any expense while the trip is Active or Reopened.
- Comments cannot be edited.
- Only the **author** can delete their own comment, and only while the trip is Active or Reopened.
- Once closed, comments are read-only.

---

## 11. Notifications

- Sent **only when a new expense is added**.
- Recipients: all claimed members of the trip **except** the person who added it (and except members who have left).
- Example text: *"Rahul added ₹1,200 · Dinner at Fisherman's Wharf (Food)"*
- An expense added offline triggers its notification when it syncs.
- Implemented with a Cloud Function triggered when a Firestore expense document is created.

---

## 12. Offline & Sync

- Firestore offline persistence is enabled: all reads come from the local cache and writes are queued.
- Queued writes sync automatically when the connection returns.
- The dashboard shows a **sync indicator**: Online · Offline · Pending changes.
- Conflicting edits: latest edit wins.
- Writes rejected by the server (trip locked) show a clear message to the user.
- Actions that **require being online:** sign up / log in, create trip, join trip (claim), close trip, reopen trip, delete trip.

---

## 13. Trip Deletion & Leaving

- Only the **creator** can delete a trip. This permanently deletes all of its data (participants, expenses, comments, categories, settlements) after a confirmation dialog.
- A member can leave a trip while it is Active (§5). The creator cannot leave.

---

## 14. Data Model (Firestore)

```
users/{uid}
  name, email, pushToken, createdAt

joinCodes/{code}
  tripId                // reserved once, never changed

trips/{tripId}
  name
  startDate, endDate    // "YYYY-MM-DD" strings; endDate may be null
  creatorUid, createdAt
  joinCode              // short shareable code, e.g. "GQA7K2"; invalid after first close
  status                // active | closed | reopened | final
  reopenUsed            // bool
  reopenedAt, closedAt
  memberUids[]          // current members (for security rules & queries)

trips/{tripId}/participants/{pid}
  name
  claimedByUid          // null = placeholder
  leftAt                // set if member left
  addedAt

trips/{tripId}/categories/{cid}     // custom categories only
  name, createdByUid

trips/{tripId}/expenses/{eid}
  amount                // integer rupees
  paidByPid
  categoryId
  date, description
  splitAmongPids[]      // snapshot at creation
  createdByUid, createdAt, updatedAt
  isDeleted

trips/{tripId}/expenses/{eid}/comments/{cmid}
  text, authorUid, createdAt

trips/{tripId}/settlements/{sid}
  fromPid, toPid, amount
  round                 // 1 = first close, 2 = final close
  isPaid
  isRecordedPayment     // true once carried over through a reopen (read-only)
  markedByUid, markedAt
```

**Firestore Security Rules** enforce: only members can read or write; edits are blocked unless the status is active/reopened; only the creator can close, reopen, delete or remove participants; only the payer, the receiver or the creator can mark a settlement Paid; only the author can delete a comment.

### Cloud Functions
| Function | Trigger | Purpose |
|---|---|---|
| `onExpenseCreated` | Firestore create | Send push notifications |
| `closeTrip` | Callable (creator) | Lock trip, expire joinCode, generate settlements |
| `reopenTrip` | Callable (creator) | Convert paid settlements to recorded payments, discard unpaid, set `reopenedAt` |
| `autoCloseReopened` | Scheduled (e.g. every 15 min) | Final-close trips reopened more than 24h ago |
| `joinTrip` | Callable | Validate joinCode, claim a participant |
| `deleteTrip` | Callable (creator) | Recursively delete all trip data |

---

## 15. UI & Design

### 15.1 Visual style
- **Clean and minimal:** flat surfaces, thin borders, no shadows or gradients, generous spacing.
- **Component library:** React Native Paper (Material Design 3), themed with the colors below.
- **Light and dark mode:** follows the phone's system setting.
- **Language:** English only.

### 15.2 Colors

| Token | Light | Dark | Used for |
|---|---|---|---|
| Primary (teal) | `#0F766E` | `#2DD4BF` | Buttons, active tab, links, selected chips |
| Primary tint | `#E6F6F4` | `#123532` | Summary cards, icon backgrounds |
| Text on primary | `#FFFFFF` | `#0B1120` | Text on teal buttons |
| Positive (owed to you) | `#15803D` | `#4ADE80` | Positive balances, amounts you receive, "Joined" |
| Negative (you owe) | `#B91C1C` | `#F87171` | Negative balances, amounts you pay, destructive actions |
| Background | `#F8FAFC` | `#0B1120` | Screen background |
| Card | `#FFFFFF` | `#151C2C` | Cards, inputs |
| Text | `#0F172A` | `#E2E8F0` | Primary text |
| Muted text | `#64748B` | `#94A3B8` | Secondary text, labels |
| Border | `#E2E8F0` | `#253047` | Card and input borders |

- Money amounts are colored **from the viewer's point of view**: green if they receive it, red if they pay it.
- **Category chart colors:** each category gets a fixed, distinct color (default categories have preset colors; custom categories take the next color from a fixed list).
- **Avatars:** a colored circle with the person's initial. The color comes from the name, so the same person always has the same color.

### 15.3 Formats
- **Currency:** ₹ with Indian grouping and no decimals: `₹1,00,000`, `₹27,600`, `−₹900`, `+₹11,100`.
- **Dates:** `17 Oct 2026`; the expense list groups by day with "Today" / "Yesterday" for recent days.
- **Times** (comments): `9:42 pm`.

### 15.4 Navigation

```
Auth stack (logged out)
  Log in ⇄ Sign up

App stack (logged in)
  Home (your trips)
  ├── Create trip
  ├── Join trip
  └── Trip (bottom tabs)
        ├── Expenses ── + Add expense (floating button)
        │       └── Expense detail ── Edit expense
        ├── Balances   (Settle up section when Closed / Final)
        ├── Insights   (category breakdown)
        └── Members
      ⚙ Trip settings (top-right) ── Categories, Edit name and dates
      📄 Export PDF (top-right, Closed / Final only)
```

A **sync indicator** sits in the trip's top bar: synced (cloud with check), offline (cloud off), pending changes (cloud with arrow).

### 15.5 Screens

| # | Screen | Contents |
|---|---|---|
| 1 | **Log in / Sign up** | App logo; email, password with show/hide (+ name on sign up); switch link between the two; "Forgot password?" link on Log in. Errors shown under the field they belong to |
| 1a | **Forgot password** | Email field, "Send reset link", neutral confirmation, back to Log in |
| 2 | **Home** | Trip cards: icon, name, dates, number of people, status badge (Active / Reopened / Closed), total, your balance. Avatar (top right) opens Account. Buttons: Create trip, Join trip |
| 2a | **Account** | Initial avatar, name (editable), email, note that trip names are set per trip, Log out |
| 3 | **Create trip** | Name, start and end dates, participant list (creator added automatically as "You"), "Add a name" field |
| 4 | **Join trip** | Trip ID field → trip preview (name, creator, dates) → "Which one is you?" list. Claimed names greyed out as "Already joined". Button: "Join as {name}" |
| 5 | **Expenses tab** | Summary card (total spent, your position); expenses grouped by date with category icon, description, who paid, comment count, amount; floating + button (hidden when locked) |
| 6 | **Add / Edit expense** | Large amount with number keypad; "Paid by" chips (defaults to You); category chips with "+ New"; description (optional); date (defaults to today); "Split equally among N · ₹X each" preview; Save button |
| 7 | **Expense detail** | Icon, description, category, date, payer, amount; split list; comments with author, time and text; comment box. Edit / delete icons and comment box shown only when not locked; comment delete icon only on your own comments |
| 8 | **Balances tab** | Your position card; each person with avatar, Paid / Share and Net (green / red); "not joined" label on placeholders. Order: you first, then most owed to most owing. With no expenses: everyone at ₹0 and "Add expenses to see balances". While active: note that settle-up appears on close |
| 9 | **Balances tab: Settle up** (Closed / Final) | "Trip closed" banner; progress ("1 of 3 paid"); each payment "A pays B ₹X" with Mark paid / Paid toggle; Earlier payments section (Final, after a reopen) |
| 10 | **Insights tab** | Donut chart (react-native-svg) with total in the centre; categories with color, whole-number percentage (always adding up to 100%) and amount, largest first. With no expenses: "No spending yet" |
| 11 | **Members tab** | Trip ID card with copy and share (hidden after close, with "Expires when the trip is closed" note); each person with avatar and status (Creator / Joined / Not joined yet / Left the trip); ⋮ menu: Rename, Remove (creator only); "Add person" button |
| 12 | **Trip settings** | Edit name and dates; Categories; Export PDF (enabled when closed). Creator: Close trip (with explanation) / Reopen once for 24 hours / Delete trip (red, with confirmation). Member: Leave trip (Active only) |
| 13 | **Categories** | Default and custom categories; add custom; delete custom if unused |
| 14 | **PDF export** | Trip summary, all expenses, category breakdown, balances, settlements with paid status; shared via the phone's share sheet |

### 15.6 Empty and locked states
- **No trips:** an invitation to create or join a trip.
- **No expenses:** an invitation to add the first expense, pointing to the + button.
- **Locked trip:** a "Trip closed" banner; add, edit, delete and comment controls are hidden.
- **Reopened trip:** a banner showing the time left before it closes automatically.

---

## 16. Open Questions

None. All questions are resolved.
