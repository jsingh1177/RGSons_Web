import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
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
import { formatDateDDMMYYYY } from './dateUtils';

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
  const [districtQuery, setDistrictQuery] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchActionRef = useRef(null);

  const startRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/stores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const stores = Array.isArray(res.data) ? res.data : (res.data?.stores || []);
        const districts = Array.from(
          new Set(
            (stores || [])
              .map((s) => String(s?.district || '').trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setDistrictOptions(districts);
        setStoreOptions(Array.isArray(stores) ? stores : []);
      } catch {
        setDistrictOptions([]);
        setStoreOptions([]);
      }
    };
    fetchFilterOptions();
  }, []);

  const filteredStoreOptions = useMemo(() => {
    const selectedDistrict = String(districtQuery || '').trim();
    const allStores = Array.isArray(storeOptions) ? storeOptions : [];
    return allStores.filter((store) => {
      if (!selectedDistrict) return true;
      return String(store?.district || '').trim() === selectedDistrict;
    });
  }, [districtQuery, storeOptions]);

  const selectedStoreLabel = useMemo(() => {
    const match = filteredStoreOptions.find((store) => {
      const code = String(store?.storeCode || '').trim();
      return code === String(selectedStoreName || '').trim();
    });
    if (!match) return '';
    const storeName = String(match?.storeName || '').trim();
    const storeCode = String(match?.storeCode || '').trim();
    return `${storeName}${storeCode ? ` (${storeCode})` : ''}`.trim();
  }, [filteredStoreOptions, selectedStoreName]);

  useEffect(() => {
    if (!selectedStoreName) return;
    const exists = filteredStoreOptions.some((store) => {
      return String(store?.storeCode || '').trim() === String(selectedStoreName || '').trim();
    });
    if (!exists) {
      setSelectedStoreName('');
    }
  }, [filteredStoreOptions, selectedStoreName]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      if (showChangePeriodModal) return;
      setShowChangePeriodModal(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChangePeriodModal]);

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
      const label = formatDateDDMMYYYY(iso) || (iso || '');
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
        params: { startDate, endDate, district: districtQuery, storeName: selectedStoreName },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch (e) {
      setError('Failed to load day wise sales');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [districtQuery, endDate, selectedStoreName, startDate]);
  searchActionRef.current = fetchData;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey) return;
      const k = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (k !== 's') return;
      e.preventDefault();
      searchActionRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, districtQuery, selectedStoreName, fetchData]);

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
              {startDate ? formatDateDDMMYYYY(startDate) : 'Select Date'}
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
              {endDate ? formatDateDDMMYYYY(endDate) : 'Select Date'}
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

        <div className="filter-group">
          <label>District</label>
          <select
            className="filter-input"
            value={districtQuery}
            onChange={(e) => setDistrictQuery(e.target.value)}
          >
            <option value="">All Districts</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Store</label>
          <select
            className="filter-input"
            value={selectedStoreName}
            onChange={(e) => setSelectedStoreName(e.target.value)}
          >
            <option value="">All Stores</option>
            {filteredStoreOptions.map((store) => {
              const storeName = String(store?.storeName || '').trim();
              const storeCode = String(store?.storeCode || '').trim();
              const label = `${storeName}${storeCode ? ` (${storeCode})` : ''}`.trim();
              return (
                <option key={`${storeCode}-${storeName}`} value={storeCode || storeName}>
                  {label}
                </option>
              );
            })}
          </select>
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
        <div className="day-wise-chart-title">
          {selectedStoreLabel ? `Total Sale of ${selectedStoreLabel} (Day Wise)` : 'Total Sale of All Stores (Day Wise)'}
        </div>
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

      <ChangePeriodModal
        open={showChangePeriodModal}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setShowChangePeriodModal(false)}
        onApply={({ startDate: sd, endDate: ed }) => {
          setStartDate(sd);
          setEndDate(ed);
          setShowChangePeriodModal(false);
          setTimeout(() => searchActionRef.current?.(), 0);
        }}
      />
    </div>
  );
};

export default DayWiseSalesReport;
