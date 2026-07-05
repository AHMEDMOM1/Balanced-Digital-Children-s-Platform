# Screen Inventory — SafePlay Timer

Every interface in the app, organized by user role. File paths are relative to the project root.

---

## 1. Entry Point

### 1.1 Reception Screen
**File:** `app/index.tsx`

The first screen any user sees. It renders a lavender-to-warm-peach gradient background with three decorative floating glow blobs. A circular mascot image occupies the visual center, flanked by two floating icon badges (a gold star top-right, a purple car bottom-left). Below the mascot is a large 3D "Start Playing" button (purple, with a bottom border-shadow to simulate depth) and a quieter "Parent Login" text link at the bottom.

**Behavior:**
- Tapping "Start Playing" routes directly to the child interface (`/(child)`). If a PIN has already been configured (`isPinSetup === true` in `useSettingsStore`), it first displays the PIN verification modal; on success it navigates to the child zone.
- Tapping "Parent Login" checks authentication state. If the parent is already authenticated and has a PIN set, it shows the PIN modal then routes to `/(parent)`. If authenticated but no PIN exists, it routes to PIN setup (`/auth/setup-pin`). If not authenticated, it routes to the login screen (`/auth/login`).

---

## 2. Authentication Flow

### 2.1 Parent Login
**File:** `app/auth/login.tsx`

A two-step email OTP screen used by returning parents. The screen is divided into a header area (shield icon, app title "SafePlay Timer", descriptive subtitle) and a white card labelled "Parent Authorization".

**Step 1 — Email:** A single text input accepts the parent's email address. Tapping "Send Verification Code" calls `auth.sendOtp()` and advances to Step 2.

**Step 2 — Code:** A numeric input (max 8 digits) accepts the OTP from the parent's email. Tapping "Confirm & Log In" calls `auth.verifyOtp()`. On success, it checks whether a PIN is already configured: if not, it redirects to `/auth/setup-pin`; if yes, it redirects to the parent dashboard `/(parent)`. A "Change email address" link returns to Step 1.

Errors from either API call are displayed in a red banner beneath the card title.

### 2.2 Family Registration
**File:** `app/auth/register.tsx`

A two-step registration screen for new families. Structurally identical to the login screen but collects additional data.

**Step 1 — Details:** Two inputs — Parent Full Name and Email Address — both required. Tapping "Register with OTP" calls `supabase.auth.signInWithOtp()` with `shouldCreateUser: true` and the parent's name stored in user metadata.

**Step 2 — Verification:** A numeric OTP input accepts the code sent to the provided email. Tapping "Verify & Create Profile" calls `auth.verifyOtp()`. On success, navigation follows the same PIN-check logic as the login screen.

A back-arrow button in the top-left returns to the previous screen at any point.

### 2.3 PIN Setup
**File:** `app/auth/setup-pin.tsx`

A mandatory screen that forces the parent to create a 4-digit PIN before entering the parent dashboard for the first time. Android hardware back is intercepted to prevent bypassing this step.

The screen shows two rows of four digit-boxes ("New PIN" and "Confirm New PIN"), only one active at a time (the inactive row is dimmed). Below is a 3×4 numeric keypad with a backspace key and a "Next" key. Entering 4 digits and pressing "Next" advances from the "new" step to the "confirm" step. On the confirm step, pressing "Next" compares the two PINs: a match calls `setPinCode()` (which sets `isPinSetup = true` in the store) and navigates to `/(parent)`; a mismatch clears the confirm field and shows the error "PINs do not match".

### 2.4 Child Device Linking
**File:** `app/auth/join.tsx`

Used on a child's device to link it to the parent's family account. Displays a friendly header (smiley face icon, "Welcome!" title) and a form with three fields:

- **Family Code:** A large, centred, dashed-border text input (uppercase, max 6 characters) for the 6-character alphanumeric code generated on the parent side.
- **Child's Full Name:** A standard text input.
- **Age Group:** Three chip buttons for "2-4 years", "5-7 years", and "8-10 years" — exactly one must be selected.

Tapping "Link Device" calls `redeem(familyCode, childName, ageGroup)` which creates the child profile in Supabase and links the device to the family. On success it navigates to the child home screen `/(child)`.

### 2.5 PIN Recovery
**File:** `app/auth/forgot-pin.tsx`

A four-step sequential flow for resetting a forgotten parent PIN, implemented via `pinRecoveryManager`.

**Step 1 — Email:** Accepts the registered email address and sends a recovery token via `pinRecoveryManager.attempt()` / `generateToken()`.

**Step 2 — Verification:** Accepts the recovery code from the email. `pinRecoveryManager.verifyEmail()` validates it; success advances to the security question step.

**Step 3 — Security Question:** Displays the hard-coded question "What is your favorite pet's name?" and accepts the answer. `pinRecoveryManager.verifySecurityQuestion()` validates it; success advances to new PIN entry.

**Step 4 — New PIN:** Two secure text inputs (max 6 digits each) accept and confirm the new PIN. `pinRecoveryManager.resetPin()` commits the change and redirects to `/auth/login`.

A back-arrow button is present throughout and an error banner displays inline above the active step's form.

---

## 3. Child Interface

### 3.1 Child Layout & Guards
**File:** `app/(child)/_layout.tsx`

Not a visible screen — a stack layout that wraps all child-zone screens. It enforces category access guards (redirecting to the Blocked screen if a content category is disabled), subscribes to realtime session commands from the parent (pause/resume/time updates), and mounts the `PauseOverlay` and `SessionOverlay` as persistent layers over all child screens.

### 3.2 Child Home
**File:** `app/(child)/index.tsx`

The activity picker — the main screen a child sees after entering the child zone. A lavender-to-gold gradient background. At the top is the shared `Header` component (which includes a lock icon to trigger the exit PIN flow). Below is an offline status badge, a possible time-drift warning banner, and a greeting ("Hi Leo!") with subtitle.

A pill-shaped time indicator shows the remaining time in the current session (calculated as daily limit ÷ sessions-per-day minus elapsed seconds).

Below the pill is a vertical grid of large, rounded activity cards, one per enabled content type:
- **Stories** (purple, book icon)
- **Games** (red, puzzle icon)
- **Create** (gold, palette icon)
- **Videos** (dark, play-circle icon)

Cards for disabled content types are hidden entirely (not greyed out). Tapping a card navigates to the corresponding content gallery. A `PinLock` modal is layered over this screen; when unlocked successfully, it routes back to the entry screen `/`.

### 3.3 Blocked Screen
**File:** `app/(child)/blocked.tsx`

Displayed when a child attempts to access a content category that has been disabled by the parent. Shows a large tree emoji, the Arabic text "اذهب العب في الخارج!" (Go play outside!), and a subtitle stating the section was disabled by a parent. A yellow rounded button labelled "العودة للرئيسية" (Back to Home) routes to `/(child)/`. Text direction is handled via `getBiDiStyle`/`isArabic` utilities for proper RTL rendering.

### 3.4 Story Library
**File:** `app/(child)/stories.tsx`

A gallery grid of available stories fetched from Supabase. Uses the child visual style (gradient background, floating glow blobs). Each story is shown as a card with a title and cover image (or placeholder color). Tapping a card navigates to `/(child)/story/[id]`.

### 3.5 Story Viewer
**File:** `app/(child)/story/[id].tsx`

An interactive story reader. Displays the story page by page with a large illustration/color area, the story text for the current page, and navigation buttons (previous / next). Progress is shown as a row of dots at the bottom. An audio button is present (for text-to-speech or audio narration). On reaching the final page, a completion interaction is shown before the child can return to the library.

### 3.6 Games Gallery
**File:** `app/(child)/games.tsx`

A bento-style grid layout showing available mini-games fetched from Supabase. Each cell shows the game title, a representative icon/image, and a category tag. Tapping a game navigates to `/(child)/game/[id]`.

### 3.7 Game Player
**File:** `app/(child)/game/[id].tsx`

The in-game screen. Supports at least two game types:

- **Counting games:** The child is shown a quantity of objects and must tap the correct number from a set of answer choices.
- **Matching games:** The child must pair items (e.g., match images to their labels) by tapping.

A win screen overlay is shown when the child completes the game, with a celebratory animation and a "Play Again" or "Back" option.

### 3.8 Video Gallery
**File:** `app/(child)/videos.tsx`

A scrollable list or grid of video items fetched from Supabase. Each item shows a thumbnail with a play-icon overlay, a title, and a duration badge. Tapping an item navigates to `/(child)/video/[id]`.

### 3.9 Video Player
**File:** `app/(child)/video/[id].tsx`

A video playback screen. Displays the video title, a thumbnail (or embedded video player), a description, and a list of related videos below. The player includes standard playback controls.

### 3.10 Creative Activity Picker
**File:** `app/(child)/creative.tsx`

A menu screen presenting four distinct creative sub-activities as large icon cards:
- **Magic Canvas** → `/(child)/creative-canvas`
- **Build-a-Bot** → `/(child)/creative-bot`
- **Sticker World** → `/(child)/creative-stickers`
- **Story Creator** → `/(child)/creative-story`

### 3.11 Drawing Canvas
**File:** `app/(child)/creative-canvas.tsx`

A free-form drawing activity. The main area is a touch canvas where the child can draw using finger strokes. At the bottom are: a horizontal color palette (preset colors, selectable by tap) and a stroke-width selector (thin/medium/thick). A clear button resets the canvas.

### 3.12 Build-a-Bot
**File:** `app/(child)/creative-bot.tsx`

A drag-and-drop robot assembly activity. The child drags body part components (head, torso, arms, legs) from a parts tray onto a robot silhouette. Parts snap into designated slots. The completed robot can be displayed in a "reveal" animation.

### 3.13 Sticker Scene Decorator
**File:** `app/(child)/creative-stickers.tsx`

A scene-decoration activity. The child selects a background scene (Forest, Ocean, Space, or Garden) and then places stickers from a themed palette onto the scene by tapping. Stickers can be repositioned. The completed scene can be saved or shared.

### 3.14 AI Story Generator
**File:** `app/(child)/creative-story.tsx`

An AI-assisted story creation activity. The child selects keywords or themes (e.g., character types, settings, moods) from a set of chips. Tapping "Generate Story" sends the selected keywords to a backend endpoint and returns a short illustrated story. The screen supports bilingual output (uses the `bidi` utilities for RTL support in Arabic text).

---

## 4. Parent Interface

### 4.1 Parent Layout & Navigation
**File:** `app/(parent)/_layout.tsx`

Not a visible screen — a bottom-tab navigator with four tabs: Home, Reports, Control, and Settings. Each tab has an icon and label. The layout is wrapped in the parent authentication guard.

### 4.2 Parent Dashboard (Home)
**File:** `app/(parent)/index.tsx`

The parent's primary overview screen. Divided into:

**Welcome section:** Greeting "Good morning, Alex" with subtitle identifying the monitored device.

**Time Today card:** Large bordered card showing minutes used out of the daily limit as a large numeric display (e.g., "23 / 60 min") plus a horizontal progress bar that fills proportionally.

**Secondary stat cards (row):** Two smaller cards showing "Sessions Left" (remaining session count) and "Last App" (most recently used content category).

**Quick Actions:** Three buttons —
  - "Pause Session" / "Resume Session" (primary, purple) — toggles `isPaused` in `useSessionStore` immediately.
  - "View Reports" (secondary) — navigates to `/(parent)/reports`.
  - "Edit Rules" (secondary) — navigates to `/(parent)/control`.

**Recent Activity list:** Two most recent session events (session start / session end), each showing an icon, event title, timestamp, app name, and either an "Active" tag or a duration value.

### 4.3 Reports & Analytics
**File:** `app/(parent)/reports.tsx`

A data-rich analytics screen powered by real Supabase queries via `useDailyStats` and `useLiveTodayStats`.

**Child selector:** Visible only when the account has two or more children; allows switching the report context between children.

**Range picker:** Three pills — Today / Week / Month — switch the data window. When "Today" is selected and the child is active, a green "Live" indicator appears.

**Export button:** Top-right; captures the report view via `captureAndShare()` and shares the result as an image.

**Summary cards:** Two side-by-side cards showing total time and daily average for the selected range (formatted as "Xh Ym" or "Xm").

**Bar chart:** A custom bar chart rendered as `LinearGradient` columns, showing up to 7 data points (days of week or hours) with date labels below each bar.

**Activity breakdown:** Four horizontal progress bars — one per content category (StoryTime, Brain Games, Creative Zone, Videos) — with time values and colour-coded fills representing each category's share of total usage.

**Child comparison:** A toggle button ("Compare Children") appears when there are two or more children. Expanding it renders `ComparisonView` which places both children's stats side by side for the selected range.

### 4.4 Control Center
**File:** `app/(parent)/control.tsx`

The real-time command interface for managing the child's active session.

**Status section:** A live online/offline indicator dot for the child's device, and a prominent Pause/Resume button. The button broadcasts a `pause` or `resume` command via `broadcastCommand()` over the Supabase Realtime channel and simultaneously writes a `realtime_commands` row to the database. The button is disabled if no channel is connected.

**Time & Sessions section:** Three stepper controls (− value +):
  - **Daily Time Limit** — total minutes allowed per day; in steps of 10.
  - **Sessions Per Day** — how many sessions the daily limit is split into; in steps of 10.
  - **Remaining Minutes (Live)** — directly adjusts remaining time on the child's device. A "Send Time Update" button broadcasts a `time_update` command.

**Allowed Content section:** Four toggle switches — Stories, Brain Games, Creative Zone, Videos — connected to `useSettingsStore`. Toggling any switch enables/disables the corresponding section in the child interface.

**Category Preferences section:** Visible when a child profile is loaded. One toggle per content category (Adventure, Educational, Fantasy, Science, Fun, Creative) fetched from Supabase via `useCategoryPreferences`. Each toggle calls `toggleCategory()` locally and broadcasts a `category_block` command over the realtime channel.

An info box at the bottom displays the calculated per-session duration ("A session is X minutes long").

### 4.5 Settings Hub
**File:** `app/(parent)/settings.tsx`

The top-level settings screen. Organised into a scrollable list of grouped sections.

**Profile card:** Avatar circle (initial/icon), display name, email, and an "Edit" pill button that navigates to the profile editor.

**Security section:** Two items —
  - "Change PIN" — shows the current PIN as masked dots and navigates to `/(parent)/settings-pin`.
  - "Biometric Auth" — toggle (currently shows "Enabled", wired to a no-op).

**Preferences section:** Two items —
  - "Notifications" — navigates to `/(parent)/settings-notifications`.
  - "App Language" — shows the current language ("English") and navigates to `/(parent)/settings-language`.

**Support & Legal section:** Three items — "Help & Support", "Privacy Policy", "Terms of Service" — navigating to their respective sub-screens (Terms of Service is a no-op).

**Danger Zone card:** Destructive "Delete Account" action with a clear warning about permanent data loss. The button is styled in error colours.

**Logout button:** Routes back to the entry screen (`/`), effectively ending the parent session.

**Footer:** App version and tagline.

### 4.6 PIN Change
**File:** `app/(parent)/settings-pin.tsx`

A 3-step flow for changing an existing PIN. Step 1 asks for the current PIN (verified against the stored value). Step 2 accepts the new PIN (4 digits). Step 3 confirms the new PIN. Uses the same dot-box UI and numeric keypad as PIN Setup. On success, calls `setPinCode()` in the store and shows a confirmation message.

### 4.7 Notification Preferences
**File:** `app/(parent)/settings-notifications.tsx`

A card of toggle switches controlling which push notifications the parent receives:
- Session Started alerts
- Daily report summaries
- Time-limit warning alerts (e.g., 5 minutes remaining)
- Security alerts (e.g., failed PIN attempts)

Each toggle is stored in `useSettingsStore`. The screen uses the standard parent card layout with dividers between items.

### 4.8 Language Selection
**File:** `app/(parent)/settings-language.tsx`

A simple selection screen listing supported app languages (English, Arabic, Turkish) as radio-button rows. Tapping a row sets the language in the settings store, which affects BiDi text rendering and localised strings throughout the app.

### 4.9 Profile Editor
**File:** `app/(parent)/settings-profile.tsx`

A form for editing the parent's profile. Fields: avatar selector (circular, shows current icon or letter), display name, and email address. Below the parent's own fields is a list of linked child profiles, each showing the child's name, age group, and an arrow to navigate to that child's profile editor (`/(parent)/settings-child-profile`). A Save button commits changes to Supabase.

### 4.10 Child Profile Editor
**File:** `app/(parent)/settings-child-profile.tsx`

A per-child settings screen accessible from the Profile Editor. Displays:
- The child's name (editable) and age group (selector chips).
- A section of content-permission toggles (same four content types as the Control Center) scoped specifically to this child.
- A time limit stepper for this child's daily limit, independent of the global default.

Changes are saved to the child's profile row in Supabase.

### 4.11 Help & Support
**File:** `app/(parent)/settings-help.tsx`

An FAQ and support contact screen. The FAQ items are rendered as an accordion — tapping a question expands its answer inline. Below the FAQ is a "24/7 Support" card with a chat button (links to the support system). At the bottom are text links to the Privacy Policy and Terms of Service sub-screens.

### 4.12 Privacy Policy
**File:** `app/(parent)/settings-privacy.tsx`

A long-form document screen rendering the app's privacy policy as styled text sections. Covers: what data is collected, child privacy practices, how data is used, third-party sharing, and user rights. Sections are separated by headers and body paragraphs. A back arrow in the top bar returns to Settings.

---

## 5. Admin Interface

The admin zone is protected by a role check in `app/(admin)/_layout.tsx` — users without the `admin` role are redirected. The UI uses a dark theme (`#0f0f1a` background) distinct from both the child and parent themes.

### 5.1 Content Dashboard
**File:** `app/(admin)/index.tsx`

The admin home screen for browsing and managing all content items. At the top:
- **Action bar:** "+ New" button (navigates to content creation) and "Categories" button (navigates to category management).
- **Search input:** Dark-styled text field; filters the content list by title with a 300 ms debounce.
- **Type filter chips:** "All", "Video", "Story", "Creative", "Game" — selecting a chip filters the list to that content type and resets to page 1.

The main area is a `FlatList` of content rows, each showing:
- Title (truncated to one line)
- Metadata line: type · category · age range
- Creation date (right-aligned)

Tapping a row navigates to the content edit screen for that item. Below the list is a pagination bar showing "Page X of Y" with Prev/Next buttons.

### 5.2 Category Management
**File:** `app/(admin)/categories.tsx`

A screen for managing the taxonomy of content categories. Displays existing categories as a list with their names and icon URLs. At the top is an "Add Category" form with a name input and an icon URL input. Tapping "Add" calls the admin API to insert a new category row. Each existing category has a delete button (with a confirmation) that removes it from the database.

### 5.3 Content Creation
**File:** `app/(admin)/content-new.tsx`

A full creation form for adding new content items. Fields vary by content type but the common set includes:
- **Title** (text input)
- **Content Type** (selector: video / story / creative / game)
- **Category** (selector from loaded categories)
- **Age Range** (min age / max age numeric inputs)
- **Thumbnail URL** (text input)
- **Description** (multi-line text input)
- Type-specific fields: e.g., video URL for videos, page data for stories, game configuration JSON for games.

Full client-side validation is run before submission. On success, the item is inserted via the admin API and the screen navigates back to the content dashboard.

---

## 6. Full-Screen Overlay Components

These components are not route-level screens but are mounted as persistent layers on top of other screens and occupy the full viewport when active.

### 6.1 PIN Verification Modal
**File:** `components/ui/PinModal.tsx`

A modal overlay triggered at the reception screen when entering either the child or parent zone. Renders a numeric keypad and four dot-boxes. The user enters 4 digits; if the input matches `correctPin` prop, `onSuccess` is called; otherwise the dots shake and reset. Closing the modal without success calls `onClose`.

### 6.2 PIN Lock (Child Exit)
**File:** `components/ui/PinLock.tsx`

An overlay mounted inside the child layout that blocks exit from the child zone. Triggered when the child taps the lock icon in the child `Header`. Identical UI to PinModal — 4-digit keypad and dots — but tied to the parent's stored PIN. On success (`onSuccess`) the app routes back to the entry screen `/`. On cancel (`onCancel`) the overlay dismisses without leaving the child zone.

### 6.3 Session Overlay
**File:** `components/ui/SessionOverlay.tsx`

A full-screen overlay mounted in the root layout that activates when `useSessionStore` reports that the session time has expired. It displays a friendly time's-up message to the child (with a mascot illustration), a countdown to automatic lockout, and a "Lock Now" button. The parent can dismiss it by entering their PIN, which grants a configurable time extension. If not dismissed, it automatically routes to the entry screen when the countdown reaches zero.

### 6.4 Pause Overlay
**File:** `components/ui/PauseOverlay.tsx`

A full-screen overlay mounted in the child layout that activates when `useSessionStore.isPaused` is `true`. Covers all child content with a semi-transparent backdrop and a centred message explaining the session is paused by a parent. The child cannot interact with any content beneath it. The overlay disappears automatically when the parent sends a `resume` command or toggles `isPaused` back to `false`.
