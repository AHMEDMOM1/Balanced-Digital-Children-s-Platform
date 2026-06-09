/**
 * FPS Monitor Contract
 *
 * Monitors animation frame rate and triggers degradation when FPS
 * drops below threshold for a sustained period.
 * Used by: services/resilience/fpsMonitor.ts
 * Spec ref: FR-007
 */

export interface FpsMonitor {
  start(): void;
  stop(): void;
  onDegrade(callback: () => void): void;
  onRestore(callback: () => void): void;
  getCurrentFps(): number;
}

export interface DegradationConfig {
  threshold: number;       // FPS below which to degrade (default: 30)
  durationMs: number;      // consecutive ms below threshold (default: 2000)
  checkIntervalMs: number; // how often to evaluate (default: 500)
}
