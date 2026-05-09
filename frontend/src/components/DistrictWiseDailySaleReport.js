import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import './ClosingStockReport.css';

const DistrictWiseDailySaleReport = () => {
  const navigate = useNavigate();
  const defaultBackPath = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'STORE USER' ? '/store-dashboard' : '/ho-reports';
    } catch {
      return '/ho-reports';
    }
  }, []);
  const filterStorageKey = 'RG_filters:district-wise-daily-sale';
  const initialFilters = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaults = {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };

    const params = new URLSearchParams(window.location.search || '');
    const fromUrl = {
      startDate: String(params.get('startDate') || '').trim(),
      endDate: String(params.get('endDate') || '').trim(),
      districtQuery: String(params.get('district') || '').trim(),
      selectedStoreName: String(params.get('storeName') || '').trim(),
      storeSearchInput: String(params.get('storeInput') || '').trim()
    };

    const hasUrl = Object.values(fromUrl).some(v => v);
    let stored = null;
    if (!hasUrl) {
      try {
        const raw = localStorage.getItem(filterStorageKey);
        if (raw) stored = JSON.parse(raw);
      } catch {
        stored = null;
      }
    }

    const base = hasUrl ? fromUrl : (stored || {});
    const startDate = (base.startDate && /^\d{4}-\d{2}-\d{2}$/.test(String(base.startDate)))
      ? String(base.startDate)
      : defaults.startDate;
    const endDate = (base.endDate && /^\d{4}-\d{2}-\d{2}$/.test(String(base.endDate)))
      ? String(base.endDate)
      : defaults.endDate;
    const districtQuery = String(base.districtQuery || base.district || '').trim();
    const storeSearchInput = String(base.storeSearchInput || base.storeInput || '').trim();
    let selectedStoreName = String(base.selectedStoreName || base.storeName || '').trim();
    if (!selectedStoreName && storeSearchInput) {
      selectedStoreName = String(storeSearchInput.split('(')[0] || '').trim();
    }

    return { startDate, endDate, districtQuery, storeSearchInput, selectedStoreName };
  }, []);

  const [startDate, setStartDate] = useState(() => initialFilters.startDate);
  const [endDate, setEndDate] = useState(() => initialFilters.endDate);
  const [districtQuery, setDistrictQuery] = useState(() => initialFilters.districtQuery);
  const [storeSearchInput, setStoreSearchInput] = useState(() => initialFilters.storeSearchInput);
  const [selectedStoreName, setSelectedStoreName] = useState(() => initialFilters.selectedStoreName);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [districtResults, setDistrictResults] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [focusedDistrictIndex, setFocusedDistrictIndex] = useState(-1);
  const [storeResults, setStoreResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const districtInputRef = useRef(null);
  const storeInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const autoSearchDoneRef = useRef(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());

  useEffect(() => {
    const payload = { startDate, endDate, districtQuery, storeSearchInput, selectedStoreName };
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(payload));
    } catch {}

    const params = new URLSearchParams(window.location.search || '');
    const setOrDelete = (k, v) => {
      const value = String(v || '').trim();
      if (value) params.set(k, value);
      else params.delete(k);
    };
    setOrDelete('startDate', startDate);
    setOrDelete('endDate', endDate);
    setOrDelete('district', districtQuery);
    setOrDelete('storeName', selectedStoreName);
    setOrDelete('storeInput', storeSearchInput);
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [districtQuery, endDate, filterStorageKey, selectedStoreName, startDate, storeSearchInput]);

  useEffect(() => {
    if (focusedDistrictIndex >= 0 && showDistrictSuggestions) {
      const el = document.getElementById(`suggestion-district-${focusedDistrictIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedDistrictIndex, showDistrictSuggestions]);

  useEffect(() => {
    if (focusedStoreIndex >= 0 && showStoreSuggestions) {
      const el = document.getElementById(`suggestion-store-${focusedStoreIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedStoreIndex, showStoreSuggestions]);

  const selectDistrict = (value) => {
    setDistrictQuery(value);
    setShowDistrictSuggestions(false);
    setFocusedDistrictIndex(-1);
    setStoreSearchInput('');
    setSelectedStoreName('');
    if (storeInputRef.current) storeInputRef.current.focus();
  };

  const selectStore = (store) => {
    if (!store) return;
    setSelectedStoreName(String(store?.storeName || '').trim());
    setStoreSearchInput(`${String(store?.storeName || '').trim()} (${String(store?.storeCode || '').trim()})`.trim());
    setShowStoreSuggestions(false);
    setFocusedStoreIndex(-1);
  };

  const handleDistrictInputChange = (e) => {
    const value = e.target.value;
    setDistrictQuery(value);
    setFocusedDistrictIndex(-1);
    const q = (value || '').trim().toLowerCase();
    if (!q) {
      setDistrictResults(districtOptions);
    } else {
      setDistrictResults(districtOptions.filter(d => d.toLowerCase().includes(q)));
    }
    setShowDistrictSuggestions(true);
  };

  const handleDistrictInputFocus = () => {
    const q = (districtQuery || '').trim().toLowerCase();
    if (!q) {
      setDistrictResults(districtOptions);
    } else {
      setDistrictResults(districtOptions.filter(d => d.toLowerCase().includes(q)));
    }
    setShowDistrictSuggestions(true);
  };

  const handleDistrictKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDistrictSuggestions && focusedDistrictIndex >= 0 && districtResults[focusedDistrictIndex]) {
        selectDistrict(districtResults[focusedDistrictIndex]);
      } else {
        setShowDistrictSuggestions(false);
        if (storeInputRef.current) storeInputRef.current.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedDistrictIndex(prev => prev < districtResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedDistrictIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDistrictSuggestions(false);
      setFocusedDistrictIndex(-1);
    }
  };

  const filterStoresForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    const districtFiltered = districtQuery
      ? all.filter(s => String(s?.district || '').trim() === String(districtQuery || '').trim())
      : all;
    if (!v) return districtFiltered.slice(0, 50);
    const filtered = districtFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    });
    return filtered.slice(0, 50);
  };

  const handleStoreInputChange = (e) => {
    const value = e.target.value;
    setStoreSearchInput(value);
    setSelectedStoreName('');
    setFocusedStoreIndex(-1);
    if (!value) {
      setStoreResults([]);
      setShowStoreSuggestions(false);
      return;
    }
    const results = filterStoresForSearch(value);
    setStoreResults(results);
    setShowStoreSuggestions(true);
    setFocusedStoreIndex(results.length ? 0 : -1);
  };

  const handleStoreInputFocus = () => {
    const results = filterStoresForSearch(storeSearchInput);
    setStoreResults(results);
    setShowStoreSuggestions(true);
    setFocusedStoreIndex(results.length ? 0 : -1);
  };

  const handleStoreKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showStoreSuggestions && focusedStoreIndex >= 0 && storeResults[focusedStoreIndex]) {
        selectStore(storeResults[focusedStoreIndex]);
      } else {
        setShowStoreSuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedStoreIndex(prev => prev < storeResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedStoreIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowStoreSuggestions(false);
      setFocusedStoreIndex(-1);
    }
  };

  useEffect(() => {
    const fetchStoreOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/stores', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const stores = Array.isArray(res.data)
          ? res.data
          : (res.data?.stores || []);

        const districts = new Set();

        for (const s of stores) {
          const d = String(s?.district || '').trim();
          if (d) districts.add(d);
        }

        setDistrictOptions(Array.from(districts).sort((a, b) => a.localeCompare(b)));
        setStoreOptions(Array.isArray(stores) ? stores : []);
      } catch {
        setDistrictOptions([]);
        setStoreOptions([]);
      }
    };
    fetchStoreOptions();
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

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatAmount = (v) => {
    const n = Number(v || 0);
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const filteredRows = useMemo(() => {
    const dq = (districtQuery || '').trim().toLowerCase();
    const sq = (selectedStoreName || storeSearchInput || '').trim().toLowerCase();
    if (!dq && !sq) return rows || [];
    return (rows || []).filter(r => {
      const districtName = String(r?.districtName || '').toLowerCase();
      const storeName = String(r?.storeName || '').toLowerCase();
      const storeCode = String(r?.storeCode || '').toLowerCase();
      const okDistrict = !dq || districtName.includes(dq);
      const okStore = !sq || storeName.includes(sq) || storeCode.includes(sq);
      return okDistrict && okStore;
    });
  }, [rows, districtQuery, storeSearchInput]);

  const totals = useMemo(() => {
    return (filteredRows || []).reduce((acc, r) => {
      acc.qty += Number(r.totalQty || 0);
      acc.sale += Number(r.saleAmount || 0);
      acc.other += Number(r.otherSale || 0);
      acc.exp += Number(r.expense || 0);
      acc.total += Number(r.totalSale || 0);
      acc.tender += Number(r.tenderAmount || 0);
      return acc;
    }, { qty: 0, sale: 0, other: 0, exp: 0, total: 0, tender: 0 });
  }, [filteredRows]);

  const selectableRowKeys = useMemo(() => {
    return (filteredRows || []).map((r, idx) => {
      const bill = String(r?.billNumber || '').trim();
      const storeCode = String(r?.storeCode || '').trim();
      const date = String(r?.date || '').trim();
      return `dws:${storeCode}:${bill}:${date}:${idx}`;
    });
  }, [filteredRows]);

  const selectableRowIndexByKey = useMemo(() => {
    const map = new Map();
    selectableRowKeys.forEach((k, idx) => map.set(k, idx));
    return map;
  }, [selectableRowKeys]);

  useEffect(() => {
    setSelectedRowKeys(new Set());
    setFocusedRowIndex(selectableRowKeys.length > 0 ? 0 : -1);
  }, [selectableRowKeys]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    if (focusedRowIndex < 0 || focusedRowIndex >= selectableRowKeys.length) return;
    const rowKey = selectableRowKeys[focusedRowIndex];
    const tr = el.querySelector(`tr[data-row-key="${rowKey}"]`);
    if (tr && typeof tr.scrollIntoView === 'function') {
      try {
        tr.scrollIntoView({ block: 'nearest' });
      } catch {}
    }
  }, [focusedRowIndex, selectableRowKeys]);

  const toggleSelectedRow = (rowKey) => {
    if (!rowKey) return;
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleReportTableKeyDown = (e) => {
    const el = tableContainerRef.current;
    if (!el) return;

    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      el.scrollLeft -= 80;
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollLeft += 80;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectableRowKeys.length === 0) return;
      setFocusedRowIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectableRowKeys.length === 0) return;
      setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1)));
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (selectableRowKeys.length === 0) return;
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= selectableRowKeys.length) return;
      toggleSelectedRow(selectableRowKeys[idx]);
    }
  };

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/district-wise-daily', {
        params: { startDate, endDate, district: districtQuery, storeName: selectedStoreName || '' },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch (e) {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, selectedStoreName]);

  useEffect(() => {
    if (autoSearchDoneRef.current) return;
    if (!startDate || !endDate) return;
    autoSearchDoneRef.current = true;
    fetchData();
  }, [endDate, fetchData, startDate]);

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/sales/district-wise-daily/export', {
        params: { startDate, endDate, district: districtQuery, storeName: selectedStoreName || '' },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `district_wise_daily_sale_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Failed to download excel');
    }
  };

  const openVoucherModal = (href, title) => {
    if (!href) return;
    setVoucherModalHref(href);
    setVoucherModalTitle(title || 'Sale Voucher');
    setVoucherModalOpen(true);
  };

  const closeVoucherModal = () => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
  };

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeVoucherModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [voucherModalOpen]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
      closeVoucherModal();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [voucherModalOpen]);

  return (
    <div className="report-container stock-ledger-container stock-ledger-report district-wise-daily-sale-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>Back</button>
        <h1 className="stock-ledger-title">District Wise Daily Sale</h1>
        <div className="stock-ledger-header-actions">
          <button className="export-btn stock-ledger-export-btn" onClick={handleDownload} disabled={loading || rows.length === 0}>
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>State</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={districtInputRef}
              value={districtQuery}
              onChange={handleDistrictInputChange}
              onFocus={handleDistrictInputFocus}
              onKeyDown={handleDistrictKeyDown}
              onBlur={() => {
                window.setTimeout(() => setShowDistrictSuggestions(false), 150);
              }}
              placeholder="Search..."
              disabled={loading}
              autoComplete="off"
            />
            {showDistrictSuggestions && districtResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {districtResults.map((d, idx) => (
                  <div
                    key={d}
                    id={`suggestion-district-${idx}`}
                    onMouseDown={() => selectDistrict(d)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedDistrictIndex ? '#eef2ff' : '#fff' }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Store</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={storeInputRef}
              value={storeSearchInput}
              onChange={handleStoreInputChange}
              onFocus={handleStoreInputFocus}
              onKeyDown={handleStoreKeyDown}
              onBlur={() => {
                window.setTimeout(() => setShowStoreSuggestions(false), 150);
              }}
              placeholder="Search store code or name"
              disabled={loading}
              autoComplete="off"
            />
            {showStoreSuggestions && storeResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {storeResults.map((s, idx) => (
                  <div
                    key={`${String(s?.storeCode || idx)}-${idx}`}
                    id={`suggestion-store-${idx}`}
                    onMouseDown={() => selectStore(s)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedStoreIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(s?.storeName || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                      {String(s?.storeCode || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>From</label>
          <div className="date-picker-wrapper">
            <span className="date-picker-icon" aria-hidden="true"><Calendar size={16} /></span>
            <button type="button" className="date-picker-button" onClick={() => openPicker(startRef)}>
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
            <button type="button" className="date-picker-button" onClick={() => openPicker(endRef)}>
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

      {error && <div className="error-message">{error}</div>}

      <div
        ref={tableContainerRef}
        className="table-container"
        tabIndex={0}
        onKeyDown={handleReportTableKeyDown}
        onClick={() => tableContainerRef.current?.focus()}
      >
        <table className="report-table">
          <thead>
            <tr>
              <th>DISTRICT NAME</th>
              <th>STORE CODE</th>
              <th>STORE NAME</th>
              <th>DATE</th>
              <th>BILL NUMBER</th>
              <th style={{ textAlign: 'right' }}>TOTAL QTY</th>
              <th style={{ textAlign: 'right' }}>SALE AMOUNT</th>
              <th style={{ textAlign: 'right' }}>OTHER SALE</th>
              <th style={{ textAlign: 'right' }}>EXPENSE</th>
              <th style={{ textAlign: 'right' }}>TOTAL SALE</th>
              <th style={{ textAlign: 'right' }}>TENDER AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr
                  key={`${r.billNumber || 'B'}-${idx}`}
                  data-row-key={`dws:${String(r?.storeCode || '').trim()}:${String(r?.billNumber || '').trim()}:${String(r?.date || '').trim()}:${idx}`}
                  className={[
                    selectedRowKeys.has(`dws:${String(r?.storeCode || '').trim()}:${String(r?.billNumber || '').trim()}:${String(r?.date || '').trim()}:${idx}`) ? 'row-selected' : '',
                    focusedRowIndex === selectableRowIndexByKey.get(`dws:${String(r?.storeCode || '').trim()}:${String(r?.billNumber || '').trim()}:${String(r?.date || '').trim()}:${idx}`) ? 'row-focused' : ''
                  ].filter(Boolean).join(' ')}
                  onMouseDown={() => {
                    const key = `dws:${String(r?.storeCode || '').trim()}:${String(r?.billNumber || '').trim()}:${String(r?.date || '').trim()}:${idx}`;
                    const next = selectableRowIndexByKey.get(key);
                    if (next === undefined) return;
                    setFocusedRowIndex(next);
                  }}
                  onClick={() => toggleSelectedRow(`dws:${String(r?.storeCode || '').trim()}:${String(r?.billNumber || '').trim()}:${String(r?.date || '').trim()}:${idx}`)}
                >
                  <td>{r.districtName}</td>
                  <td>{r.storeCode}</td>
                  <td>{r.storeName}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    {r.billNumber ? (
                      <button
                        type="button"
                        className="qty-link"
                        title="Open Sale Voucher"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const invoiceNo = String(r.billNumber || '').trim();
                          const sc = String(r?.storeCode || '').trim();
                          const href = sc
                            ? `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit&storeCode=${encodeURIComponent(sc)}&lockedStore=true`
                            : `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                          openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
                        }}
                      >
                        {r.billNumber}
                      </button>
                    ) : (
                      ''
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{Number(r.totalQty || 0)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(r.saleAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(r.otherSale)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(r.expense)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(r.totalSale)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(r.tenderAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="5" style={{ fontWeight: 700 }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.qty}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.sale)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.other)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.exp)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.total)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.tender)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {voucherModalOpen && voucherModalHref && (
        <div
          className="voucher-modal-overlay"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            closeVoucherModal();
          }}
        >
          <div className="voucher-modal">
            <div className="voucher-modal-header">
              <div className="voucher-modal-title">{voucherModalTitle}</div>
              <button type="button" className="voucher-modal-close" onClick={closeVoucherModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="voucher-modal-body">
              <iframe title="Sale Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictWiseDailySaleReport;
