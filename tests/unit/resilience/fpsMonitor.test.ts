import { FpsMonitor, DegradationConfig } from '../../../services/resilience/fpsMonitor';

// Each test gets a fresh FpsMonitor instance so state never bleeds between tests.
let monitor: FpsMonitor;

beforeEach(() => {
  monitor = new FpsMonitor();
  jest.useFakeTimers();
  // Provide a performance.now() stub that advances with fake time
  let fakeNow = 0;
  jest.spyOn(performance, 'now').mockImplementation(() => {
    fakeNow += 500; // advances 500ms per call (matches checkIntervalMs default)
    return fakeNow;
  });
  // requestAnimationFrame stub: invoke callback synchronously so frames accumulate
  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  };
  (global as any).cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  monitor.stop();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Advance fake timers by `ms` in steps of `step` to trigger setInterval callbacks */
function tick(ms: number, step = 500) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    jest.advanceTimersByTime(step);
  }
}

/** Create a monitor with low thresholds for fast test scenarios */
function fastMonitor(overrides: Partial<DegradationConfig> = {}) {
  return new FpsMonitor({
    threshold: 30,
    durationMs: 1000,     // 2 checks below threshold → degrade
    restoreDurationMs: 2000, // 4 checks above threshold → restore
    checkIntervalMs: 500,
    ...overrides,
  });
}

// ── Basic lifecycle ───────────────────────────────────────────────────────────

describe('FpsMonitor — lifecycle', () => {
  it('starts without error', () => {
    expect(() => monitor.start()).not.toThrow();
  });

  it('stops without error after start', () => {
    monitor.start();
    expect(() => monitor.stop()).not.toThrow();
  });

  it('calling start twice does not create duplicate intervals', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    monitor.start();
    monitor.start(); // second call should be a no-op
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('isDegraded() returns false initially', () => {
    expect(monitor.isDegraded()).toBe(false);
  });

  it('getCurrentFps() returns a number', () => {
    monitor.start();
    expect(typeof monitor.getCurrentFps()).toBe('number');
  });
});

// ── Degradation threshold ─────────────────────────────────────────────────────

describe('FpsMonitor — degradation threshold', () => {
  it('fires onDegrade callback after sustained low FPS (durationMs)', () => {
    const m = fastMonitor();
    const degradeCb = jest.fn();
    m.onDegrade(degradeCb);
    m.start();

    // Force low-FPS scenario: 0 frames per interval → currentFps = 0 < 30
    // The requestAnimationFrame stub fires synchronously so frameCount will
    // be non-zero; we override it by advancing time without any rAF frames.
    (global as any).requestAnimationFrame = jest.fn(); // don't fire frames
    tick(1500); // 3 × 500ms checks with 0 frames = 0 fps → should degrade at 1000ms

    expect(degradeCb).toHaveBeenCalledTimes(1);
    expect(m.isDegraded()).toBe(true);
    m.stop();
  });

  it('does NOT fire onDegrade for a single below-threshold check', () => {
    const m = fastMonitor({ durationMs: 1000 });
    const degradeCb = jest.fn();
    m.onDegrade(degradeCb);
    m.start();

    (global as any).requestAnimationFrame = jest.fn(); // 0 fps
    tick(500); // only 1 check (500ms) — below durationMs of 1000ms

    expect(degradeCb).not.toHaveBeenCalled();
    m.stop();
  });

  it('resets below-threshold counter when FPS recovers mid-window', () => {
    const m = fastMonitor({ durationMs: 2000 });
    const degradeCb = jest.fn();
    m.onDegrade(degradeCb);
    m.start();

    // 1 check with 0 fps
    (global as any).requestAnimationFrame = jest.fn();
    tick(500);

    // Then recover FPS (lots of frames per interval)
    let frame = 0;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0); frame++; return frame;
    };
    tick(500);

    // Then drop again (0 fps), total below-threshold time = 500ms < durationMs
    (global as any).requestAnimationFrame = jest.fn();
    tick(500);

    expect(degradeCb).not.toHaveBeenCalled();
    m.stop();
  });
});

// ── Restore threshold ─────────────────────────────────────────────────────────

describe('FpsMonitor — restore threshold', () => {
  it('fires onRestore callback after sustained high FPS (restoreDurationMs)', () => {
    const m = fastMonitor();
    const degradeCb = jest.fn();
    const restoreCb = jest.fn();
    m.onDegrade(degradeCb);
    m.onRestore(restoreCb);
    m.start();

    // Degrade first
    (global as any).requestAnimationFrame = jest.fn();
    tick(1500); // 3 checks × 500ms → degraded
    expect(m.isDegraded()).toBe(true);

    // Now recover FPS
    let f = 0;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); f++; return f; };
    tick(2500); // 5 checks × 500ms → restore triggers at 2000ms

    expect(restoreCb).toHaveBeenCalledTimes(1);
    expect(m.isDegraded()).toBe(false);
    m.stop();
  });

  it('does NOT restore after only 1 high-FPS check', () => {
    const m = fastMonitor({ restoreDurationMs: 2000 });
    const restoreCb = jest.fn();
    m.onRestore(restoreCb);
    m.start();

    // Force degrade
    (global as any).requestAnimationFrame = jest.fn();
    tick(1500);
    expect(m.isDegraded()).toBe(true);

    // 1 high-fps check
    let f = 0;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); f++; return f; };
    tick(500);

    expect(restoreCb).not.toHaveBeenCalled();
    m.stop();
  });
});

// ── Transition debounce ───────────────────────────────────────────────────────

describe('FpsMonitor — transition debounce', () => {
  it('debounces after 3 transitions within 60s', () => {
    const m = fastMonitor();
    const degradeCb = jest.fn();
    const restoreCb = jest.fn();
    m.onDegrade(degradeCb);
    m.onRestore(restoreCb);
    m.start();

    const dropFps = () => {
      (global as any).requestAnimationFrame = jest.fn();
      tick(1500);
    };
    const raiseFps = () => {
      let f = 0;
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); f++; return f; };
      tick(2500);
    };

    // Transition 1: degrade
    dropFps();
    expect(degradeCb).toHaveBeenCalledTimes(1);

    // Transition 2: restore
    raiseFps();
    expect(restoreCb).toHaveBeenCalledTimes(1);

    // Transition 3: degrade again → this is the 3rd transition; debounce kicks in on next restore
    dropFps();
    expect(degradeCb).toHaveBeenCalledTimes(2);

    // Attempt restore → should be blocked by debounce (3 transitions reached)
    raiseFps();
    expect(restoreCb).toHaveBeenCalledTimes(1); // still 1 — debounce blocked it

    m.stop();
  });

  it('unsubscribe prevents callback from firing', () => {
    const m = fastMonitor();
    const degradeCb = jest.fn();
    const unsub = m.onDegrade(degradeCb);
    unsub();

    m.start();
    (global as any).requestAnimationFrame = jest.fn();
    tick(1500);

    expect(degradeCb).not.toHaveBeenCalled();
    m.stop();
  });
});
