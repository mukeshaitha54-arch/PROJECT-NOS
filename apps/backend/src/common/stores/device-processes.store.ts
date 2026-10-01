/**
 * In-memory store for the latest snapshot of running OS processes
 * captured from live device heartbeats and telemetries.
 */
export const deviceLiveProcessesStore = new Map<string, any[]>();
