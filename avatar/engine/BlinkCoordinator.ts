import type { BehaviorState } from "./behaviorConfig";

export type BlinkState = "open" | "closing" | "closed" | "opening";

export interface BlinkInput {
  deltaTime: number;
  behaviorState?: BehaviorState;
  reducedMotion?: boolean;
}

export interface BlinkConfig {
  minInterval: number;
  maxInterval: number;
  closeDuration: number;
  closedDuration: number;
  openDuration: number;
  maxDeltaTime: number;
  random: () => number;
}

export interface BlinkOutput {
  blinkWeight: number;
  state: BlinkState;
}

export interface BlinkDiagnostics extends BlinkOutput {
  timeUntilNext: number;
}

export const defaultBlinkConfig: BlinkConfig = {
  minInterval: 2.8,
  maxInterval: 6,
  closeDuration: 0.09,
  closedDuration: 0.07,
  openDuration: 0.16,
  maxDeltaTime: 0.1,
  random: Math.random,
};

const finite = (value: number | null | undefined, fallback = 0) => Number.isFinite(value) ? value as number : fallback;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, finite(value)));
const smooth = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Owns blink timing and blink weight only. It never touches morphs, bones, or render objects. */
export class BlinkCoordinator {
  private state: BlinkState = "open";
  private blinkWeight = 0;
  private elapsed = 0;
  private timeUntilNext: number;

  constructor(private config: BlinkConfig = defaultBlinkConfig) {
    this.timeUntilNext = this.nextInterval();
  }

  update(input: BlinkInput): BlinkOutput {
    if (input.reducedMotion) {
      this.reset();
      return this.output();
    }
    const delta = this.safeDelta(input.deltaTime);
    if (delta > 0) this.advance(delta);
    return this.output();
  }

  reset(): void {
    this.state = "open";
    this.blinkWeight = 0;
    this.elapsed = 0;
    this.timeUntilNext = this.nextInterval();
  }

  getDiagnostics(): BlinkDiagnostics {
    return { ...this.output(), timeUntilNext: this.timeUntilNext };
  }

  private advance(delta: number): void {
    let remaining = delta;
    while (remaining > 1e-9) {
      if (this.state === "open") {
        this.blinkWeight = 0;
        if (this.timeUntilNext > remaining) { this.timeUntilNext -= remaining; return; }
        remaining -= Math.max(0, this.timeUntilNext);
        this.startClosing();
        if (remaining <= 1e-9) return;
      }
      if (this.state === "closing") {
        const duration = Math.max(1e-6, this.config.closeDuration);
        const available = Math.min(remaining, Math.max(0, duration - this.elapsed));
        this.elapsed += available; remaining -= available;
        this.blinkWeight = smooth(this.elapsed / duration);
        if (this.elapsed < duration) return;
        this.state = "closed"; this.elapsed = 0; this.blinkWeight = 1;
        if (remaining <= 1e-9) return;
      }
      if (this.state === "closed") {
        const duration = Math.max(1e-6, this.config.closedDuration);
        const available = Math.min(remaining, Math.max(0, duration - this.elapsed));
        this.elapsed += available; remaining -= available; this.blinkWeight = 1;
        if (this.elapsed < duration) return;
        this.state = "opening"; this.elapsed = 0;
        if (remaining <= 1e-9) return;
      }
      const duration = Math.max(1e-6, this.config.openDuration);
      const available = Math.min(remaining, Math.max(0, duration - this.elapsed));
      this.elapsed += available; remaining -= available;
      this.blinkWeight = 1 - smooth(this.elapsed / duration);
      if (this.elapsed < duration) return;
      this.state = "open"; this.elapsed = 0; this.blinkWeight = 0; this.timeUntilNext = this.nextInterval();
    }
  }

  private startClosing(): void {
    this.state = "closing";
    this.elapsed = 0;
    this.blinkWeight = 0;
  }

  private nextInterval(): number {
    const min = finite(this.config.minInterval, defaultBlinkConfig.minInterval);
    const max = finite(this.config.maxInterval, defaultBlinkConfig.maxInterval);
    const low = Math.max(0, Math.min(min, max));
    const high = Math.max(low, Math.max(min, max));
    return low + (high - low) * clamp(this.config.random(), 0, 1);
  }

  private safeDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta <= 0) return 0;
    // A caller may intentionally advance a deterministic simulation by more than
    // one frame (for example, when restoring a paused preview). Do not discard
    // elapsed time; the state machine itself handles phase transitions safely.
    return delta;
  }

  private output(): BlinkOutput {
    return { blinkWeight: clamp(this.blinkWeight, 0, 1), state: this.state };
  }
}
