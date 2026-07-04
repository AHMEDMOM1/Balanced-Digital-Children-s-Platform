# Quickstart: Live Session Reports Integration Scenarios

**Spec**: 020 — Live Session Reports
**Test file**: `tests/integration/liveSessionReports.test.ts`
**Run**: `npm run test:live-sessions`

---

## Environment

Requires: `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Stable test UUIDs (spec 020 prefix — no collision with earlier specs):

```typescript
const TEST_FAMILY_ID  = 'f4444444-0000-0000-0000-000000000020';
const TEST_PARENT_ID  = 'a4444444-0000-0000-0000-000000000020';
const TEST_CHILD_ID   = 'c4444444-0000-0000-0000-000000000020';
```

---

## Scenario A — Child inserts a session and it appears in DB (US1, FR-001)

```typescript
it('Scenario A — child inserts session row with correct fields', async () => {
  const sessionId = randomUUID();
  const { error } = await serviceClient.from('sessions').insert({
    id: sessionId,
    child_id: TEST_CHILD_ID,
    family_id: TEST_FAMILY_ID,
    parent_id: TEST_PARENT_ID,
    activity_type: 'game',
    started_at: new Date().toISOString(),
    status: 'active',
  });
  expect(error).toBeNull();

  const { data } = await serviceClient.from('sessions').select('*').eq('id', sessionId).single();
  expect(data?.activity_type).toBe('game');
  expect(data?.ended_at).toBeNull();
  expect(data?.family_id).toBe(TEST_FAMILY_ID);
});
```

---

## Scenario B — Child closes session; elapsed_seconds is clamped to ≥0 (US1, FR-002)

```typescript
it('Scenario B — closing session sets elapsed_seconds and ended_at', async () => {
  // Insert active session
  const { data: inserted } = await serviceClient.from('sessions').insert({
    child_id: TEST_CHILD_ID, family_id: TEST_FAMILY_ID,
    parent_id: TEST_PARENT_ID, activity_type: 'story',
    status: 'active',
  }).select().single();

  // Close it
  const elapsed = Math.max(0, 120); // clamped
  await serviceClient.from('sessions').update({
    ended_at: new Date().toISOString(),
    elapsed_seconds: elapsed,
    status: 'completed',
  }).eq('id', inserted!.id);

  const { data: closed } = await serviceClient.from('sessions').select('*').eq('id', inserted!.id).single();
  expect(closed?.ended_at).not.toBeNull();
  expect(closed?.elapsed_seconds).toBe(120);
  expect(closed?.status).toBe('completed');
});
```

---

## Scenario C — Parent receives new session insert via CDC within 5000ms (US2, FR-004)

```typescript
it('Scenario C — parent CDC subscription receives child session insert within 5000ms', async () => {
  let received: any = null;
  // ... subscribe via serviceClient.channel('session-cdc:TEST').on('postgres_changes', INSERT)
  // ... insert via anonClient (child)
  // ... assert received.activity_type === 'video' within 5000ms
});
// Wrap in try/catch: catch 'CDC_NOT_ENABLED' → console.warn and skip (same pattern as spec 019)
```

---

## Scenario D — Parent receives session UPDATE (ended_at) via CDC (US2, FR-004)

```typescript
it('Scenario D — parent CDC receives session close (UPDATE) within 5000ms', async () => {
  // Insert active session, subscribe, then update ended_at
  // Assert UPDATE payload arrives with ended_at set
});
```

---

## Scenario E — Abandoned session recovery sets status=expired and elapsed=0 (US1, FR-007)

```typescript
it('Scenario E — abandoned active session is recovered with elapsed_seconds=0', async () => {
  // Insert session with status='active' from 2 hours ago
  await serviceClient.from('sessions').update({
    ended_at: startedAt, // = started_at
    elapsed_seconds: 0,
    status: 'expired',
  }).eq('child_id', TEST_CHILD_ID).eq('status', 'active');

  const { data } = await serviceClient.from('sessions').select('*')
    .eq('child_id', TEST_CHILD_ID).eq('status', 'expired').single();
  expect(data?.elapsed_seconds).toBe(0);
  expect(data?.ended_at).toBe(data?.started_at);
});
```

---

## Scenario F — Today's session fetch respects timezone offset (US3, FR-006)

```typescript
it('Scenario F — today query excludes yesterday sessions', async () => {
  // Insert one session with started_at = yesterday UTC, one = today UTC
  // Query with tzOffset=0 → only today's row returned
  // Query with tzOffset=-480 (UTC+8) → both rows may be "today" if midnight boundary shifts
});
```

---

## Scenario G — RLS: parent can read own family sessions, not other family (FR-008)

```typescript
it('Scenario G — parent cannot read sessions from another family', async () => {
  // Insert session with different family_id
  // Query as parent → expect 0 rows or RLS block
});
```

---

## Scenario H — Unit: daily summary calculation (US3, FR-006)

```typescript
it('Scenario H — unit: daily summary sums elapsed_seconds by activity_type', () => {
  const sessions = [
    { activity_type: 'story', elapsed_seconds: 600 },
    { activity_type: 'story', elapsed_seconds: 300 },
    { activity_type: 'game',  elapsed_seconds: 900 },
  ];
  const summary = computeDailySummary(sessions);
  expect(summary.totalSeconds).toBe(1800);
  expect(summary.byType.story).toBe(900);
  expect(summary.byType.game).toBe(900);
  expect(summary.byType.video).toBe(0);
  expect(summary.byType.creative).toBe(0);
});
```

---

## Setup / Teardown

```typescript
beforeAll(async () => {
  // Seed parent + child profiles
  await serviceClient.from('profiles').upsert([
    { id: TEST_PARENT_ID, role: 'parent', family_id: TEST_FAMILY_ID, full_name: 'LiveReports Parent 020', is_active: true },
    { id: TEST_CHILD_ID,  role: 'child',  family_id: TEST_FAMILY_ID, parent_id: TEST_PARENT_ID, full_name: 'LiveReports Child 020', is_active: true },
  ], { onConflict: 'id' });
  await anonClient.auth.signInAnonymously();
});

afterAll(async () => {
  await serviceClient.from('sessions').delete().eq('family_id', TEST_FAMILY_ID);
  await serviceClient.from('profiles').delete().in('id', [TEST_CHILD_ID, TEST_PARENT_ID]);
  await anonClient.auth.signOut();
});
```
