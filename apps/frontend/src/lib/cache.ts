export function getScopedDeviceCacheKey(
  userId?: string | null,
  orgId?: string | null,
): string {
  const u = userId || "anon";
  const o =
    orgId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("nos_active_org_id")
      : null) ||
    "default";
  return `nos_cached_devices_${u}_${o}`;
}

export function getScopedStatsCacheKey(
  userId?: string | null,
  orgId?: string | null,
): string {
  const u = userId || "anon";
  const o =
    orgId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("nos_active_org_id")
      : null) ||
    "default";
  return `nos_cached_devices_stats_${u}_${o}`;
}

export function clearScopedDeviceCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith("nos_cached_devices") || key === "nos_cached_devices")
      ) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}
