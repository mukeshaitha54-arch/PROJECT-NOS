/**
 * In-memory store for the latest snapshot of running OS processes
 * captured from live device heartbeats and telemetries.
 */
export const deviceLiveProcessesStore = new Map<string, any[]>();

/**
 * Stores processes under multiple keys (original, lowercase, uppercase)
 * to ensure robust case-insensitive lookups across WMI GUIDs and UUIDs.
 */
export function setDeviceLiveProcesses(
  keys: (string | undefined | null)[],
  procs: any[],
): void {
  if (!procs || procs.length === 0) return;
  for (const k of keys) {
    if (!k) continue;
    const trimmed = String(k).trim();
    deviceLiveProcessesStore.set(trimmed, procs);
    deviceLiveProcessesStore.set(trimmed.toLowerCase(), procs);
    deviceLiveProcessesStore.set(trimmed.toUpperCase(), procs);
  }
}

/**
 * Retrieves processes by checking candidate keys in original, lowercase,
 * and uppercase variants.
 */
export function getDeviceLiveProcesses(
  keys: (string | undefined | null)[],
): any[] | null {
  for (const k of keys) {
    if (!k) continue;
    const trimmed = String(k).trim();
    const exact = deviceLiveProcessesStore.get(trimmed);
    if (exact && exact.length > 0) return exact;
    const lower = deviceLiveProcessesStore.get(trimmed.toLowerCase());
    if (lower && lower.length > 0) return lower;
    const upper = deviceLiveProcessesStore.get(trimmed.toUpperCase());
    if (upper && upper.length > 0) return upper;
  }
  return null;
}
