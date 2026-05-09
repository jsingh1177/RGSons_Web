import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import './ClosingStockReport.css';

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const StockTransferSummaryReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search || '');
  const lockedStoreCode = searchParams.get('storeCode') || '';
  const filtersStorageKey = `RG_filters_stockTransferSummary:${lockedStoreCode || 'ALL'}`;
  const persistedFilters = useMemo(() => readJson(filtersStorageKey), [filtersStorageKey]);

  const [startDate, setStartDate] = useState(() => {
    const v = persistedFilters?.startDate;
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const v = persistedFilters?.endDate;
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
    return new Date().toISOString().split('T')[0];
  });
  const [districtQuery, setDistrictQuery] = useState(() => String(persistedFilters?.districtQuery || ''));
  const [storeCode, setStoreCode] = useState(() => String(persistedFilters?.storeCode || ''));
  const [toStoreCode, setToStoreCode] = useState(() => String(persistedFilters?.toStoreCode || ''));
  const [districtSearchResults, setDistrictSearchResults] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [focusedDistrictSuggestionIndex, setFocusedDistrictSuggestionIndex] = useState(-1);
  const [storeSearchInput, setStoreSearchInput] = useState(() => String(persistedFilters?.storeSearchInput || ''));
  const [storeSearchResults, setStoreSearchResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
  const [toStoreSearchInput, setToStoreSearchInput] = useState(() => String(persistedFilters?.toStoreSearchInput || ''));
  const [toStoreSearchResults, setToStoreSearchResults] = useState([]);
  const [showToStoreSuggestions, setShowToStoreSuggestions] = useState(false);
  const [focusedToStoreSuggestionIndex, setFocusedToStoreSuggestionIndex] = useState(-1);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [stores, setStores] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hiddenStorageKey = 'RG_hiddenRows_stockTransferSummary';
  const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const districtWrapRef = useRef(null);
  const storeWrapRef = useRef(null);
  const toStoreWrapRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const [expandedDateKeys, setExpandedDateKeys] = useState(() => new Set());

  const getRowHideKey = useCallback((r) => {
    const sto = String(r?.stoNumber || '').trim();
    if (sto) return `sts:${sto}`;
    const date = String(r?.date || '').trim();
    const from = String(r?.fromStore || '').trim();
    const to = String(r?.toStore || '').trim();
    const qty = String(r?.totalQty ?? '').trim();
    const amt = String(r?.amount ?? '').trim();
    return `sts:${date}:${from}:${to}:${qty}:${amt}`;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(filtersStorageKey, JSON.stringify({
        startDate,
        endDate,
        districtQuery,
        storeCode,
        storeSearchInput,
        toStoreCode,
        toStoreSearchInput
      }));
    } catch {}
  }, [filtersStorageKey, startDate, endDate, districtQuery, storeCode, storeSearchInput, toStoreCode, toStoreSearchInput]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setHiddenRowKeys(new Set(parsed.map(v => String(v || ''))));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
    } catch {}
  }, [hiddenRowKeys]);

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
        setStores(Array.isArray(stores) ? stores : []);
      } catch {
        setDistrictOptions([]);
        setStores([]);
      }
    };
    fetchStoreOptions();
  }, []);

  const filterDistrictsForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(districtOptions) ? districtOptions : [];
    if (!v) return all.slice(0, 50);
    return all.filter(d => String(d || '').toLowerCase().includes(v)).slice(0, 50);
  };

  const handleDistrictInputChange = (e) => {
    const value = e.target.value;
    setDistrictQuery(value);
    setFocusedDistrictSuggestionIndex(-1);
    const results = filterDistrictsForSearch(value);
    setDistrictSearchResults(results);
    setShowDistrictSuggestions(true);
  };

  const handleSelectDistrict = (value) => {
    const v = value || '';
    setDistrictQuery(v);
    setDistrictSearchResults([]);
    setShowDistrictSuggestions(false);
    setFocusedDistrictSuggestionIndex(-1);
  };

  const handleDistrictKeyDown = (e) => {
    if (!showDistrictSuggestions || districtSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedDistrictSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, districtSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedDistrictSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedDistrictSuggestionIndex;
      if (idx >= 0 && idx < districtSearchResults.length) handleSelectDistrict(districtSearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowDistrictSuggestions(false);
      setFocusedDistrictSuggestionIndex(-1);
    }
  };

  const filterStoresForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
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
    setStoreCode('');
    if (!value) {
      setStoreSearchResults([]);
      setShowStoreSuggestions(false);
      setFocusedStoreSuggestionIndex(-1);
      return;
    }
    const results = filterStoresForSearch(value);
    setStoreSearchResults(results);
    setShowStoreSuggestions(true);
    setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
  };

  const handleSelectStore = (store) => {
    if (!store?.storeCode) return;
    setStoreCode(store.storeCode);
    setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setStoreSearchResults([]);
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
  };

  const handleStoreKeyDown = (e) => {
    if (!showStoreSuggestions || storeSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedStoreSuggestionIndex;
      if (idx >= 0 && idx < storeSearchResults.length) handleSelectStore(storeSearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowStoreSuggestions(false);
      setFocusedStoreSuggestionIndex(-1);
    }
  };

  const handleToStoreInputChange = (e) => {
    const value = e.target.value;
    setToStoreSearchInput(value);
    setToStoreCode('');
    if (!value) {
      setToStoreSearchResults([]);
      setShowToStoreSuggestions(false);
      setFocusedToStoreSuggestionIndex(-1);
      return;
    }
    const results = filterStoresForSearch(value);
    setToStoreSearchResults(results);
    setShowToStoreSuggestions(true);
    setFocusedToStoreSuggestionIndex(results.length ? 0 : -1);
  };

  const handleSelectToStore = (store) => {
    if (!store?.storeCode) return;
    setToStoreCode(store.storeCode);
    setToStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setToStoreSearchResults([]);
    setShowToStoreSuggestions(false);
    setFocusedToStoreSuggestionIndex(-1);
  };

  const handleToStoreKeyDown = (e) => {
    if (!showToStoreSuggestions || toStoreSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedToStoreSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, toStoreSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedToStoreSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedToStoreSuggestionIndex;
      if (idx >= 0 && idx < toStoreSearchResults.length) handleSelectToStore(toStoreSearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowToStoreSuggestions(false);
      setFocusedToStoreSuggestionIndex(-1);
    }
  };

  useEffect(() => {
    if (!lockedStoreCode) return;
    const found = (stores || []).find(s => String(s?.storeCode || '').trim() === String(lockedStoreCode || '').trim());
    if (found) {
      setStoreCode(found.storeCode);
      setStoreSearchInput(`${found.storeName} (${found.storeCode})`);
    } else {
      setStoreCode(lockedStoreCode);
      setStoreSearchInput(lockedStoreCode);
    }
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
  }, [lockedStoreCode, stores]);

  useEffect(() => {
    if (!storeCode || storeSearchInput) return;
    const found = (stores || []).find(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim());
    if (!found) return;
    setStoreSearchInput(`${found.storeName} (${found.storeCode})`);
  }, [stores, storeCode, storeSearchInput]);

  useEffect(() => {
    if (!toStoreCode || toStoreSearchInput) return;
    const found = (stores || []).find(s => String(s?.storeCode || '').trim() === String(toStoreCode || '').trim());
    if (!found) return;
    setToStoreSearchInput(`${found.storeName} (${found.storeCode})`);
  }, [stores, toStoreCode, toStoreSearchInput]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (districtWrapRef.current && !districtWrapRef.current.contains(t)) {
        setShowDistrictSuggestions(false);
        setFocusedDistrictSuggestionIndex(-1);
      }
      if (storeWrapRef.current && !storeWrapRef.current.contains(t)) {
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
      }
      if (toStoreWrapRef.current && !toStoreWrapRef.current.contains(t)) {
        setShowToStoreSuggestions(false);
        setFocusedToStoreSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
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

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const effectiveStoreCode = lockedStoreCode || storeCode;
      const res = await axios.get('/api/reports/transfers/stock-transfer-summary', {
        params: { startDate, endDate, district: districtQuery, fromLocation: storeCode, toLocation: toStoreCode, storeCode: effectiveStoreCode },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, lockedStoreCode, storeCode, toStoreCode]);

  const handleDownload = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const effectiveStoreCode = lockedStoreCode || storeCode;
      const res = await axios.get('/api/reports/transfers/stock-transfer-summary/export', {
        params: { startDate, endDate, district: districtQuery, fromLocation: storeCode, toLocation: toStoreCode, storeCode: effectiveStoreCode },
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stock_transfer_summary.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download excel');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, lockedStoreCode, storeCode, toStoreCode]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setVoucherModalOpen(false);
      setVoucherModalHref('');
      setVoucherModalTitle('');
      fetchData();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [voucherModalOpen, fetchData]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
      setVoucherModalOpen(false);
      setVoucherModalHref('');
      setVoucherModalTitle('');
      fetchData();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [voucherModalOpen, fetchData]);

  const openVoucherModal = (stoNumber) => {
    const no = String(stoNumber || '').trim();
    if (!no) return;
    const href = `/stock-transfer-out?stoNumber=${encodeURIComponent(no)}&mode=edit`;
    setVoucherModalHref(href);
    setVoucherModalTitle(`STO - ${no}`);
    setVoucherModalOpen(true);
  };

  const closeVoucherModal = () => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
    fetchData();
  };

  const visibleRows = useMemo(() => {
    return (rows || []).filter(r => !hiddenRowKeys.has(getRowHideKey(r)));
  }, [rows, hiddenRowKeys, getRowHideKey]);

  const dateGroupedRows = useMemo(() => {
    const map = new Map();
    for (const r of visibleRows || []) {
      const dateKey = String(r?.date || '').trim();
      if (!dateKey) continue;
      if (!map.has(dateKey)) {
        map.set(dateKey, { dateKey, rows: [], totals: { qty: 0, amount: 0 } });
      }
      const g = map.get(dateKey);
      g.rows.push(r);
      g.totals.qty += Number(r?.totalQty || 0);
      g.totals.amount += Number(r?.amount || 0);
    }
    const out = Array.from(map.values());
    out.sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));
    return out;
  }, [visibleRows]);

  const grandTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const r of visibleRows || []) {
      qty += Number(r?.totalQty || 0);
      amount += Number(r?.amount || 0);
    }
    return { qty, amount };
  }, [visibleRows]);

  const flattenedRows = useMemo(() => {
    const out = [];
    for (const g of dateGroupedRows) {
      out.push({ kind: 'group', dateKey: g.dateKey, totals: g.totals });
      if (!expandedDateKeys.has(g.dateKey)) continue;
      for (const r of g.rows) {
        out.push({ kind: 'detail', dateKey: g.dateKey, row: r, rowKey: getRowHideKey(r) });
      }
    }
    return out;
  }, [dateGroupedRows, expandedDateKeys, getRowHideKey]);

  const selectableRowIndexByKey = useMemo(() => {
    const map = new Map();
    flattenedRows.forEach((e, idx) => {
      if (e.kind !== 'detail') return;
      if (!e.rowKey) return;
      map.set(e.rowKey, idx);
    });
    return map;
  }, [flattenedRows]);

  useEffect(() => {
    setSelectedRowKeys(new Set());
    setFocusedRowIndex(prev => (flattenedRows.length > 0 ? (prev < 0 ? 0 : Math.min(prev, flattenedRows.length - 1)) : -1));
  }, [flattenedRows.length]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    if (focusedRowIndex < 0 || focusedRowIndex >= flattenedRows.length) return;
    const entry = flattenedRows[focusedRowIndex];
    if (!entry) return;
    const selector = entry.kind === 'detail' && entry.rowKey
      ? `tr[data-row-key="${entry.rowKey}"]`
      : `tr[data-date-group="${entry.dateKey}"]`;
    const tr = el.querySelector(selector);
    if (tr && typeof tr.scrollIntoView === 'function') {
      try {
        tr.scrollIntoView({ block: 'nearest' });
      } catch {}
    }
  }, [focusedRowIndex, flattenedRows]);

  const toggleDateExpanded = useCallback((dateKey) => {
    if (!dateKey) return;
    setExpandedDateKeys(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }, []);

  const toggleSelectedRow = (rowKey) => {
    if (!rowKey) return;
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const hideFocusedRow = useCallback(() => {
    if (flattenedRows.length === 0) return;
    const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
    const entry = flattenedRows[idx];
    if (!entry || entry.kind !== 'detail') return;
    const rowKey = entry.rowKey;
    if (!rowKey) return;
    setHiddenRowKeys(prev => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  }, [focusedRowIndex, flattenedRows]);

  const unhideAllRows = useCallback(() => {
    setHiddenRowKeys(new Set());
    try {
      localStorage.removeItem(hiddenStorageKey);
    } catch {}
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (voucherModalOpen) return;
      if (!e.altKey) return;
      const k = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (k === 'u') {
        e.preventDefault();
        unhideAllRows();
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        hideFocusedRow();
        return;
      }
      if (k !== 'r') return;
      e.preventDefault();
      hideFocusedRow();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hideFocusedRow, unhideAllRows, voucherModalOpen]);

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
      if (flattenedRows.length === 0) return;
      setFocusedRowIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flattenedRows.length === 0) return;
      setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, flattenedRows.length - 1)));
      return;
    }
    if (e.key === 'Enter') {
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= flattenedRows.length) return;
      const entry = flattenedRows[idx];
      if (entry?.kind === 'group') {
        e.preventDefault();
        toggleDateExpanded(entry.dateKey);
        return;
      }
      if (entry?.kind === 'detail') {
        const stoNo = entry?.row?.stoNumber;
        if (!stoNo) return;
        e.preventDefault();
        openVoucherModal(stoNo);
      }
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= flattenedRows.length) return;
      const entry = flattenedRows[idx];
      if (!entry || entry.kind !== 'detail' || !entry.rowKey) return;
      toggleSelectedRow(entry.rowKey);
    }
  };

  return (
    <div className="report-container stock-ledger-container stock-ledger-report stock-transfer-summary-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1 className="stock-ledger-title">Stock Transfer Summary</h1>
        <div className="stock-ledger-header-actions">
          <div className="stock-ledger-header-date-inline">
            <span className="stock-ledger-header-date-caption">From Date</span>
            <div className="date-picker-wrapper stock-ledger-header-date">
              <Calendar className="date-picker-icon" size={18} />
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
          <div className="stock-ledger-header-date-inline">
            <span className="stock-ledger-header-date-caption">To Date</span>
            <div className="date-picker-wrapper stock-ledger-header-date">
              <Calendar className="date-picker-icon" size={18} />
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
          <button className="export-btn stock-ledger-export-btn" onClick={handleDownload} disabled={loading || rows.length === 0}>
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>State</label>
          <div ref={districtWrapRef} style={{ position: 'relative' }}>
            <input
              value={districtQuery}
              onChange={handleDistrictInputChange}
              onKeyDown={handleDistrictKeyDown}
              onFocus={() => {
                const results = filterDistrictsForSearch(districtQuery);
                setDistrictSearchResults(results);
                setShowDistrictSuggestions(true);
                setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="District Search"
              disabled={loading}
              autoComplete="off"
            />
            {showDistrictSuggestions && districtSearchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {districtSearchResults.map((d, idx) => (
                  <div
                    key={`${d}-${idx}`}
                    onMouseDown={() => handleSelectDistrict(d)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedDistrictSuggestionIndex ? '#eff6ff' : '#fff' }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>From Location</label>
          <div ref={storeWrapRef} style={{ position: 'relative' }}>
            <input
              value={storeSearchInput}
              onChange={handleStoreInputChange}
              onKeyDown={handleStoreKeyDown}
              onFocus={() => {
                const results = filterStoresForSearch(storeSearchInput);
                setStoreSearchResults(results);
                setShowStoreSuggestions(true);
                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="From Location"
              disabled={loading || !!lockedStoreCode}
              autoComplete="off"
            />
            {showStoreSuggestions && storeSearchResults.length > 0 && !lockedStoreCode && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {storeSearchResults.map((s, idx) => (
                  <div
                    key={`${String(s?.storeCode || idx)}-${idx}`}
                    onMouseDown={() => handleSelectStore(s)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(s?.storeName || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(s?.storeCode || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>To Location</label>
          <div ref={toStoreWrapRef} style={{ position: 'relative' }}>
            <input
              value={toStoreSearchInput}
              onChange={handleToStoreInputChange}
              onKeyDown={handleToStoreKeyDown}
              onFocus={() => {
                const results = filterStoresForSearch(toStoreSearchInput);
                setToStoreSearchResults(results);
                setShowToStoreSuggestions(true);
                setFocusedToStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="To Location"
              disabled={loading}
              autoComplete="off"
            />
            {showToStoreSuggestions && toStoreSearchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {toStoreSearchResults.map((s, idx) => (
                  <div
                    key={`${String(s?.storeCode || idx)}-${idx}`}
                    onMouseDown={() => handleSelectToStore(s)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedToStoreSuggestionIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(s?.storeName || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(s?.storeCode || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
              <th>DISTRICT</th>
              <th>DATE</th>
              <th>STO NO</th>
              <th>FROM LOCATION</th>
              <th>TO LOCATION</th>
              <th style={{ textAlign: 'right' }}>TOTAL QTY</th>
              <th style={{ textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {flattenedRows.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              flattenedRows.map((entry, idx) => {
                if (entry.kind === 'group') {
                  const expanded = expandedDateKeys.has(entry.dateKey);
                  return (
                    <tr
                      key={`grp:${entry.dateKey}`}
                      data-date-group={entry.dateKey}
                      className={[
                        idx === focusedRowIndex ? 'row-focused' : ''
                      ].filter(Boolean).join(' ')}
                      style={{ fontWeight: 700, background: '#f8fafc', cursor: 'pointer' }}
                      onMouseDown={() => setFocusedRowIndex(idx)}
                      onClick={() => toggleDateExpanded(entry.dateKey)}
                    >
                      <td></td>
                      <td>{formatDate(entry.dateKey)}</td>
                      <td>{expanded ? 'Totals (expanded)' : 'Totals'}</td>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign: 'right' }}>{Number(entry.totals?.qty || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{Number(entry.totals?.amount || 0).toFixed(2)}</td>
                    </tr>
                  );
                }

                const r = entry.row;
                const rowKey = entry.rowKey;
                const focused = idx === focusedRowIndex;
                return (
                  <tr
                    key={`${rowKey}:${idx}`}
                    data-row-key={rowKey}
                    className={[
                      selectedRowKeys.has(rowKey) ? 'row-selected' : '',
                      focused ? 'row-focused' : ''
                    ].filter(Boolean).join(' ')}
                    onMouseDown={() => {
                      const next = selectableRowIndexByKey.get(rowKey);
                      if (next === undefined) return;
                      setFocusedRowIndex(next);
                    }}
                    onClick={() => toggleSelectedRow(rowKey)}
                  >
                    <td>{r.districtName}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      {r.stoNumber ? (
                        <button
                          type="button"
                          className="qty-link"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            openVoucherModal(r.stoNumber);
                          }}
                        >
                          {r.stoNumber}
                        </button>
                      ) : (
                        ''
                      )}
                    </td>
                    <td>{r.fromStore}</td>
                    <td>{r.toStore}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.totalQty || 0)}</td>
                    <td style={{ textAlign: 'right' }}>{(Number(r.amount || 0)).toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" style={{ fontWeight: 700 }}>GRAND TOTAL</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(grandTotals.qty || 0)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(grandTotals.amount || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="search-btn" onClick={hideFocusedRow} disabled={flattenedRows.length === 0}>
          ALT+H Hide
        </button>
        <button type="button" className="search-btn" onClick={unhideAllRows} disabled={hiddenRowKeys.size === 0}>
          ALT+U Unhide
        </button>
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
              <iframe title="Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransferSummaryReport;
