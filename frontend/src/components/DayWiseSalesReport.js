import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './ClosingStockReport.css';
import './DayWiseSalesReport.css';

const DayWiseSalesReport = () => {
  const navigate = useNavigate();
  const defaultBackPath = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'STORE USER' ? '/store-dashboard' : '/ho-reports';
    } catch {
      return '/ho-reports';
    }
  }, []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const openPicker = (ref) => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {}
    }
    try {
      el.focus();
      el.click();
    } catch {}
  };

  const toLacs = (amount) => (Number(amount) || 0) / 100000;

  const chartData = useMemo(() => {
    return (rows || []).map(r => {
      const iso = r.date;
      const d = iso ? new Date(iso) : null;
      const label = d && !isNaN(d.getTime())
        ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : (iso || '');
      return {
        date: iso,
        label,
        salesLacs: toLacs(r.totalSales)
      };
    });
  }, [rows]);

  const totalSalesLacs = useMemo(() => {
    const sum = (rows || []).reduce((acc, r) => acc + (Number(r.totalSales) || 0), 0);
    return toLacs(sum);
  }, [rows]);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/day-wise-total', {
        params: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch (e) {
      setError('Failed to load day wise sales');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, fetchData]);

  const formatLacs = (v) => `${Number(v || 0).toFixed(2)} L`;

  return (
    <div className="report-container day-wise-sales-report">
      <div className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>← Back</button>
        <h1>Day Wise Sales Report</h1>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>From</label>
          <div className="date-picker-wrapper">
            <span className="date-picker-icon" aria-hidden="true"><Calendar size={16} /></span>
            <button
              type="button"
              className="date-picker-button"
              onClick={() => openPicker(startRef)}
            >
              {startDate || 'Select Date'}
            </button>
            <input
              ref={startRef}
              type="date"
              className="date-picker-native"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>To</label>
          <div className="date-picker-wrapper">
            <span className="date-picker-icon" aria-hidden="true"><Calendar size={16} /></span>
            <button
              type="button"
              className="date-picker-button"
              onClick={() => openPicker(endRef)}
            >
              {endDate || 'Select Date'}
            </button>
            <input
              ref={endRef}
              type="date"
              className="date-picker-native"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <button className="search-btn" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      <div className="day-wise-summary">
        <div className="day-wise-summary-card">
          <div className="day-wise-summary-title">Total Sale (Lacs)</div>
          <div className="day-wise-summary-value">{formatLacs(totalSalesLacs)}</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="day-wise-chart-card">
        <div className="day-wise-chart-title">Total Sale of All Stores (Day Wise)</div>
        <div className="day-wise-chart-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatLacs} tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(value) => formatLacs(value)} />
              <Line type="monotone" dataKey="salesLacs" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DayWiseSalesReport;
