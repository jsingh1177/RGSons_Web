import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import GenericReportPage from './GenericReportPage';
import DateInputButton from './DateInputButton';
import './HOReportsDashboard.css';

const getRoleDashboardPath = () => {
  try {
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
  } catch {
    return '/dashboard';
  }
};

export const ReportsLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') || {};
    } catch {
      return {};
    }
  }, []);
  const normalizedRole = String(userInfo.role || '').trim().toUpperCase();
  const normalizedStoreType = String(userInfo.storeType || '').trim().toUpperCase();
  const canSeeHOMenu = normalizedRole === 'SUPPER'
    || normalizedRole === 'ADMIN'
    || normalizedRole === 'WAREHOUSE'
    || normalizedStoreType === 'HO'
    || normalizedRole === 'HO USER'
    || normalizedRole === 'HO_USER';
  const storeLocked = searchParams.get('lockedStore') === 'true';
  const lockedStoreCode = searchParams.get('storeCode') || '';
  const backParam = searchParams.get('back') || '';
  const modalGenericReportId = searchParams.get('genericReportId') || '';

  const [activeMenuKey, setActiveMenuKey] = useState(null);
  const [floatingTop, setFloatingTop] = useState(8);
  const railWrapRef = useRef(null);
  const [genericReports, setGenericReports] = useState([]);

  useEffect(() => {
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
      setActiveMenuKey(null);
      if (backParam) {
        navigate(backParam);
        return;
      }
      navigate(-1);
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [backParam, navigate]);

  useEffect(() => {
    const loadGenericReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/generic-reports', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data?.success) {
          setGenericReports(response.data.reportMasters || []);
        } else {
          setGenericReports([]);
        }
      } catch {
        setGenericReports([]);
      }
    };

    loadGenericReports();
  }, []);

  const buildReportUrl = (path) => {
    if (!storeLocked) return path;
    try {
      const url = new URL(path, window.location.origin);
      if (lockedStoreCode) url.searchParams.set('storeCode', lockedStoreCode);
      url.searchParams.set('lockedStore', 'true');
      if (backParam) url.searchParams.set('back', backParam);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      const params = new URLSearchParams();
      if (lockedStoreCode) params.set('storeCode', lockedStoreCode);
      params.set('lockedStore', 'true');
      if (backParam) params.set('back', backParam);
      return `${path}?${params.toString()}`;
    }
  };

  const handleNavigate = (path) => {
    setActiveMenuKey(null);
    navigate(buildReportUrl(path));
  };

  const handleOpenGenericReportModal = (reportId) => {
    setActiveMenuKey(null);
    const params = new URLSearchParams(location.search || '');
    params.set('genericReportId', String(reportId));
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const handleCloseGenericReportModal = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch {}
    const params = new URLSearchParams(location.search || '');
    params.delete('genericReportId');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
  };

  const handleDashboard = () => {
    setActiveMenuKey(null);
    navigate(getRoleDashboardPath());
  };

  const openMenu = (menuKey, event) => {
    if (!menuKey) {
      setActiveMenuKey(null);
      return;
    }

    setActiveMenuKey(menuKey);

    const wrapEl = railWrapRef.current;
    const btnEl = event?.currentTarget;
    if (!wrapEl || !btnEl) return;

    const wrapRect = wrapEl.getBoundingClientRect();
    const btnRect = btnEl.getBoundingClientRect();
    const desiredTop = Math.round(btnRect.top - wrapRect.top);
    const maxTop = Math.max(8, Math.round(wrapRect.height - 320));
    setFloatingTop(Math.max(8, Math.min(desiredTop, maxTop)));
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      onClick: handleDashboard
    },
    {
      key: 'transfers',
      label: 'Transfers',
      icon: '🔁',
      submenuTitle: 'Transfers',
      submenuItems: [
        { label: 'Stock Transfer Summary', icon: '🔁', onClick: () => handleNavigate('/stock-transfer-summary-report') },
        { label: 'Stock Transfer Detail', icon: '📄', onClick: () => handleNavigate('/stock-transfer-detail-report') }
      ]
    },
    {
      key: 'stock',
      label: 'Stock',
      icon: '📦',
      submenuTitle: 'Stock',
      submenuItems: [
        { label: 'Closing Stock - District Wise', icon: '🏙️', onClick: () => handleNavigate('/closing-stock-report') },
        { label: 'Closing Stock - Store Wise', icon: '🏪', onClick: () => handleNavigate('/closing-stock-store-wise') },
        { label: 'Closing Stock - Item Wise', icon: '📋', onClick: () => handleNavigate('/closing-stock-item-wise') },
        { label: 'Stock Ledger', icon: '📒', onClick: () => handleNavigate('/stock-ledger-report') }
      ]
    }
  ];
  const inventoryAnalysisMenu = {
    key: 'inventory-analysis',
    label: 'Inventory Analysis',
    icon: '📊',
    submenuTitle: 'Inventory Analysis',
    submenuItems: [
      { label: 'Inventory Replenishment Report', icon: '🧮', onClick: () => handleNavigate('/inventory-replenishment-report') }
    ]
  };

  const stockIndex = menuItems.findIndex(item => item.key === 'stock');
  if (stockIndex >= 0) {
    menuItems.splice(stockIndex + 1, 0, inventoryAnalysisMenu);
  } else {
    menuItems.push(inventoryAnalysisMenu);
  }

  if (genericReports.length > 0) {
    const inventoryAnalysisIndex = menuItems.findIndex(item => item.key === 'inventory-analysis');
    const genericMenu = {
      key: 'generic-reports',
      label: 'Generic Reports',
      icon: '🧾',
      submenuTitle: 'Generic Reports',
      submenuItems: genericReports.map((report) => ({
        label: report.reportName || `Report ${report.id}`,
        icon: '📄',
        onClick: () => handleOpenGenericReportModal(report.id)
      }))
    };

    if (inventoryAnalysisIndex >= 0) {
      menuItems.splice(inventoryAnalysisIndex + 1, 0, genericMenu);
    } else {
      menuItems.push(genericMenu);
    }
  }
  if (canSeeHOMenu) {
    menuItems.splice(1, 0,
      {
        key: 'purchase',
        label: 'Purchase',
        icon: '🛒',
        submenuTitle: 'Purchase',
        submenuItems: [
          { label: 'Purchase Summary', icon: '📄', onClick: () => handleNavigate('/purchase-summary-report') },
          { label: 'Purchase Detail', icon: '🧾', onClick: () => handleNavigate('/purchase-detail-report?view=purchase-detail') },
          { label: 'Item Wise-Party Wise Purchase', icon: '📃', onClick: () => handleNavigate('/purchase-detail-report?view=item-party') }
        ]
      },
      {
        key: 'sale',
        label: 'Sale',
        icon: '📈',
        submenuTitle: 'Sale',
        submenuItems: [
          { label: 'Day Wise Sales Report', icon: '📊', onClick: () => handleNavigate('/day-wise-sales-report') },
          { label: 'District Wise Daily Sale', icon: '🏙️', onClick: () => handleNavigate('/district-wise-daily-sale') },
          { label: 'DSR Status', icon: '✅', onClick: () => handleNavigate('/dsr-status-report') },
          { label: 'Sales Report (Amount)', icon: '💵', onClick: () => handleNavigate('/sales-report-amount') },
          { label: 'Other Sale', icon: '🧾', onClick: () => handleNavigate('/sales-report-other-sale') },
          { label: 'Price Segment Report', icon: '📋', onClick: () => handleNavigate('/price-segment-report') }
        ]
      },
      {
        key: 'coll-exp',
        label: 'Coll & Exp',
        icon: '💰',
        submenuTitle: 'Coll & Exp',
        submenuItems: [
          { label: 'Collection & Expense', icon: '📋', onClick: () => handleNavigate('/collection-expense-report') }
        ]
      }
    );
  }

  const activeMenu = menuItems.find(m => m.key === activeMenuKey && Array.isArray(m.submenuItems) && m.submenuItems.length > 0) || null;

  return (
    <div className="ho-reports-layout">
      <div ref={railWrapRef} className="reports-rail-wrap" onMouseLeave={() => setActiveMenuKey(null)}>
        <aside className="reports-rail">
          <div className="reports-rail-items">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`reports-rail-item ${activeMenuKey === item.key ? 'active' : ''}`}
                onMouseEnter={(e) => openMenu(item.submenuItems ? item.key : null, e)}
                onFocus={(e) => openMenu(item.submenuItems ? item.key : null, e)}
                onClick={(e) => {
                  if (item.onClick) {
                    item.onClick(e);
                    return;
                  }

                  if (item.submenuItems) {
                    openMenu(item.key, e);
                    return;
                  }

                  setActiveMenuKey(null);
                }}
              >
                <span className="reports-rail-icon" aria-hidden="true">{item.icon}</span>
                <span className="reports-rail-label">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {activeMenu && (
          <div className="reports-floating-panel" role="menu" aria-label={activeMenu.submenuTitle} style={{ top: `${floatingTop}px` }}>
            <div className="reports-floating-title">{activeMenu.submenuTitle}</div>
            <div className="reports-floating-items">
              {activeMenu.submenuItems.map((sub) => (
                <button
                  key={sub.label}
                  type="button"
                  className="reports-floating-item"
                  onClick={sub.onClick}
                >
                  <span className="reports-floating-icon" aria-hidden="true">{sub.icon}</span>
                  <span className="reports-floating-text">{sub.label}</span>
                  <span className="reports-floating-star" aria-hidden="true">★</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="ho-reports-content">
        {children}
      </main>

      {modalGenericReportId && (
        <div className="generic-report-modal-overlay" role="dialog" aria-modal="true" aria-label="Generic Report">
          <div className="generic-report-modal-shell">
            <GenericReportPage
              reportId={modalGenericReportId}
              onClose={handleCloseGenericReportModal}
              isModal
            />
          </div>
        </div>
      )}
    </div>
  );
};

const HOReportsDashboard = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);

  useEffect(() => {
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select both start and end dates'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [storeResponse, categoryResponse] = await Promise.all([
        axios.get(`/api/reports/sales/store-wise`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/reports/sales/category-wise`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setReportData(storeResponse.data);
      setCategoryData(categoryResponse.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch report data'
      });
    } finally {
      setLoading(false);
    }
  };
  searchActionRef.current = fetchReportData;

  const handleSearch = () => {
    fetchReportData();
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey) return;
      const k = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (k === 's') {
        e.preventDefault();
        searchActionRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <ReportsLayout>
      <div className="ho-reports-dashboard">
        <div className="reports-header">
          <h2>Report Dashboard</h2>
          <div className="header-actions">
            <button className="back-btn" onClick={() => navigate(getRoleDashboardPath())}>Back to Dashboard</button>
          </div>
        </div>

        <div className="filter-section">
          <div className="date-input-group">
            <label htmlFor="startDate">Start Date</label>
            <DateInputButton
              value={startDate}
              onChange={setStartDate}
              wrapperClassName="relative"
              buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">End Date</label>
            <DateInputButton
              value={endDate}
              onChange={setEndDate}
              wrapperClassName="relative"
              buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
            />
          </div>
          <button className="search-btn" onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        <div className="charts-container">
          <div className="chart-section">
            <div className="chart-title">Store Wise Total Sales</div>
            {reportData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reportData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="storeName" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="totalSales" name="Total Sales" fill="#3498db" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available for the selected period</div>
            )}
          </div>

          <div className="chart-section">
            <div className="chart-title">Category Wise Amount Analysis</div>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoryName" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="totalSales" name="Total Sales" fill="#2ecc71" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available for the selected period</div>
            )}
          </div>
        </div>

        {reportData.length > 0 && (
          <div className="table-section">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store Code</th>
                  <th>Store Name</th>
                  <th className="amount-column">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item) => (
                  <tr key={item.storeCode}>
                    <td>{item.storeCode}</td>
                    <td>{item.storeName}</td>
                    <td className="amount-column">{formatCurrency(item.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ReportsLayout>
  );
};

export default HOReportsDashboard;
