import * as fs from "fs";
import * as path from "path";

/**
 * Persistent registry of decommissioned / deleted devices, UUIDs, hostnames, and token hashes.
 * Requests matching these identifiers receive HTTP 410 Gone signaling the agent
 * to terminate and uninstall its Windows service permanently.
 */
class DecommissionedDevicesStore {
  private readonly store = new Set<string>();
  private readonly filePath = path.resolve(
    process.cwd(),
    "data",
    "decommissioned-devices.json",
  );

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (typeof item === "string" && item.trim().length > 0) {
              this.store.add(item.trim());
            }
          }
        }
      }
    } catch (err) {
      // Non-fatal if loading cache fails
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(Array.from(this.store), null, 2),
        "utf-8",
      );
    } catch (err) {
      // Non-fatal if writing cache fails
    }
  }

  add(id: string | undefined | null) {
    if (!id || typeof id !== "string") return;
    const clean = id.trim();
    if (clean.length === 0) return;
    this.store.add(clean);
    this.saveToDisk();
  }

  has(id: string | undefined | null): boolean {
    if (!id || typeof id !== "string") return false;
    return this.store.has(id.trim());
  }

  delete(id: string | undefined | null): boolean {
    if (!id || typeof id !== "string") return false;
    const res = this.store.delete(id.trim());
    if (res) this.saveToDisk();
    return res;
  }

  clear() {
    this.store.clear();
    this.saveToDisk();
  }

  get size(): number {
    return this.store.size;
  }
}

export const decommissionedDevicesStore = new DecommissionedDevicesStore();
