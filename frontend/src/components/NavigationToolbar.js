import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MAX_IDX_KEY = '__nav_toolbar_max_history_idx__';

const getHistoryIdx = () => {
  const idx = window?.history?.state?.idx;
  return typeof idx === 'number' ? idx : null;
};

const getStoredMaxIdx = () => {
  try {
    const raw = window?.sessionStorage?.getItem(MAX_IDX_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

const storeMaxIdx = (value) => {
  try {
    window?.sessionStorage?.setItem(MAX_IDX_KEY, String(value));
  } catch {}
};

export default function NavigationToolbar({ className = '', hideBackOnFirst = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [historyIdx, setHistoryIdx] = useState(() => getHistoryIdx());
  const [maxIdx, setMaxIdx] = useState(() => getStoredMaxIdx());

  useEffect(() => {
    const idx = getHistoryIdx();
    setHistoryIdx(idx);

    if (typeof idx === 'number') {
      const prevMax = getStoredMaxIdx();
      const nextMax = typeof prevMax === 'number' ? Math.max(prevMax, idx) : idx;
      storeMaxIdx(nextMax);
      setMaxIdx(nextMax);
    }
  }, [location.key]);

  const canGoBack = useMemo(() => {
    if (typeof historyIdx === 'number') return historyIdx > 0;
    return window?.history?.length > 1;
  }, [historyIdx]);

  const canGoForward = useMemo(() => {
    if (typeof historyIdx === 'number' && typeof maxIdx === 'number') return historyIdx < maxIdx;
    return false;
  }, [historyIdx, maxIdx]);

  if (hideBackOnFirst && !canGoBack) return null;

  const baseBtn =
    'inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors';
  const enabledBtn = 'hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
  const disabledBtn = 'opacity-40 cursor-not-allowed';

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 backdrop-blur px-1.5 py-1 shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        disabled={!canGoBack}
        aria-label="Back"
        className={`${baseBtn} ${canGoBack ? enabledBtn : disabledBtn}`}
        title={canGoBack ? 'Back' : 'Back (disabled)'}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => navigate(1)}
        disabled={!canGoForward}
        aria-label="Forward"
        className={`${baseBtn} ${canGoForward ? enabledBtn : disabledBtn}`}
        title={canGoForward ? 'Forward' : 'Forward (disabled)'}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

