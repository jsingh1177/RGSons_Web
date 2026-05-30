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
import LedgerList from './components/LedgerList';
import LedgerOrder from './components/LedgerOrder';
import PriceManagement from './components/PriceManagement';
import Sales from './components/Sales';
import SalesEntry from './components/SalesEntry';
import PurchaseEntry from './components/PurchaseEntry';
import PurchaseInvoiceValue from './components/PurchaseInvoiceValue';
import Settings from './components/Settings';
import SizeOrder from './components/SizeOrder';
import CategoryOrder from './components/CategoryOrder';
import DailySaleReport from './components/DailySaleReport';
import StoreOperations from './components/StoreOperations';
import UserManagement from './components/UserManagement';
import CustomerLedger from './components/CustomerLedger';
import HODashboard from './components/HODashboard';
import HOReportsDashboard, { ReportsLayout } from './components/HOReportsDashboard';
import PurchaseSummaryReport from './components/PurchaseSummaryReport';
import PurchaseDetailReport from './components/PurchaseDetailReport';
import StockTransferOut from './components/StockTransferOut';
import StockTransferIn from './components/StockTransferIn';
import ClosingStockReport from './components/ClosingStockReport';
import ClosingStockStoreWise from './components/ClosingStockStoreWise';
import StockLedgerReport from './components/StockLedgerReport';
import StoreReportsDashboard from './components/StoreReportsDashboard';
import DayWiseSalesReport from './components/DayWiseSalesReport';
import DistrictWiseDailySaleReport from './components/DistrictWiseDailySaleReport';
import DsrStatusReport from './components/DsrStatusReport';
import StockTransferDetailReport from './components/StockTransferDetailReport';
import StockTransferSummaryReport from './components/StockTransferSummaryReport';
import VoucherConfiguration from './components/VoucherConfiguration';
import CollectionExpenseReport from './components/CollectionExpenseReport';
import './App.css';

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
  '/ledgers',
  '/price-management',
  '/users',
  '/settings',
  '/voucher-config',
  '/size-order',
  '/category-order',
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
    if (user.role === 'SUPPER' || user.role === 'ADMIN') {
      return '/dashboard';
    }
    if (user.storeType === 'HO' || user.role === 'HO USER' || user.role === 'HO_USER') {
      return '/ho-dashboard';
    }
    if (['USER', 'STORE USER'].includes(user.role)) {
      return '/store-dashboard';
    }
    return '/dashboard';
  };

  return (
    <Router>
      <MasterEscBackHandler />
      <div className="App">
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
            path="/stock-ledger-report"
            element={isAuthenticated ? <ReportsLayout><StockLedgerReport /></ReportsLayout> : <Navigate to="/login" />}
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
            element={isAuthenticated ? <ReportsLayout><DsrStatusReport /></ReportsLayout> : <Navigate to="/login" />}
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
