import { useState, useCallback, useEffect, useRef } from 'react';

// A free, no-API-key exchange rate feed (open.er-api.com) — CORS-open, so this can be called
// directly from the browser with no backend proxy needed. Its IQD figure is the official/
// interbank-ish peg, which in Iraq commonly differs from the informal market rate NOVAIQ's own
// fixed pricing constant (IQD_PER_USD in currency.ts) is calibrated to — this is a separate,
// on-demand admin tool for a live reference number, not a replacement for that pricing constant.
const RATE_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

interface LiveRateState {
  /** IQD per 1 USD, or null before the first successful fetch. */
  rate: number | null;
  loading: boolean;
  error: boolean;
  /** When the feed itself says the rate was last updated (its own timestamp, not our fetch time). */
  updatedAt: string | null;
  refresh: () => void;
}

export function useLiveUsdIqdRate(): LiveRateState {
  const [rate, setRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchRate = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(RATE_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      })
      .then((data) => {
        const iqd = data?.rates?.IQD;
        if (typeof iqd !== 'number' || !Number.isFinite(iqd)) throw new Error('no IQD rate');
        setRate(iqd);
        setUpdatedAt(data.time_last_update_utc || null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchRate();
  }, [fetchRate]);

  return { rate, loading, error, updatedAt, refresh: fetchRate };
}
