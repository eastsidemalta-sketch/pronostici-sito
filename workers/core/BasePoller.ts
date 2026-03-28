export abstract class BasePoller {
  protected name: string;
  protected intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  private failureCount: number = 0;
  private readonly maxFailures: number = 3;
  private circuitOpenUntil: number = 0;
  private readonly cooldownMs: number = 5 * 60 * 1000;

  constructor(name: string, intervalMs: number) {
    this.name = name;
    this.intervalMs = intervalMs;
  }

  protected abstract fetchAndProcess(): Promise<void>;

  public start(): void {
    if (this.isRunning) return;

    console.log(
      `[Poller: ${this.name}] Started (Interval: ${this.intervalMs}ms)`
    );
    this.isRunning = true;

    void this.execute();

    this.timer = setInterval(() => {
      void this.execute();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log(`[Poller: ${this.name}] Stopped.`);
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) return false;

    const now = Date.now();
    if (now < this.circuitOpenUntil) {
      return true;
    }

    console.log(
      `[Poller: ${this.name}] Cooldown ended. Entering Half-Open state...`
    );
    this.circuitOpenUntil = 0;
    return false;
  }

  private async execute(): Promise<void> {
    if (this.isCircuitOpen()) {
      const remainingMin = Math.ceil(
        (this.circuitOpenUntil - Date.now()) / 60000
      );
      console.warn(
        `[Poller: ${this.name}] Circuit OPEN. Skipping fetch. Cooldown: ~${remainingMin} min left.`
      );
      return;
    }

    try {
      await this.fetchAndProcess();
      this.recordSuccess();
    } catch (error) {
      this.recordFailure(error);
    }
  }

  private recordSuccess(): void {
    if (this.failureCount > 0) {
      console.log(
        `[Poller: ${this.name}] Connection recovered. Circuit CLOSED.`
      );
      this.failureCount = 0;
    }
  }

  private recordFailure(error: unknown): void {
    this.failureCount += 1;
    console.error(
      `[Poller: ${this.name}] Execution failed (${this.failureCount}/${this.maxFailures}):`,
      error instanceof Error ? error.message : error
    );

    if (this.failureCount >= this.maxFailures) {
      console.error(
        `[Poller: ${this.name}] MAX FAILURES REACHED. Opening circuit for ${this.cooldownMs / 60000} minutes!`
      );
      this.circuitOpenUntil = Date.now() + this.cooldownMs;
    }
  }
}
