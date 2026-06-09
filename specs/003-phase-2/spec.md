# Feature Specification: Realtime Sync & Parent Commands

**Feature Branch**: `003-phase-2`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "phase 2"

## Clarifications

### Session 2026-06-08
- Q: How are commands queued for a device that is offline? → A: Parent writes commands to a DB table; child fetches unapplied commands on reconnect.
- Q: How should the system handle simultaneous conflicting commands from two different parent devices? → A: Last-Write-Wins based on Server Timestamp (commands processed sequentially).
- Q: How should the child device manage the local queue of applied command IDs used for idempotency? → A: Rolling Window (keep last 1000 command IDs).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Pause (Priority: P1)

As a parent, when I tap "Pause Now", the child's screen freezes with a friendly mascot message within 2 seconds.

**Why this priority**: Core functionality for immediate parent intervention.
**Independent Test**: Can be tested by triggering a pause command from the parent app and observing the child app lock state.

**Acceptance Scenarios**:
1. **Given** child is actively using the app, **When** parent taps "Pause Now", **Then** the child device shows a freeze screen within 2 seconds.
2. **Given** child app is paused, **When** parent taps "Resume", **Then** the child device unlocks and resumes activity.

---

### User Story 2 - Mid-Session Time Limit Update (Priority: P1)

As a parent, when I reduce daily screen time mid-session, the child's remaining-time indicator updates immediately and the session ends at the new limit.

**Why this priority**: Parents need real-time control over allowed time without requiring app restart.
**Independent Test**: Can be tested by updating time limits from parent device while child is playing, and verifying the new limits apply immediately.

**Acceptance Scenarios**:
1. **Given** child is playing with 30 minutes left, **When** parent reduces total time by 15 minutes, **Then** the child's indicator shows 15 minutes left.
2. **Given** child has 5 minutes left, **When** parent reduces time by 10 minutes, **Then** the child's session ends immediately with a graceful timeout message.

---

### User Story 3 - Instant Category Blocking (Priority: P2)

As a parent, when I block a category, any active content in that category exits gracefully (no abrupt crash) and shows the "go play outside" Lottie animation.

**Why this priority**: Essential for content moderation on the fly.
**Independent Test**: Can be tested by blocking a category the child is currently viewing and verifying the graceful exit.

**Acceptance Scenarios**:
1. **Given** child is playing a "Games" activity, **When** parent blocks the "Games" category, **Then** the child is gracefully exited from the activity and shown the "اذهب العب في الخارج" Lottie animation on a dedicated screen.
2. **Given** child is viewing the home screen, **When** parent blocks a category, **Then** the category immediately disappears from the child's options.

---

### User Story 4 - Offline Resilience & Replay (Priority: P2)

As a child, when network drops, my session continues offline with last-known limits; on reconnect, missed parent commands apply in order with no duplicates.

**Why this priority**: Network unreliability is common on mobile devices; commands must not be lost or duplicated.
**Independent Test**: Test by turning off WiFi on child device, sending parent commands, turning WiFi back on, and verifying commands apply correctly.

**Acceptance Scenarios**:
1. **Given** child device is offline, **When** parent sends a "Pause" command, **Then** the parent device queues the command.
2. **Given** parent has queued a "Pause" command, **When** child device reconnects, **Then** the child device applies the "Pause" command exactly once.

### Edge Cases

- **Simultaneous Conflicting Commands**: If multiple parents send conflicting commands (e.g., pause and resume) simultaneously, the system uses Last-Write-Wins based on Server Timestamp, processing commands sequentially.
- **Command TTL (غير متصل)**: يتم الاحتفاظ بأوامر الأجهزة غير المتصلة في جدول `realtime_commands` لمدة **30 يوماً**. بعد انتهاء هذه المدة، تُحذف الأوامر غير المُقرّة تلقائياً عبر Supabase Row-Level TTL أو Cron Job على الخادم. القرار: لا يُطبَّق TTL على مستوى التطبيق — يتحمل الخادم هذه المسؤولية.
- **Heartbeat في الخلفية (iOS/Android)**: نظراً لأن iOS يُقيِّد تشغيل الكود في الخلفية، قد يتوقف نبض الاتصال عند إغلاق التطبيق. القرار المتخذ: يُعدّ انقطاع نبض الاتصال لأكثر من 90 ثانية حالةً طبيعية ومتوقعة — تُظهر واجهة الوالد حالة "غير متصل" بدلاً من اعتبارها خطأً. عند إعادة فتح التطبيق، تُعاد جلسة الاتصال تلقائياً ويتم إعادة تشغيل الـ heartbeat.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a bi-directional real-time control channel named `family:<family_id>`.
- **FR-002**: System MUST support distinct broadcast events: `pause`, `resume`, `time_update`, `category_block`, `force_end`.
- **FR-003**: System MUST include an idempotent command ID (UUID) with every command to prevent duplicate processing. The child app MUST maintain a rolling window of the last 1000 applied command IDs to ensure idempotency without unbounded memory growth.
- **FR-004**: System MUST send a heartbeat from the child device every 30 seconds.
- **FR-005**: System MUST log all commands and state changes in an `activity_logs` table for audit purposes.
- **FR-006**: System MUST show a "Child device offline" indicator on the parent app if no heartbeat is received for 90 seconds.
- **FR-007**: System MUST queue missed commands for offline child devices by having the parent write commands to a Supabase DB table; the child device MUST fetch and apply unapplied commands upon reconnection.

### Key Entities

- **Family Channel**: Realtime communication topic tying parent and child devices.
- **Command Event**: Payload containing type, timestamp, UUID, and relevant parameters (e.g., new time limit).
- **Activity Log Entry**: Database record tracking when a command was issued and when it was acknowledged by the child.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Real-time commands (e.g., Pause) are executed on the child device within 2 seconds of parent action under normal network conditions.
- **SC-002**: 100% of commands sent while the child device is offline are applied upon reconnection without duplication.
- **SC-003**: The system handles command throughput without introducing noticeable battery drain on the child device (less than 5% extra drain per hour).
- **SC-004**: Parent device accurately reflects the online/offline status of the child device within a 90-second window.

## Assumptions

- Users have a reasonably stable network connection most of the time.
- Devices support WebSocket connections required for real-time channels.
- Supabase Realtime service is configured and active.
- Device clocks might not be perfectly synchronized; server time is the source of truth.
