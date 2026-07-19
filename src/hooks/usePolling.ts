import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// usePolling – poll an async function at a given interval
// ---------------------------------------------------------------------------

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const tick = useCallback(async () => {
    try {
      const result = await fetcher();
      if (!abortRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [fetcher]);

  useEffect(() => {
    abortRef.current = false;
    if (!enabled) return;

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      abortRef.current = true;
      clearInterval(id);
    };
  }, [tick, intervalMs, enabled]);

  const retry = useCallback(() => {
    setError(null);
    tick();
  }, [tick]);

  return { data, error, retry };
}
