import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StoreDashboard from './components/StoreDashboard';
import StoreList from './components/StoreList';
import CategoryList from './components/CategoryList';
import BrandList from './components/BrandList';
import SizeList from './components/SizeList';
import UomList from './components/UomList';
import ItemList from './components/ItemList';
import InventoryList from './components/InventoryList';
import PartyList from './components/PartyList';
import LedMasterList from './components/LedMasterList';
import GroupMasterList from './components/GroupMasterList';
import LedgerList from './components/LedgerList';
import LedgerOrder from './components/LedgerOrder';
import PriceManagement from './components/PriceManagement';
import Sales from './components/Sales';
import SalesEntry from './components/SalesEntry';
import PurchaseEntry from './components/PurchaseEntry';
import DebitNoteEntry from './components/DebitNoteEntry';
import PurchaseInvoiceValue from './components/PurchaseInvoiceValue';
import Settings from './components/Settings';
import ReportsConfiguration from './components/ReportsConfiguration';
import SizeOrder from './components/SizeOrder';
import CategoryOrder from './components/CategoryOrder';
import MerchandiseHierarchy from './components/MerchandiseHierarchy';
import DailySaleReport from './components/DailySaleReport';
import StoreOperations from './components/StoreOperations';
import UserManagement from './components/UserManagement';
import CustomerLedger from './components/CustomerLedger';
import HODashboard from './components/HODashboard';
import WarehouseDashboard from './components/WarehouseDashboard';
import HOReportsDashboard, { ReportsLayout } from './components/HOReportsDashboard';
import PurchaseSummaryReport from './components/PurchaseSummaryReport';
import PurchaseDetailReport from './components/PurchaseDetailReport';
import StockTransferOut from './components/StockTransferOut';
import StockTransferIn from './components/StockTransferIn';
import ClosingStockReport from './components/ClosingStockReport';
import ClosingStockStoreWise from './components/ClosingStockStoreWise';
import ClosingStockItemWise from './components/ClosingStockItemWise';
import StockLedgerReport from './components/StockLedgerReport';
import StoreReportsDashboard from './components/StoreReportsDashboard';
import DayWiseSalesReport from './components/DayWiseSalesReport';
import DistrictWiseDailySaleReport from './components/DistrictWiseDailySaleReport';
import DsrStatusReport from './components/DsrStatusReport';
import PriceSegmentReport from './components/PriceSegmentReport';
import StockTransferDetailReport from './components/StockTransferDetailReport';
import StockTransferSummaryReport from './components/StockTransferSummaryReport';
import VoucherConfiguration from './components/VoucherConfiguration';
import CollectionExpenseReport from './components/CollectionExpenseReport';
import GenericReportPage from './components/GenericReportPage';
import InventoryReplenishmentReport from './components/InventoryReplenishmentReport';
import './App.css';

const sanitizeCalcExpression = (raw) => {
  const s = String(raw || '');
  const trimmed = s.slice(0, 200);
  const ok = /^[0-9+\-*/().%\s]*$/.test(trimmed);
  return ok ? trimmed : null;
};

const evalCalcExpression = (raw) => {
  const sanitized = sanitizeCalcExpression(raw);
  if (sanitized == null) return { ok: false, value: null };
  const expr = sanitized.trim();
  if (!expr) return { ok: true, value: 0 };
  const tokens = [];
  const s = expr.replace(/\s+/g, '');
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '(' || ch === ')') {
      tokens.push({ t: ch });
      i += 1;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ t: 'op', v: ch });
      i += 1;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1;
      while (j < s.length) {
        const c2 = s[j];
        if ((c2 >= '0' && c2 <= '9') || c2 === '.') {
          j += 1;
          continue;
        }
        break;
      }
      const rawNum = s.slice(i, j);
      if (!rawNum || rawNum === '.') return { ok: false, value: null };
      const num = Number(rawNum);
      if (!Number.isFinite(num)) return { ok: false, value: null };
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    return { ok: false, value: null };
  }

  const out = [];
  const ops = [];
  const prec = { 'u+': 3, 'u-': 3, '*': 2, '/': 2, '%': 2, '+': 1, '-': 1 };
  const rightAssoc = new Set(['u+', 'u-']);
  const isOp = (x) => x && x.t === 'op';

  for (let idx = 0; idx < tokens.length; idx += 1) {
    const tok = tokens[idx];
    if (tok.t === 'num') {
      out.push(tok);
      continue;
    }
    if (tok.t === '(') {
      ops.push(tok);
      continue;
    }
    if (tok.t === ')') {
      while (ops.length && ops[ops.length - 1].t !== '(') out.push(ops.pop());
      if (!ops.length || ops[ops.length - 1].t !== '(') return { ok: false, value: null };
      ops.pop();
      continue;
    }
    if (isOp(tok)) {
      const prev = idx > 0 ? tokens[idx - 1] : null;
      const unary = !prev || (prev.t === '(') || (isOp(prev));
      const opKey = unary ? (tok.v === '-' ? 'u-' : (tok.v === '+' ? 'u+' : null)) : tok.v;
      if (!opKey) return { ok: false, value: null };

      while (ops.length) {
        const top = ops[ops.length - 1];
        if (!isOp(top)) break;
        const a = prec[opKey];
        const b = prec[top.v];
        if (a == null || b == null) return { ok: false, value: null };
        if (rightAssoc.has(opKey) ? (a < b) : (a <= b)) {
          out.push(ops.pop());
          continue;
        }
        break;
      }
      ops.push({ t: 'op', v: opKey });
      continue;
    }
    return { ok: false, value: null };
  }

  while (ops.length) {
    const top = ops.pop();
    if (top.t === '(' || top.t === ')') return { ok: false, value: null };
    out.push(top);
  }

  const stack = [];
  for (const tok of out) {
    if (tok.t === 'num') {
      stack.push(tok.v);
      continue;
    }
    if (tok.t === 'op') {
      if (tok.v === 'u-' || tok.v === 'u+') {
        if (stack.length < 1) return { ok: false, value: null };
        const a = stack.pop();
        const v = tok.v === 'u-' ? -a : +a;
        if (!Number.isFinite(v)) return { ok: false, value: null };
        stack.push(v);
        continue;
      }
      if (stack.length < 2) return { ok: false, value: null };
      const b = stack.pop();
      const a = stack.pop();
      let v = null;
      if (tok.v === '+') v = a + b;
      else if (tok.v === '-') v = a - b;
      else if (tok.v === '*') v = a * b;
      else if (tok.v === '/') v = a / b;
      else if (tok.v === '%') v = a % b;
      else return { ok: false, value: null };
      if (!Number.isFinite(v)) return { ok: false, value: null };
      stack.push(v);
      continue;
    }
    return { ok: false, value: null };
  }

  if (stack.length !== 1) return { ok: false, value: null };
  return { ok: true, value: stack[0] };
};

function GlobalCalculator() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const inputRef = useRef(null);
  const openedFromHotkeyRef = useRef(false);
  const prevActiveElementRef = useRef(null);
  const prevSelectionRef = useRef(null);
  const prevRangeRef = useRef(null);
  const restorePendingRef = useRef(false);

  const close = useCallback(() => {
    restorePendingRef.current = Boolean(openedFromHotkeyRef.current && prevActiveElementRef.current);
    setOpen(false);
    openedFromHotkeyRef.current = false;
  }, []);

  const capturePrevFocus = useCallback(() => {
    try {
      const el = document.activeElement;
      prevActiveElementRef.current = el && el !== document.body ? el : null;
      prevSelectionRef.current = null;
      prevRangeRef.current = null;

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number') {
          prevSelectionRef.current = {
            start,
            end,
            direction: el.selectionDirection || 'none'
          };
        }
        return;
      }

      if (el && el.isContentEditable) {
        const sel = window.getSelection?.();
        if (sel && sel.rangeCount > 0) {
          prevRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      }
    } catch {}
  }, []);

  const compute = useCallback(() => {
    const out = evalCalcExpression(expr);
    if (!out.ok) {
      setResult('Error');
      return;
    }
    const v = out.value;
    const s = Number.isFinite(v) ? String(Number(v.toFixed(10))) : 'Error';
    setResult(s);
  }, [expr]);

  const append = useCallback((token) => {
    const next = `${expr}${token}`;
    const ok = sanitizeCalcExpression(next) != null;
    if (!ok) return;
    setExpr(next);
  }, [expr]);

  const backspace = useCallback(() => {
    setExpr((prev) => String(prev || '').slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setExpr('');
    setResult('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      try {
        inputRef.current?.focus?.();
        inputRef.current?.select?.();
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (open) return;
    if (!restorePendingRef.current) return;
    restorePendingRef.current = false;

    const t = window.setTimeout(() => {
      const el = prevActiveElementRef.current;
      if (!el || !el.isConnected) return;
      try {
        el.focus?.({ preventScroll: true });
      } catch {
        try {
          el.focus?.();
        } catch {}
      }

      try {
        if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && prevSelectionRef.current) {
          const { start, end, direction } = prevSelectionRef.current;
          el.setSelectionRange?.(start, end, direction);
          return;
        }

        if (el.isContentEditable && prevRangeRef.current) {
          const sel = window.getSelection?.();
          if (!sel) return;
          sel.removeAllRanges();
          sel.addRange(prevRangeRef.current);
        }
      } catch {}
    }, 0);

    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = String(e.key || '');
      const lower = key.toLowerCase();
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && lower === 'c') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        if (open) {
          close();
          return;
        }
        capturePrevFocus();
        openedFromHotkeyRef.current = true;
        setOpen(true);
        return;
      }

      if (!open) return;

      if (key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        close();
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        compute();
        return;
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [close, compute, open]);

  if (!open) return null;

  const btn = "px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-mono text-sm hover:bg-slate-50 active:bg-slate-100";
  const btnOp = "px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-mono text-sm hover:bg-indigo-100 active:bg-indigo-200";
  const btnDanger = "px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-mono text-sm hover:bg-rose-100 active:bg-rose-200";
  const btnEq = "px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-sm hover:bg-emerald-100 active:bg-emerald-200";

  return (
    <div
      className="fixed inset-0 z-[20000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Calculator"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="font-bold text-slate-800">Calculator</div>
          <button
            type="button"
            onClick={close}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={expr}
            onChange={(e) => {
              const next = e.target.value;
              const sanitized = sanitizeCalcExpression(next);
              if (sanitized == null) return;
              setExpr(sanitized);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono text-base focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="0"
            autoComplete="off"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-mono">ALT+C</div>
            <div className="text-right font-mono text-sm text-slate-700 min-h-[1.25rem]">{result}</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button type="button" className={btnDanger} onClick={clearAll}>C</button>
            <button type="button" className={btn} onClick={backspace}>⌫</button>
            <button type="button" className={btnOp} onClick={() => append('(')}>(</button>
            <button type="button" className={btnOp} onClick={() => append(')')}>)</button>

            <button type="button" className={btn} onClick={() => append('7')}>7</button>
            <button type="button" className={btn} onClick={() => append('8')}>8</button>
            <button type="button" className={btn} onClick={() => append('9')}>9</button>
            <button type="button" className={btnOp} onClick={() => append('/')}>/</button>

            <button type="button" className={btn} onClick={() => append('4')}>4</button>
            <button type="button" className={btn} onClick={() => append('5')}>5</button>
            <button type="button" className={btn} onClick={() => append('6')}>6</button>
            <button type="button" className={btnOp} onClick={() => append('*')}>*</button>

            <button type="button" className={btn} onClick={() => append('1')}>1</button>
            <button type="button" className={btn} onClick={() => append('2')}>2</button>
            <button type="button" className={btn} onClick={() => append('3')}>3</button>
            <button type="button" className={btnOp} onClick={() => append('-')}>-</button>

            <button type="button" className={btn} onClick={() => append('0')}>0</button>
            <button type="button" className={btn} onClick={() => append('.')}>.</button>
            <button type="button" className={btnEq} onClick={compute}>=</button>
            <button type="button" className={btnOp} onClick={() => append('+')}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DASHBOARD_PATHS = new Set([
  '/dashboard',
  '/store-dashboard',
  '/ho-dashboard',
  '/ho-reports',
  '/store-reports'
]);

const MASTER_PATHS = new Set([
  '/stores',
  '/categories',
  '/brands',
  '/sizes',
  '/uoms',
  '/items',
  '/parties',
  '/led-master',
  '/accounting-groups',
  '/ledgers',
  '/price-management',
  '/users',
  '/settings',
  '/voucher-config',
  '/reports-config',
  '/size-order',
  '/category-order',
  '/merchandise-hierarchy',
  '/inventory',
  '/store-operations'
]);

function MasterEscBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  const isEmbedded = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (isEmbedded()) return;
    const path = String(location.pathname || '');
    if (DASHBOARD_PATHS.has(path)) return;
    if (!MASTER_PATHS.has(path)) return;

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (e.defaultPrevented) return;
      const modalOpen = Boolean(
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('.modal-overlay') ||
        document.querySelector('.swal2-container')
      );
      if (modalOpen) return;
      e.preventDefault();
      navigate(-1);
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isEmbedded, location.pathname, navigate]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityLimitMs, setInactivityLimitMs] = useState(2 * 60 * 60 * 1000);
  const authStateRef = useRef({ isAuthenticated: false });

  useEffect(() => {
    const loadClientConfig = async () => {
      try {
        const res = await fetch('/api/auth/config', { cache: 'no-store' });
        const data = await res.json();
        const minutes = Number(data?.sessionTimeoutMinutes);
        if (Number.isFinite(minutes) && minutes > 0) {
          setInactivityLimitMs(Math.round(minutes * 60 * 1000));
        }
      } catch {}
    };
    loadClientConfig();
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(token !== null);
      setIsLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes to update auth state
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // Session expiry logic
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimer;
    let cleanupIframeListeners = () => {};
    let mutationObserver;
    const lastPersistedActivityRef = { value: 0 };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      setIsAuthenticated(false);
    };

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      const now = Date.now();
      if (now - lastPersistedActivityRef.value > 15000) {
        localStorage.setItem('lastActivity', now.toString());
        lastPersistedActivityRef.value = now;
      }
      inactivityTimer = setTimeout(logout, inactivityLimitMs);
    };

    // Check last activity on mount/auth change
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity && Date.now() - parseInt(lastActivity) > inactivityLimitMs) {
      logout();
    } else {
      resetTimer();
    }

    const activityEvents = [
      'keydown',
      'keyup',
      'input',
      'change',
      'mousedown',
      'mouseup',
      'click',
      'dblclick',
      'contextmenu',
      'wheel',
      'mousemove',
      'touchstart',
      'touchmove',
      'pointerdown',
      'pointermove',
      'pointerup',
      'scroll',
      'focus'
    ];
    const addActivityListeners = (target) => {
      if (!target?.addEventListener) return;
      activityEvents.forEach(event => {
        try { target.addEventListener(event, resetTimer, true); } catch {}
      });
    };
    const removeActivityListeners = (target) => {
      if (!target?.removeEventListener) return;
      activityEvents.forEach(event => {
        try { target.removeEventListener(event, resetTimer, true); } catch {}
      });
    };

    addActivityListeners(window);
    addActivityListeners(document);

    const tryAttachActivityListenersToIframe = (iframeEl, attached) => {
      if (!iframeEl || attached.has(iframeEl)) return;
      const onLoad = () => {
        try {
          const w = iframeEl.contentWindow;
          const d = w?.document;
          if (!w || !d) return;
          addActivityListeners(w);
          addActivityListeners(d);
          attached.add(iframeEl);
        } catch {}
      };
      iframeEl.addEventListener('load', onLoad);
      onLoad();
      return () => iframeEl.removeEventListener('load', onLoad);
    };

    const bindIframesActivity = () => {
      const attached = new WeakSet();
      const unbinders = [];
      const attachExisting = () => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        iframes.forEach(iframeEl => {
          const unbind = tryAttachActivityListenersToIframe(iframeEl, attached);
          if (typeof unbind === 'function') unbinders.push(unbind);
        });
      };
      attachExisting();
      mutationObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of Array.from(m.addedNodes || [])) {
            if (!node) continue;
            if (node.tagName === 'IFRAME') {
              const unbind = tryAttachActivityListenersToIframe(node, attached);
              if (typeof unbind === 'function') unbinders.push(unbind);
            } else if (node.querySelectorAll) {
              const iframes = Array.from(node.querySelectorAll('iframe'));
              iframes.forEach(iframeEl => {
                const unbind = tryAttachActivityListenersToIframe(iframeEl, attached);
                if (typeof unbind === 'function') unbinders.push(unbind);
              });
            }
          }
        }
      });
      if (document.body) mutationObserver.observe(document.body, { childList: true, subtree: true });
      return () => {
        if (mutationObserver) mutationObserver.disconnect();
        unbinders.forEach(fn => {
          try { fn(); } catch {}
        });
      };
    };

    cleanupIframeListeners = bindIframesActivity();

    const onStorage = (e) => {
      if (!authStateRef.current.isAuthenticated) return;
      if (e?.key === 'lastActivity') resetTimer();
    };
    window.addEventListener('storage', onStorage);

    const onVisibilityChange = () => {
      if (!authStateRef.current.isAuthenticated) return;
      if (!document.hidden) resetTimer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange, true);

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      removeActivityListeners(window);
      removeActivityListeners(document);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange, true);
      cleanupIframeListeners?.();
    };
  }, [inactivityLimitMs, isAuthenticated]);

  useEffect(() => {
    authStateRef.current.isAuthenticated = isAuthenticated;
  }, [isAuthenticated]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const getRedirectPath = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = String(user.role || '').trim().toUpperCase();
    if (role === 'SUPPER' || role === 'ADMIN') {
      return '/dashboard';
    }
    if (role === 'WAREHOUSE') {
      return '/warehouse-dashboard';
    }
    if (user.storeType === 'HO' || role === 'HO USER' || role === 'HO_USER') {
      return '/ho-dashboard';
    }
    if (['USER', 'STORE USER'].includes(role)) {
      return '/store-dashboard';
    }
    return '/dashboard';
  };

  return (
    <Router>
      <MasterEscBackHandler />
      <div className="App">
        <GlobalCalculator />
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to={getRedirectPath()} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ho-dashboard" 
            element={isAuthenticated ? <HODashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route
            path="/warehouse-dashboard"
            element={isAuthenticated ? <WarehouseDashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/ho-reports" 
            element={isAuthenticated ? <HOReportsDashboard /> : <Navigate to="/login" />} 
          />
          <Route
            path="/purchase-summary-report"
            element={isAuthenticated ? <ReportsLayout><PurchaseSummaryReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/purchase-detail-report"
            element={isAuthenticated ? <ReportsLayout><PurchaseDetailReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route 
            path="/collection-expense-report" 
            element={isAuthenticated ? <ReportsLayout><CollectionExpenseReport /></ReportsLayout> : <Navigate to="/login" />} 
          />
          <Route 
            path="/closing-stock-report" 
            element={isAuthenticated ? <ReportsLayout><ClosingStockReport /></ReportsLayout> : <Navigate to="/login" />} 
          />
          <Route 
            path="/closing-stock-store-wise" 
            element={isAuthenticated ? <ReportsLayout><ClosingStockStoreWise /></ReportsLayout> : <Navigate to="/login" />} 
          />
          <Route
            path="/closing-stock-item-wise"
            element={isAuthenticated ? <ReportsLayout><ClosingStockItemWise /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/stock-ledger-report"
            element={isAuthenticated ? <ReportsLayout><StockLedgerReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/inventory-replenishment-report"
            element={isAuthenticated ? <ReportsLayout><InventoryReplenishmentReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route 
            path="/stock-transfer-out" 
            element={isAuthenticated ? <StockTransferOut /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/stock-transfer-in" 
            element={isAuthenticated ? <StockTransferIn /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store-dashboard" 
            element={isAuthenticated ? <StoreDashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route
            path="/store-reports"
            element={isAuthenticated ? <StoreReportsDashboard /> : <Navigate to="/login" />}
          />
          <Route 
            path="/store-operations" 
            element={isAuthenticated ? <StoreOperations /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales" 
            element={isAuthenticated ? <Sales /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales-entry" 
            element={isAuthenticated ? <SalesEntry /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/purchase-entry" 
            element={isAuthenticated ? <PurchaseEntry /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/debit-note-entry" 
            element={isAuthenticated ? <DebitNoteEntry /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/purchase-invoice-value" 
            element={isAuthenticated ? <PurchaseInvoiceValue /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/stores" 
            element={isAuthenticated ? <StoreList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/categories" 
            element={isAuthenticated ? <CategoryList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/brands" 
            element={isAuthenticated ? <BrandList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sizes" 
            element={isAuthenticated ? <SizeList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/uoms" 
            element={isAuthenticated ? <UomList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/items" 
            element={isAuthenticated ? <ItemList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/inventory" 
            element={isAuthenticated ? <InventoryList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/parties" 
            element={isAuthenticated ? <PartyList /> : <Navigate to="/login" />} 
          />
          <Route
            path="/led-master"
            element={isAuthenticated ? <LedMasterList /> : <Navigate to="/login" />}
          />
          <Route
            path="/accounting-groups"
            element={isAuthenticated ? <GroupMasterList /> : <Navigate to="/login" />}
          />
          <Route 
            path="/price-management" 
            element={isAuthenticated ? <PriceManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/settings" 
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/voucher-config" 
            element={isAuthenticated ? <VoucherConfiguration /> : <Navigate to="/login" />} 
          />
          <Route
            path="/reports-config"
            element={isAuthenticated ? <ReportsConfiguration /> : <Navigate to="/login" />}
          />
          <Route 
            path="/users" 
            element={isAuthenticated ? <UserManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/size-order" 
            element={isAuthenticated ? <SizeOrder /> : <Navigate to="/login" />} 
          />
          <Route
            path="/category-order"
            element={isAuthenticated ? <CategoryOrder /> : <Navigate to="/login" />}
          />
          <Route
            path="/merchandise-hierarchy"
            element={isAuthenticated ? <MerchandiseHierarchy /> : <Navigate to="/login" />}
          />
          <Route 
            path="/dsr" 
            element={isAuthenticated ? <ReportsLayout><DailySaleReport /></ReportsLayout> : <Navigate to="/login" />} 
          />
          <Route
            path="/day-wise-sales-report"
            element={isAuthenticated ? <ReportsLayout><DayWiseSalesReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/district-wise-daily-sale"
            element={isAuthenticated ? <ReportsLayout><DistrictWiseDailySaleReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/dsr-status-report"
            element={isAuthenticated ? <ReportsLayout><DsrStatusReport reportMode="count" /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/sales-report-amount"
            element={isAuthenticated ? <ReportsLayout><DsrStatusReport reportMode="amount" /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/sales-report-other-sale"
            element={isAuthenticated ? <ReportsLayout><DsrStatusReport reportMode="otherSale" /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/price-segment-report"
            element={isAuthenticated ? <ReportsLayout><PriceSegmentReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/stock-transfer-summary-report"
            element={isAuthenticated ? <ReportsLayout><StockTransferSummaryReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/stock-transfer-detail-report"
            element={isAuthenticated ? <ReportsLayout><StockTransferDetailReport /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route
            path="/generic-reports/:reportId"
            element={isAuthenticated ? <ReportsLayout><GenericReportPage /></ReportsLayout> : <Navigate to="/login" />}
          />
          <Route 
            path="/ledgers" 
            element={isAuthenticated ? <LedgerList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ledger-order" 
            element={isAuthenticated ? <LedgerOrder /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/customer-ledger" 
            element={isAuthenticated ? <CustomerLedger /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/"  
            element={<Navigate to={isAuthenticated ? getRedirectPath() : "/login"} />} 
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? getRedirectPath() : "/login"} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
