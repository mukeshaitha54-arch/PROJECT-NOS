import * as fs from "fs";
import * as path from "path";

/**
 * File-backed persistent store for device telemetry pause/resume state.
 * Survives backend restarts and ensures paused devices NEVER resume accidentally.
 */
class PersistentTelemetryPausedStore extends Map<string, boolean> {
  private filePath: string;

  constructor() {
    super();
    // Default to app root or /app
    this.filePath = path.resolve(process.cwd(), "telemetry_paused.json");
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8");
        const data = JSON.parse(content);
        for (const [key, value] of Object.entries(data)) {
          super.set(key, Boolean(value));
        }
      }
    } catch (e) {
      // Graceful fallback to in-memory on disk read error
    }
  }

  private persist(): void {
    try {
      const obj: Record<string, boolean> = {};
      for (const [key, value] of this.entries()) {
        obj[key] = value;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      // Graceful fallback
    }
  }

  override set(key: string, value: boolean): this {
    super.set(key, value);
    this.persist();
    return this;
  }

  override delete(key: string): boolean {
    const result = super.delete(key);
    this.persist();
    return result;
  }

  override clear(): void {
    super.clear();
    this.persist();
  }
}

export const deviceTelemetryPausedStore = new PersistentTelemetryPausedStore();
