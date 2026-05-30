import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const StockTransferDetailReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search || '');
  const lockedStoreCode = searchParams.get('storeCode') || '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const activeLocationFieldRef = useRef('from');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const storeModalSearchRef = useRef(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [sizes, setSizes] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);

  const storeModalOptions = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    if (!q) return all.slice(0, 200);
    return all.filter(s => String(s || '').toLowerCase().includes(q)).slice(0, 200);
  }, [storeModalQuery, storeOptions]);

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
        const active = Array.isArray(storeModalOptions) ? storeModalOptions : [];
        const current = activeLocationFieldRef.current === 'to' ? toLocation : fromLocation;
        const idx = current ? active.findIndex(s => String(s || '').trim() === String(current || '').trim()) : -1;
        setFocusedStoreModalIndex(idx >= 0 ? idx : (active.length ? 0 : -1));
        setShowStoreModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fromLocation, showChangePeriodModal, showStoreModal, storeModalOptions, toLocation]);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const [storesRes, sizesRes] = await Promise.all([
          axios.get('/api/stores', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/sizes/active', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const stores = Array.isArray(storesRes.data)
          ? storesRes.data
          : (storesRes.data?.stores || []);

        const districts = new Set();
        const storeNames = new Set();
        for (const s of stores) {
          const d = String(s?.district || '').trim();
          const sn = String(s?.storeName || '').trim();
          if (d) districts.add(d);
          if (sn) storeNames.add(sn);
        }
        setDistrictOptions(Array.from(districts).sort((a, b) => a.localeCompare(b)));
        setStoreOptions(Array.from(storeNames).sort((a, b) => a.localeCompare(b)));

        const activeSizes = Array.isArray(sizesRes.data) ? sizesRes.data : [];
        const normalizedSizes = activeSizes
          .map(s => ({
            code: String(s?.code ?? ''),
            name: String(s?.name ?? s?.code ?? '')
          }))
          .filter(s => s.code);
        setSizes(normalizedSizes);
      } catch {
        setDistrictOptions([]);
        setStoreOptions([]);
        setSizes([]);
      }
    };
    fetchOptions();
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
      const res = await axios.get('/api/reports/transfers/stock-transfer-detail', {
        params: { startDate, endDate, district: districtQuery, fromLocation, toLocation, storeCode: lockedStoreCode },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, fromLocation, toLocation, lockedStoreCode]);
  searchActionRef.current = fetchData;

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate, fromLocation, toLocation]);

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/transfers/stock-transfer-detail/export', {
        params: { startDate, endDate, district: districtQuery, fromLocation, toLocation, storeCode: lockedStoreCode },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock_transfer_detail_${startDate}_${endDate}.xlsx`);
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

  const tableRows = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const districtName = String(r?.districtName || '');
      const date = String(r?.date || '');
      const fromStore = String(r?.fromStore || '');
      const toStore = String(r?.toStore || '');
      const stoNumber = String(r?.stoNumber || '');
      const receivedStatus = String(r?.receivedStatus || '');
      const itemCode = String(r?.itemCode || '');
      const itemName = String(r?.itemName || itemCode);
      const sizeCode = String(r?.sizeCode || '');
      const qty = Number(r?.quantity || 0);

      const key = `${districtName}||${date}||${fromStore}||${toStore}||${stoNumber}||${receivedStatus}||${itemCode}`;
      if (!map.has(key)) {
        map.set(key, {
          districtName,
          date,
          fromStore,
          toStore,
          stoNumber,
          receivedStatus,
          itemCode,
          itemName,
          sizeQty: {}
        });
      }
      const agg = map.get(key);
      agg.sizeQty[sizeCode] = (agg.sizeQty[sizeCode] || 0) + qty;
    }

    const out = Array.from(map.values()).map(r => {
      const total = Object.values(r.sizeQty).reduce((s, v) => s + (Number(v) || 0), 0);
      return { ...r, total };
    });

    out.sort((a, b) => {
      const d = a.districtName.localeCompare(b.districtName);
      if (d !== 0) return d;
      const dt = String(a.date).localeCompare(String(b.date));
      if (dt !== 0) return dt;
      const f = a.fromStore.localeCompare(b.fromStore);
      if (f !== 0) return f;
      const t = a.toStore.localeCompare(b.toStore);
      if (t !== 0) return t;
      const sn = a.stoNumber.localeCompare(b.stoNumber);
      if (sn !== 0) return sn;
      return a.itemName.localeCompare(b.itemName);
    });

    return out;
  }, [rows]);

  const visibleSizes = useMemo(() => {
    if (sizes.length > 0) return sizes;
    const set = new Set();
    for (const r of rows || []) {
      const sc = String(r?.sizeCode || '').trim();
      if (sc) set.add(sc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map(code => ({ code, name: code }));
  }, [sizes, rows]);

  return (
    <div className="report-container">
      <div className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>Stock Transfer Detail</h1>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>District</label>
          <input
            value={districtQuery}
            onChange={(e) => setDistrictQuery(e.target.value)}
            placeholder="Search District"
            disabled={loading}
            list="stock-transfer-detail-district-options"
          />
          <datalist id="stock-transfer-detail-district-options">
            {districtOptions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div className="filter-group">
          <label>From Location</label>
          <input
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            onFocus={() => { activeLocationFieldRef.current = 'from'; }}
            placeholder="Search Store"
            disabled={loading}
            list="stock-transfer-detail-store-options"
          />
        </div>

        <div className="filter-group">
          <label>To Location</label>
          <input
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            onFocus={() => { activeLocationFieldRef.current = 'to'; }}
            placeholder="Search Store"
            disabled={loading}
            list="stock-transfer-detail-store-options"
          />
          <datalist id="stock-transfer-detail-store-options">
            {storeOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
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
        <button className="export-btn" onClick={handleDownload} disabled={loading || tableRows.length === 0}>
          <Download size={16} style={{ marginRight: 6 }} />
          Excel
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>DISTRICT</th>
              <th>DATE</th>
              <th>FROM STORE</th>
              <th>TO STORE</th>
              <th>STO NO</th>
              <th>RECEIVED STATUS</th>
              <th>ITEM NAME</th>
              {visibleSizes.map(s => (
                <th key={s.code} style={{ textAlign: 'right' }}>{s.name}</th>
              ))}
              <th style={{ textAlign: 'right' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={8 + visibleSizes.length} style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              tableRows.map((r, idx) => (
                <tr key={`${r.date || 'D'}-${r.itemCode || 'I'}-${idx}`}>
                  <td>{r.districtName}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.fromStore}</td>
                  <td>{r.toStore}</td>
                  <td>{r.stoNumber}</td>
                  <td>{r.receivedStatus}</td>
                  <td>{r.itemName}</td>
                  {visibleSizes.map(s => (
                    <td key={s.code} style={{ textAlign: 'right' }}>
                      {Number(r.sizeQty?.[s.code] || 0)}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(r.total || 0)}</td>
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
        }}
      />

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
              <div className="text-base font-bold text-slate-800">
                {activeLocationFieldRef.current === 'to' ? 'Select To Location' : 'Select From Location'}
              </div>
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
                    setFocusedStoreModalIndex((prev) => Math.min((prev < 0 ? 0 : prev + 1), Math.max(0, storeModalOptions.length - 1)));
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
                    const s = idx >= 0 ? storeModalOptions[idx] : null;
                    if (!s) return;
                    if (activeLocationFieldRef.current === 'to') setToLocation(s);
                    else setFromLocation(s);
                    setShowStoreModal(false);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Search store name"
                autoComplete="off"
              />
              <div className="mt-3 max-h-[60vh] overflow-auto border border-slate-100 rounded">
                {storeModalOptions.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">No stores</div>
                ) : (
                  storeModalOptions.map((s, idx) => {
                    const name = String(s || '').trim();
                    const focused = idx === focusedStoreModalIndex;
                    return (
                      <button
                        key={`${name || idx}-${idx}`}
                        type="button"
                        className={[
                          'w-full text-left px-3 py-2',
                          focused ? 'bg-indigo-50' : 'bg-white',
                          'hover:bg-indigo-50'
                        ].join(' ')}
                        onMouseEnter={() => setFocusedStoreModalIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (activeLocationFieldRef.current === 'to') setToLocation(name);
                          else setFromLocation(name);
                          setShowStoreModal(false);
                        }}
                      >
                        <span className="text-sm text-slate-800">{name}</span>
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

export default StockTransferDetailReport;
