import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchInstituteDashboard } from './dashboardApi';
import type { DashboardData, DashboardQueryParams } from './types';

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDashboard = (params: DashboardQueryParams): UseDashboardResult => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const paramsStr = JSON.stringify(params);

  const doFetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const result = await fetchInstituteDashboard(params);
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.error('[useDashboard] fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsStr, fetchKey]);

  useEffect(() => {
    // Debounce filter changes by 300ms
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doFetch();
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doFetch]);

  const refetch = useCallback(() => {
    setFetchKey(k => k + 1);
  }, []);

  return { data, loading, error, refetch };
};
