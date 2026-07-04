type FpsCallback = () => void;

interface DegradationConfig {
  threshold: number;
  durationMs: number;
  restoreDurationMs: number;
  checkIntervalMs: number;
}

const DEFAULT_CONFIG: DegradationConfig = {
  threshold: 30,
  durationMs: 2000,        // 2s below threshold → degrade
  restoreDurationMs: 5000, // 5s above threshold → restore (spec requirement)
  checkIntervalMs: 500,
};

const TRANSITION_WINDOW_MS = 60_000;
const TRANSITION_LIMIT = 3;
const DEBOUNCE_MS = 30_000;

export class FpsMonitor {
  private config: DegradationConfig;
  private running = false;
  private frameCount = 0;
  private lastCheckTime = 0;
  private currentFps = 60;
  private degraded = false;
  private consecutiveBelowThreshold = 0;
  private consecutiveAboveThreshold = 0;
  private degradeCallbacks = new Set<FpsCallback>();
  private restoreCallbacks = new Set<FpsCallback>();
  private rafId: number | null = null;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  // Count both degrade and restore transitions for debounce; never reset mid-window
  private transitionCount = 0;
  private lastTransitionTime = 0;
  private debounceActive = false;

  constructor(config?: Partial<DegradationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.frameCount = 0;
    this.lastCheckTime = performance.now();
    this.scheduleNextFrame();
    this.checkIntervalId = setInterval(() => this.evaluate(), this.config.checkIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  onDegrade(callback: FpsCallback): () => void {
    this.degradeCallbacks.add(callback);
    return () => this.degradeCallbacks.delete(callback);
  }

  onRestore(callback: FpsCallback): () => void {
    this.restoreCallbacks.add(callback);
    return () => this.restoreCallbacks.delete(callback);
  }

  getCurrentFps(): number {
    return this.currentFps;
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  private scheduleNextFrame = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => {
      this.frameCount++;
      // Defer to prevent stack overflow when requestAnimationFrame is synchronous (e.g. in tests)
      setTimeout(() => this.scheduleNextFrame(), 1);
    });
  };

  private evaluate = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastCheckTime;
    if (elapsed < 1) return;

    this.currentFps = Math.round((this.frameCount / elapsed) * 1000);
    this.frameCount = 0;
    this.lastCheckTime = now;

    if (this.currentFps < this.config.threshold) {
      this.consecutiveBelowThreshold += this.config.checkIntervalMs;
      this.consecutiveAboveThreshold = 0;
    } else {
      this.consecutiveBelowThreshold = 0;
      this.consecutiveAboveThreshold += this.config.checkIntervalMs;
    }

    if (!this.degraded && this.consecutiveBelowThreshold >= this.config.durationMs) {
      this.triggerDegrade();
    }

    if (this.degraded && this.consecutiveAboveThreshold >= this.config.restoreDurationMs) {
      this.triggerRestore();
    }

    // Restart rAF loop if it was stopped (handles switching between rAF mocks in tests)
    if (this.running && this.rafId == null) {
      this.scheduleNextFrame();
    }
  };

  private triggerDegrade(): void {
    if (this.debounceActive) return;
    this.degraded = true;
    this.consecutiveBelowThreshold = 0;
    this.consecutiveAboveThreshold = 0;
    this.recordTransition();
    this.degradeCallbacks.forEach((cb) => cb());
  }

  private triggerRestore(): void {
    if (this.debounceActive) return;
    const now = Date.now();
    // If last transition was > 60s ago, window expired — reset counter
    if (now - this.lastTransitionTime >= TRANSITION_WINDOW_MS) {
      this.transitionCount = 0;
    }
    if (this.transitionCount >= TRANSITION_LIMIT) {
      this.debounceActive = true;
      setTimeout(() => {
        this.debounceActive = false;
        this.transitionCount = 0;
        this.consecutiveBelowThreshold = 0;
        this.consecutiveAboveThreshold = 0;
      }, DEBOUNCE_MS);
      return;
    }
    this.degraded = false;
    this.consecutiveBelowThreshold = 0;
    this.consecutiveAboveThreshold = 0;
    this.recordTransition();
    this.restoreCallbacks.forEach((cb) => cb());
  }

  private recordTransition(): void {
    const now = Date.now();
    if (now - this.lastTransitionTime >= TRANSITION_WINDOW_MS) {
      this.transitionCount = 0;
    }
    this.transitionCount++;
    this.lastTransitionTime = now;
  }
}

export const fpsMonitor = new FpsMonitor();
export type { DegradationConfig };
