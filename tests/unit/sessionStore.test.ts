/**
 * TDD tests for useSessionStore — applyCommand, status, blockedCategories.
 * These tests MUST FAIL before the implementation is added.
 *
 * Spec FR-007, FR-008, FR-009, FR-011
 */

jest.mock('../../services/resilience/sessionManager', () => ({
  sessionManager: { save: jest.fn(), clear: jest.fn(), restore: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../../services/resilience/eventLogger', () => ({
  eventLogger: { log: jest.fn() },
}));
jest.mock('../../services/resilience/timeSync', () => ({
  timeSync: { sync: jest.fn().mockResolvedValue(undefined), getServerNow: jest.fn(() => Date.now()) },
}));

import useSessionStore from '../../store/useSessionStore';
import type { RealtimeCommand } from '../../services/realtime/types';

const makeCmd = (overrides: Partial<RealtimeCommand> = {}): RealtimeCommand => ({
  command_id: 'cmd-001',
  command_type: 'pause',
  sender_id: 'parent-1',
  child_id: 'child-1',
  payload: {},
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  useSessionStore.setState({
    isSessionActive: true,
    sessionStartTime: Date.now(),
    elapsedSeconds: 0,
    sessionsUsedToday: 0,
    isPaused: false,
    remainingMinutes: 30,
    isPauseOverlayVisible: false,
    lastTickAt: null,
    wasOffline: false,
    serverTimeOffset: 0,
    status: 'active',
    blockedCategories: [],
    processedCommandIds: new Set<string>(),
  } as any);
});

describe('SessionStore — status field', () => {
  it('initializes status as "active" when session is active', () => {
    const { status } = useSessionStore.getState() as any;
    expect(status).toBe('active');
  });

  it('transitions status to "paused" when applyCommand(pause) is called', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({ command_type: 'pause' }));
    const { status } = useSessionStore.getState() as any;
    expect(status).toBe('paused');
  });

  it('transitions status back to "active" when applyCommand(resume) is called after pause', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({ command_type: 'pause', command_id: 'cmd-001' }));
    applyCommand(makeCmd({ command_type: 'resume', command_id: 'cmd-002' }));
    const { status } = useSessionStore.getState() as any;
    expect(status).toBe('active');
  });

  it('transitions status to "ended" when applyCommand(force_end) is called', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({ command_type: 'force_end', command_id: 'cmd-003' }));
    const { status } = useSessionStore.getState() as any;
    expect(status).toBe('ended');
  });
});

describe('SessionStore — blockedCategories', () => {
  it('initializes blockedCategories as empty array', () => {
    const { blockedCategories } = useSessionStore.getState() as any;
    expect(blockedCategories).toEqual([]);
  });

  it('adds category to blockedCategories when category_block command arrives with is_allowed=false', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({
      command_type: 'category_block',
      command_id: 'cmd-004',
      payload: { category: 'videos', is_allowed: false },
    }));
    const { blockedCategories } = useSessionStore.getState() as any;
    expect(blockedCategories).toContain('videos');
  });

  it('removes category from blockedCategories when category_block command arrives with is_allowed=true', () => {
    useSessionStore.setState({ blockedCategories: ['videos'] } as any);
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({
      command_type: 'category_block',
      command_id: 'cmd-005',
      payload: { category: 'videos', is_allowed: true },
    }));
    const { blockedCategories } = useSessionStore.getState() as any;
    expect(blockedCategories).not.toContain('videos');
  });
});

describe('SessionStore — applyCommand idempotency', () => {
  it('does not apply same command_id twice', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({ command_type: 'pause', command_id: 'dup-001' }));
    applyCommand(makeCmd({ command_type: 'pause', command_id: 'dup-001' }));

    // status should be paused only once, not re-applied
    const { status, processedCommandIds } = useSessionStore.getState() as any;
    expect(status).toBe('paused');
    // processedCommandIds must track it
    expect(processedCommandIds instanceof Set).toBe(true);
    expect((processedCommandIds as Set<string>).has('dup-001')).toBe(true);
  });

  it('tracks processedCommandIds as a Set', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({ command_type: 'pause', command_id: 'set-001' }));
    applyCommand(makeCmd({ command_type: 'resume', command_id: 'set-002' }));

    const { processedCommandIds } = useSessionStore.getState() as any;
    expect(processedCommandIds instanceof Set).toBe(true);
    expect((processedCommandIds as Set<string>).size).toBe(2);
  });
});

describe('SessionStore — applyCommand time_update', () => {
  it('updates remainingMinutes when time_update command arrives', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({
      command_type: 'time_update',
      command_id: 'cmd-006',
      payload: { remaining_minutes: 15 },
    }));
    const { remainingMinutes } = useSessionStore.getState();
    expect(remainingMinutes).toBe(15);
  });

  it('ends session immediately when time_update sets remaining_minutes to 0', () => {
    const { applyCommand } = useSessionStore.getState() as any;
    applyCommand(makeCmd({
      command_type: 'time_update',
      command_id: 'cmd-007',
      payload: { remaining_minutes: 0 },
    }));
    const { status } = useSessionStore.getState() as any;
    expect(status).toBe('ended');
  });
});
