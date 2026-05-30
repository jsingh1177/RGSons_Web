import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';

const isoToDigits = (iso) => {
  const s = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-');
  return `${d}${m}${y}`;
};

const normalizePeriodDigits = (rawDigits) => {
  const digits = String(rawDigits || '').replace(/\D/g, '').slice(0, 8);
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());

  let dd = '';
  let mm = '';
  let yyyy = '';

  if (digits.length === 2) {
    dd = digits.slice(0, 2);
    mm = currentMonth;
    yyyy = currentYear;
  } else if (digits.length === 4) {
    dd = digits.slice(0, 2);
    mm = digits.slice(2, 4);
    yyyy = currentYear;
  } else if (digits.length === 8) {
    dd = digits.slice(0, 2);
    mm = digits.slice(2, 4);
    yyyy = digits.slice(4, 8);
  } else {
    return { digits: '', iso: '' };
  }

  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return { digits: '', iso: '' };
  if (year < 1900 || year > 2100) return { digits: '', iso: '' };
  if (month < 1 || month > 12) return { digits: '', iso: '' };
  if (day < 1 || day > 31) return { digits: '', iso: '' };

  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return { digits: '', iso: '' };

  const mm2 = String(month).padStart(2, '0');
  const dd2 = String(day).padStart(2, '0');
  return { digits: `${dd2}${mm2}${year}`, iso: `${year}-${mm2}-${dd2}` };
};

const formatDigitsAsDdmmyyyy = (digits) => {
  const raw = String(digits || '').replace(/\D/g, '').slice(0, 8);
  const a = raw.slice(0, 2);
  const b = raw.slice(2, 4);
  const c = raw.slice(4, 8);
  if (raw.length <= 2) return a;
  if (raw.length <= 4) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
};

export default function ChangePeriodModal({
  open,
  startDate,
  endDate,
  onClose,
  onApply
}) {
  const [fromDigits, setFromDigits] = useState('');
  const [toDigits, setToDigits] = useState('');

  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFromDigits(isoToDigits(startDate));
    setToDigits(isoToDigits(endDate));
    setTimeout(() => {
      try {
        fromInputRef.current?.focus?.();
        fromInputRef.current?.select?.();
      } catch {}
    }, 50);
  }, [open, startDate, endDate]);

  const fromDisplay = useMemo(() => formatDigitsAsDdmmyyyy(fromDigits), [fromDigits]);
  const toDisplay = useMemo(() => formatDigitsAsDdmmyyyy(toDigits), [toDigits]);

  if (!open) return null;

  const apply = async () => {
    const nFrom = normalizePeriodDigits(fromDigits);
    const nTo = normalizePeriodDigits(toDigits);
    if (nFrom.digits && nFrom.digits !== fromDigits) setFromDigits(nFrom.digits);
    if (nTo.digits && nTo.digits !== toDigits) setToDigits(nTo.digits);
    const sd = nFrom.iso;
    const ed = nTo.iso;
    if (!sd || !ed) {
      await Swal.fire('Warning', 'Please enter valid From and To dates', 'warning');
      return;
    }
    if (sd > ed) {
      await Swal.fire('Warning', 'From Date cannot be greater than To Date', 'warning');
      return;
    }
    onApply?.({ startDate: sd, endDate: ed });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Change Period"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 text-center">
          <div className="text-lg font-bold text-slate-800">Change Period</div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-[90px_1fr] items-center gap-4">
            <div className="text-sm font-semibold text-slate-700">From</div>
            <input
              ref={fromInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={fromDisplay}
              onChange={(e) => setFromDigits(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
              onBlur={() => {
                const n = normalizePeriodDigits(fromDigits);
                if (n.digits) setFromDigits(n.digits);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const n = normalizePeriodDigits(fromDigits);
                  if (n.digits) setFromDigits(n.digits);
                  setTimeout(() => {
                    toInputRef.current?.focus?.();
                    toInputRef.current?.select?.();
                  }, 0);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose?.();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              placeholder="DD-MM-YYYY"
            />
          </div>

          <div className="grid grid-cols-[90px_1fr] items-center gap-4">
            <div className="text-sm font-semibold text-slate-700">To</div>
            <input
              ref={toInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={toDisplay}
              onChange={(e) => setToDigits(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
              onBlur={() => {
                const n = normalizePeriodDigits(toDigits);
                if (n.digits) setToDigits(n.digits);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  apply();
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose?.();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              placeholder="DD-MM-YYYY"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
