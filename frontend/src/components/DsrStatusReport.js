import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const DsrStatusReport = () => {
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
  const [storeSearchInput, setStoreSearchInput] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');

  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [districtResults, setDistrictResults] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [focusedDistrictIndex, setFocusedDistrictIndex] = useState(-1);
  const [storeResults, setStoreResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const storeModalSearchRef = useRef(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [voucherListOpen, setVoucherListOpen] = useState(false);
  const [voucherListLoading, setVoucherListLoading] = useState(false);
  const [voucherListError, setVoucherListError] = useState('');
  const [voucherListStoreCode, setVoucherListStoreCode] = useState('');
  const [voucherListStoreName, setVoucherListStoreName] = useState('');
  const [voucherListDate, setVoucherListDate] = useState('');
  const [voucherNos, setVoucherNos] = useState([]);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const districtInputRef = useRef(null);
  const storeInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);

  const storeModalStores = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    const districtFiltered = districtQuery
      ? all.filter(s => String(s?.district || '').trim() === String(districtQuery || '').trim())
      : all;
    if (!q) return districtFiltered.slice(0, 100);
    return districtFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 100);
  }, [districtQuery, storeModalQuery, storeOptions]);

  useEffect(() => {
    if (!showStoreModal) return;
    window.setTimeout(() => {
      try {
        storeModalSearchRef.current?.focus?.();
        storeModalSearchRef.current?.select?.();
      } catch {}
    }, 50);
  }, [showStoreModal]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (showChangePeriodModal) return;
        if (showStoreModal) return;
        setShowChangePeriodModal(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (showStoreModal) return;
        if (showChangePeriodModal) return;
        setStoreModalQuery('');
        const active = Array.isArray(storeModalStores) ? storeModalStores : [];
        const idx = selectedStoreName
          ? active.findIndex(s => String(s?.storeName || '').trim() === String(selectedStoreName || '').trim())
          : -1;
        setFocusedStoreModalIndex(idx >= 0 ? idx : (active.length ? 0 : -1));
        setShowStoreModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedStoreName, showChangePeriodModal, showStoreModal, storeModalStores]);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

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

  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const parseIsoToUtcDate = (iso) => {
      const parts = String(iso || '').split('-').map(n => parseInt(n, 10));
      if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
      const [y, m, d] = parts;
      return new Date(Date.UTC(y, m - 1, d));
    };

    const start = parseIsoToUtcDate(startDate);
    const end = parseIsoToUtcDate(endDate);
    if (!start || !end) return [];

    const out = [];
    const cur = new Date(start.getTime());
    while (cur.getTime() <= end.getTime()) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }, [startDate, endDate]);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/dsr-status', {
        params: { startDate, endDate, district: districtQuery, storeName: selectedStoreName || '' },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, selectedStoreName]);
  searchActionRef.current = fetchData;

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate, selectedStoreName]);

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/sales/dsr-status/export', {
        params: { startDate, endDate, district: districtQuery, storeName: selectedStoreName || '' },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dsr_status_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download excel');
    }
  };
  exportActionRef.current = handleDownload;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey) return;
      const k = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (k === 's') {
        e.preventDefault();
        searchActionRef.current?.();
        return;
      }
      if (k === 'p') {
        e.preventDefault();
        exportActionRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const grid = useMemo(() => {
    const map = new Map();
    for (const r of rows || []) {
      const districtName = String(r?.districtName || '');
      const shopType = String(r?.shopType || '');
      const owner = String(r?.owner || '');
      const storeCode = String(r?.storeCode || '');
      const storeName = String(r?.storeName || '');
      const date = String(r?.date || '');
      const status = Number(r?.status || 0);
      if (!storeCode || !date) continue;

      const key = `${districtName}||${shopType}||${owner}||${storeCode}||${storeName}`;
      if (!map.has(key)) {
        map.set(key, { districtName, shopType, owner, storeCode, storeName, byDate: {} });
      }
      const row = map.get(key);
      row.byDate[date] = (row.byDate[date] || 0) + status;
    }
    const out = Array.from(map.values());
    out.sort((a, b) => {
      const d = a.districtName.localeCompare(b.districtName);
      if (d !== 0) return d;
      const t = String(a.shopType || '').localeCompare(String(b.shopType || ''));
      if (t !== 0) return t;
      const o = String(a.owner || '').localeCompare(String(b.owner || ''));
      if (o !== 0) return o;
      const s = a.storeCode.localeCompare(b.storeCode);
      if (s !== 0) return s;
      return a.storeName.localeCompare(b.storeName);
    });
    return out;
  }, [rows]);

  const selectableRowKeys = useMemo(() => {
    return (grid || []).map((r, idx) => {
      const storeCode = String(r?.storeCode || '').trim();
      return `dsr:${storeCode}:${idx}`;
    });
  }, [grid]);

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

  const monthLabel = useMemo(() => {
    if (!startDate) return '';
    const parseIsoToUtcDate = (iso) => {
      const parts = String(iso || '').split('-').map(n => parseInt(n, 10));
      if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
      const [y, m, d] = parts;
      return new Date(Date.UTC(y, m - 1, d));
    };

    const format = (d) => d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
    const s = parseIsoToUtcDate(startDate);
    const e = parseIsoToUtcDate(endDate);
    if (!s) return '';
    if (!e) return format(s);
    const sKey = `${s.getUTCFullYear()}-${s.getUTCMonth()}`;
    const eKey = `${e.getUTCFullYear()}-${e.getUTCMonth()}`;
    if (sKey === eKey) return format(s);
    return `${format(s)} to ${format(e)}`;
  }, [startDate, endDate]);

  const openVoucherModal = useCallback((href, title) => {
    if (!href) return;
    const sep = href.includes('?') ? '&' : '?';
    setVoucherModalHref(`${href}${sep}_ts=${Date.now()}`);
    setVoucherModalTitle(title || 'Voucher');
    setVoucherModalOpen(true);
  }, []);

  const closeVoucherModal = useCallback(() => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
  }, []);

  const openVouchersForCell = useCallback(async (row, isoDate) => {
    const storeCode = String(row?.storeCode || '').trim();
    const storeName = String(row?.storeName || '').trim();
    const d = String(isoDate || '').trim();
    if (!storeCode || !d) return;

    setVoucherListError('');
    setVoucherListLoading(true);
    setVoucherListStoreCode(storeCode);
    setVoucherListStoreName(storeName);
    setVoucherListDate(d);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/dsr-vouchers', {
        params: { storeCode, date: d },
        headers: { Authorization: `Bearer ${token}` }
      });

      const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.vouchers) ? res.data.vouchers : []);
      const list = raw
        .map(v => String(v || '').trim())
        .filter(Boolean);

      if (list.length === 1) {
        const invoiceNo = list[0];
        const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
        openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
        return;
      }

      setVoucherNos(list);
      setVoucherListOpen(true);
    } catch {
      setVoucherNos([]);
      setVoucherListError('Failed to load vouchers');
      setVoucherListOpen(true);
    } finally {
      setVoucherListLoading(false);
    }
  }, [openVoucherModal]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (voucherModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeVoucherModal();
        return;
      }
      if (voucherListOpen) {
        e.preventDefault();
        e.stopPropagation();
        setVoucherListOpen(false);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [closeVoucherModal, voucherListOpen, voucherModalOpen]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
      closeVoucherModal();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [closeVoucherModal, voucherModalOpen]);

  return (
    <div className="report-container stock-ledger-container stock-ledger-report dsr-status-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>Back</button>
        <h1 className="stock-ledger-title">DSR Status</h1>
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
              <th colSpan={5 + dateRange.length} style={{ textAlign: 'center' }}>
                {monthLabel}
              </th>
            </tr>
            <tr>
              <th>District Name</th>
              <th>Store Code</th>
              <th>Store Name</th>
              <th>Shop Type</th>
              <th>Owner</th>
              {dateRange.map((d) => (
                <th key={d} style={{ textAlign: 'center' }}>{Number(d.split('-')[2])}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.length === 0 ? (
              <tr>
                <td colSpan={5 + dateRange.length} style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              grid.map((r, idx) => (
                <tr
                  key={`${r.storeCode}-${idx}`}
                  data-row-key={`dsr:${String(r?.storeCode || '').trim()}:${idx}`}
                  className={[
                    selectedRowKeys.has(`dsr:${String(r?.storeCode || '').trim()}:${idx}`) ? 'row-selected' : '',
                    focusedRowIndex === selectableRowIndexByKey.get(`dsr:${String(r?.storeCode || '').trim()}:${idx}`) ? 'row-focused' : ''
                  ].filter(Boolean).join(' ')}
                  onMouseDown={() => {
                    const key = `dsr:${String(r?.storeCode || '').trim()}:${idx}`;
                    const next = selectableRowIndexByKey.get(key);
                    if (next === undefined) return;
                    setFocusedRowIndex(next);
                  }}
                  onClick={() => toggleSelectedRow(`dsr:${String(r?.storeCode || '').trim()}:${idx}`)}
                >
                  <td>{r.districtName}</td>
                  <td>{r.storeCode}</td>
                  <td>{r.storeName}</td>
                  <td>{r.shopType}</td>
                  <td>{r.owner}</td>
                  {dateRange.map((d) => (
                    <td key={d} style={{ textAlign: 'center' }}>
                      {Number(r.byDate?.[d] || 0) > 0 ? (
                        <button
                          type="button"
                          className="qty-link"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openVouchersForCell(r, d);
                          }}
                        >
                          {r.byDate?.[d]}
                        </button>
                      ) : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              <iframe title="Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
            </div>
          </div>
        </div>
      )}

      {voucherListOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vouchers"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setVoucherListOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="text-base font-bold text-slate-800">
                {`Vouchers${voucherListStoreCode ? ` - ${voucherListStoreCode}` : ''}${voucherListDate ? ` (${voucherListDate})` : ''}`}
              </div>
              <button
                type="button"
                onClick={() => setVoucherListOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {voucherListStoreName ? (
                <div className="text-xs text-slate-600 mb-3">
                  {voucherListStoreName}
                </div>
              ) : null}
              {voucherListLoading ? (
                <div className="text-sm text-slate-600">Loading...</div>
              ) : voucherListError ? (
                <div className="text-sm text-red-600">{voucherListError}</div>
              ) : voucherNos.length === 0 ? (
                <div className="text-sm text-slate-600">No vouchers</div>
              ) : (
                <div className="max-h-[60vh] overflow-auto border border-slate-100 rounded">
                  {voucherNos.map((invoiceNo) => (
                    <button
                      key={invoiceNo}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between gap-3"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                        setVoucherListOpen(false);
                        openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
                      }}
                    >
                      <span className="text-sm text-slate-800">{invoiceNo}</span>
                      <span className="text-xs text-slate-500">Open</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showStoreModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Select Store"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowStoreModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="text-base font-bold text-slate-800">Select Store</div>
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                ref={storeModalSearchRef}
                type="text"
                value={storeModalQuery}
                onChange={(e) => {
                  setStoreModalQuery(e.target.value);
                  setFocusedStoreModalIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowStoreModal(false);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedStoreModalIndex((prev) => Math.min((prev < 0 ? 0 : prev + 1), Math.max(0, storeModalStores.length - 1)));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusedStoreModalIndex((prev) => Math.max(-1, prev - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const idx = focusedStoreModalIndex;
                    const s = idx >= 0 ? storeModalStores[idx] : null;
                    if (s) {
                      selectStore(s);
                      setShowStoreModal(false);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Search store code or name"
                autoComplete="off"
              />
              <div className="mt-3 max-h-[60vh] overflow-auto border border-slate-100 rounded">
                {storeModalStores.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">No stores</div>
                ) : (
                  storeModalStores.map((s, idx) => {
                    const code = String(s?.storeCode || '').trim();
                    const name = String(s?.storeName || '').trim();
                    const focused = idx === focusedStoreModalIndex;
                    return (
                      <button
                        key={`${code || idx}-${idx}`}
                        type="button"
                        className={[
                          'w-full text-left px-3 py-2 flex items-center justify-between gap-3',
                          focused ? 'bg-indigo-50' : 'bg-white',
                          'hover:bg-indigo-50'
                        ].join(' ')}
                        onMouseEnter={() => setFocusedStoreModalIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          selectStore(s);
                          setShowStoreModal(false);
                        }}
                      >
                        <span className="text-sm text-slate-800">{name}</span>
                        <span className="text-xs font-mono text-slate-500">{code}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DsrStatusReport;
