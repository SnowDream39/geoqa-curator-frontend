// ---------------------------------------------------------------------------
// storage – per-scenario persistence in the browser (localStorage)
// ---------------------------------------------------------------------------
//
// Each "scene" (e.g. single review vs. deep review) keeps its own settings
// blob under a namespaced key, so configurations never bleed across scenes.

const PREFIX = "geoqa:settings:";

export function loadSceneSettings<T>(scene: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + scene);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function saveSceneSettings<T>(scene: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + scene, JSON.stringify(value));
  } catch {
    // Ignore quota / serialization errors – persistence is best-effort.
  }
}
