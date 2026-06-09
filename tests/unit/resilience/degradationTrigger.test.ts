/**
 * tests/unit/resilience/degradationTrigger.test.ts
 * T036: DegradableAnimation degrades within 500ms of threshold being crossed.
 * Tests the FpsMonitor degradation trigger timing via the exported class.
 */
import { FpsMonitor, DegradationConfig } from '../../../services/resilience/fpsMonitor';

const FAST_CONFIG: DegradationConfig = {
  threshold: 30,
  durationMs: 500,      // degrade after 500ms below threshold
  restoreDurationMs: 1000,
  checkIntervalMs: 100, // check every 100ms for precision
};

let monitor: FpsMonitor;

beforeEach(() => {
  monitor = new FpsMonitor(FAST_CONFIG);
  jest.useFakeTimers();
  jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  (global as any).requestAnimationFrame = jest.fn(); // no frames → 0 fps
  (global as any).cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  monitor.stop();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('DegradationTrigger', () => {
  it('triggers degrade callback within durationMs of sustained low FPS', () => {
    const degradeCb = jest.fn();
    monitor.onDegrade(degradeCb);
    monitor.start();

    // Advance past durationMs (500ms): triggers on first check after threshold crossed
    jest.advanceTimersByTime(600);

    expect(degradeCb).toHaveBeenCalledTimes(1);
    expect(monitor.isDegraded()).toBe(true);
  });

  it('does NOT trigger degradation before durationMs has elapsed', () => {
    const degradeCb = jest.fn();
    monitor.onDegrade(degradeCb);
    monitor.start();

    jest.advanceTimersByTime(400); // below 500ms durationMs

    expect(degradeCb).not.toHaveBeenCalled();
    expect(monitor.isDegraded()).toBe(false);
  });

  it('degradation fires exactly once per sustained drop', () => {
    const degradeCb = jest.fn();
    monitor.onDegrade(degradeCb);
    monitor.start();

    jest.advanceTimersByTime(2000); // well past threshold

    expect(degradeCb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing onDegrade prevents callback', () => {
    const degradeCb = jest.fn();
    const unsub = monitor.onDegrade(degradeCb);
    unsub();
    monitor.start();

    jest.advanceTimersByTime(600);

    expect(degradeCb).not.toHaveBeenCalled();
  });

  it('isDegraded() is false before threshold, true after', () => {
    monitor.start();
    jest.advanceTimersByTime(300);
    expect(monitor.isDegraded()).toBe(false);

    jest.advanceTimersByTime(400);
    expect(monitor.isDegraded()).toBe(true);
  });
});
