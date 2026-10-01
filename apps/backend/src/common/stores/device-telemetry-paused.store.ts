/**
 * In-memory store for device telemetry pause/resume state.
 * Fully isolated, zero database schema migration dependencies.
 */
export const deviceTelemetryPausedStore = new Map<string, boolean>();
