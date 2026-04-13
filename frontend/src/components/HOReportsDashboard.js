import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import './HOReportsDashboard.css';

const HOReportsDashboard = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState(null);
  const [floatingTop, setFloatingTop] = useState(8);
  const railWrapRef = useRef(null);

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

  const handleSearch = () => {
    fetchReportData();
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleComingSoon = (title) => {
    setActiveMenuKey(null);
    Swal.fire({ icon: 'info', title, text: 'Coming soon' });
  };

  const handleNavigate = (path) => {
    setActiveMenuKey(null);
    navigate(path);
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
      key: 'purchase',
      label: 'Purchase',
      icon: '🛒',
      submenuTitle: 'Purchase',
      submenuItems: [
        { label: 'Purchase Summary', icon: '📄', onClick: () => handleNavigate('/purchase-summary-report') },
        { label: 'Purchase Detail', icon: '📃', onClick: () => handleComingSoon('Purchase Detail') }
      ]
    },
    { key: 'sale', label: 'Sale', icon: '📈', onClick: () => handleComingSoon('Sale') },
    { key: 'transfers', label: 'Transfers', icon: '🔁', onClick: () => handleComingSoon('Transfers') },
    {
      key: 'coll-exp',
      label: 'Coll & Exp',
      icon: '💰',
      submenuTitle: 'Coll & Exp',
      submenuItems: [
        { label: 'Collection & Expense', icon: '📋', onClick: () => handleNavigate('/collection-expense-report') }
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
        { label: 'Stock Ledger', icon: '📒', onClick: () => handleNavigate('/stock-ledger-report') }
      ]
    }
  ];

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
        <div className="reports-header">
          <h2>Report Dashboard</h2>
          <div className="header-actions">
            <button className="back-btn" onClick={() => navigate('/ho-dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="filter-section">
          <div className="date-input-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
      </main>
    </div>
  );
};

export default HOReportsDashboard;
