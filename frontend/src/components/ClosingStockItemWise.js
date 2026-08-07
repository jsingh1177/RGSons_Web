import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const STATE_KEY = 'closingStockItemWiseState:v1';

const getDefaultFilters = () => ({
  district: '',
  storeCode: '',
  itemQuery: '',
  sizeCode: '',
  date: new Date().toISOString().slice(0, 10)
});

const loadState = () => {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const saveState = (state) => {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
};

const ClosingStockItemWise = () => {
  const navigate = useNavigate();
  const restoredRef = useRef(null);
  const dateRef = useRef(null);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const storeSearchWrapRef = useRef(null);
  const storeSuggestionsRef = useRef(null);
  const storeModalSearchRef = useRef(null);
  const itemSearchWrapRef = useRef(null);
  const itemSuggestionsRef = useRef(null);

  if (restoredRef.current === null) {
    restoredRef.current = loadState();
  }

  const [districts, setDistricts] = useState(() => restoredRef.current?.districts || []);
  const [stores, setStores] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [filters, setFilters] = useState(() => ({ ...getDefaultFilters(), ...(restoredRef.current?.filters || {}) }));
  const [rows, setRows] = useState([]);
  const [didSearch, setDidSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeSearchInput, setStoreSearchInput] = useState(() => restoredRef.current?.storeSearchInput || '');
  const [storeSearchResults, setStoreSearchResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const [itemSearchInput, setItemSearchInput] = useState(() => restoredRef.current?.itemSearchInput || '');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [focusedItemSuggestionIndex, setFocusedItemSuggestionIndex] = useState(-1);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);

  useEffect(() => {
    saveState({
      filters,
      districts,
      storeSearchInput,
      itemSearchInput
    });
  }, [districts, filters, itemSearchInput, storeSearchInput]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [districtRes, storeRes, sizeRes] = await Promise.all([
          axios.get('/api/reports/closing-stock-item-wise/districts'),
          axios.get('/api/stores'),
          axios.get('/api/sizes')
        ]);
        setDistricts(Array.isArray(districtRes.data) ? districtRes.data : []);
        setStores(storeRes.data?.success && Array.isArray(storeRes.data.stores) ? storeRes.data.stores : []);
        setSizes(sizeRes.data?.success && Array.isArray(sizeRes.data.sizes) ? sizeRes.data.sizes : []);
      } catch (err) {
        console.error('Error fetching item wise lookups', err);
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const selectedStore = stores.find((s) => String(s?.storeCode || '').trim() === String(filters.storeCode || '').trim());
    if (selectedStore) {
      const display = `${selectedStore.storeName} (${selectedStore.storeCode})`;
      if (storeSearchInput !== display) setStoreSearchInput(display);
    }
  }, [filters.storeCode, storeSearchInput, stores]);

  useEffect(() => {
    if (!showStoreSuggestions) return;
    const onMouseDown = (e) => {
      const el = storeSearchWrapRef.current;
      if (el && !el.contains(e.target)) {
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showStoreSuggestions]);

  useEffect(() => {
    if (!showItemSuggestions) return;
    const onMouseDown = (e) => {
      const el = itemSearchWrapRef.current;
      if (el && !el.contains(e.target)) {
        setShowItemSuggestions(false);
        setFocusedItemSuggestionIndex(-1);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showItemSuggestions]);

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
      const lower = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const isFormField = tag === 'input' || tag === 'select' || tag === 'textarea';
      if (e.key === 'F2') {
        e.preventDefault();
        setShowChangePeriodModal(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
        setStoreModalQuery('');
        setFocusedStoreModalIndex(0);
        setShowStoreModal(true);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (lower === 's') {
          e.preventDefault();
          searchActionRef.current?.();
          return;
        }
        if (lower === 'p') {
          e.preventDefault();
          exportActionRef.current?.();
          return;
        }
      }
      if (isFormField) return;
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const formatQty = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  const formatAmount = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toDdMmYyyy = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(iso);
  };

  const openDatePicker = () => {
    const el = dateRef.current;
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

  const filterStoresForSearch = useCallback((value) => {
    const q = String(value || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    if (!q) return [...all].sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || ''))).slice(0, 50);
    return all
      .filter((s) => {
        const name = String(s?.storeName || '').toLowerCase();
        const code = String(s?.storeCode || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || '')))
      .slice(0, 50);
  }, [stores]);

  const storeModalOptions = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    const filtered = q
      ? all.filter((s) => String(s?.storeName || '').toLowerCase().includes(q) || String(s?.storeCode || '').toLowerCase().includes(q))
      : all;
    return [...filtered].sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || ''))).slice(0, 200);
  }, [storeModalQuery, stores]);

  const handleSelectStore = useCallback((store) => {
    if (!store?.storeCode) return;
    setFilters((prev) => ({ ...prev, storeCode: store.storeCode }));
    setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setStoreSearchResults([]);
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
    setShowStoreModal(false);
  }, []);

  const handleStoreInputChange = useCallback((e) => {
    const value = e.target.value;
    setStoreSearchInput(value);
    setFilters((prev) => ({ ...prev, storeCode: '' }));
    if (!value.trim()) {
      setStoreSearchResults([]);
      setShowStoreSuggestions(false);
      setFocusedStoreSuggestionIndex(-1);
      return;
    }
    const results = filterStoresForSearch(value);
    setStoreSearchResults(results);
    setShowStoreSuggestions(true);
    setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
  }, [filterStoresForSearch]);

  const handleStoreKeyDown = useCallback((e) => {
    if (!showStoreSuggestions || storeSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
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
  }, [focusedStoreSuggestionIndex, handleSelectStore, showStoreSuggestions, storeSearchResults]);

  const searchItemsForInput = useCallback(async (value) => {
    const q = String(value || '').trim();
    if (!q) return [];
    try {
      const res = await axios.get(`/api/items/search?query=${encodeURIComponent(q)}`);
      if (res.data?.success && Array.isArray(res.data.items)) return res.data.items.slice(0, 50);
    } catch (err) {
      console.error('Error searching items', err);
    }
    return [];
  }, []);

  const handleSelectItem = useCallback((item) => {
    if (!item) return;
    const itemCode = String(item.itemCode || '').trim();
    const itemName = String(item.itemName || '').trim();
    setItemSearchInput(itemCode ? `${itemName || itemCode} (${itemCode})` : (itemName || ''));
    setFilters((prev) => ({ ...prev, itemQuery: itemCode || itemName || '' }));
    setItemSearchResults([]);
    setShowItemSuggestions(false);
    setFocusedItemSuggestionIndex(-1);
  }, []);

  const handleItemInputChange = useCallback(async (e) => {
    const value = e.target.value;
    setItemSearchInput(value);
    setFilters((prev) => ({ ...prev, itemQuery: value }));
    if (!value.trim()) {
      setItemSearchResults([]);
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
      return;
    }
    const results = await searchItemsForInput(value);
    setItemSearchResults(results);
    setShowItemSuggestions(true);
    setFocusedItemSuggestionIndex(results.length ? 0 : -1);
  }, [searchItemsForInput]);

  const handleItemKeyDown = useCallback((e) => {
    if (!showItemSuggestions || itemSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedItemSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, itemSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedItemSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedItemSuggestionIndex;
      if (idx >= 0 && idx < itemSearchResults.length) handleSelectItem(itemSearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
    }
  }, [focusedItemSuggestionIndex, handleSelectItem, itemSearchResults, showItemSuggestions]);

  const handleSearch = useCallback(async () => {
    setDidSearch(true);
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/closing-stock-item-wise', { params: filters });
      const nextRows = Array.isArray(response.data) ? response.data : [];
      nextRows.sort((a, b) => {
        const districtCmp = String(a?.district || '').localeCompare(String(b?.district || ''));
        if (districtCmp !== 0) return districtCmp;
        const storeCmp = String(a?.storeName || '').localeCompare(String(b?.storeName || ''));
        if (storeCmp !== 0) return storeCmp;
        const categoryCmp = String(a?.itemCategory || '').localeCompare(String(b?.itemCategory || ''));
        if (categoryCmp !== 0) return categoryCmp;
        const itemCmp = String(a?.itemName || '').localeCompare(String(b?.itemName || ''));
        if (itemCmp !== 0) return itemCmp;
        const aOrder = Number.isFinite(Number(a?.sizeOrder)) ? Number(a.sizeOrder) : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(Number(b?.sizeOrder)) ? Number(b.sizeOrder) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a?.size || '').localeCompare(String(b?.size || ''));
      });
      setRows(nextRows);
    } catch (err) {
      console.error(err);
      setRows([]);
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  searchActionRef.current = handleSearch;

  const handleExport = useCallback(async () => {
    try {
      const response = await axios.get('/api/reports/closing-stock-item-wise/export', {
        params: filters,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ClosingStockItemWise_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
      setError('Export failed');
    }
  }, [filters]);
  exportActionRef.current = handleExport;

  const totalQty = useMemo(() => rows.reduce((sum, row) => sum + Number(row?.quantity || 0), 0), [rows]);
  const totalValue = useMemo(() => rows.reduce((sum, row) => sum + Number(row?.value || 0), 0), [rows]);

  const handleItemClick = useCallback((row) => {
    if (!row?.storeCode || !row?.itemCode) return;
    const params = new URLSearchParams({
      storeCode: row.storeCode,
      itemCode: row.itemCode,
      asOnDate: filters.date
    });
    if (row.sizeCode) params.set('sizeCode', row.sizeCode);
    navigate(`/stock-ledger-report?${params.toString()}`);
  }, [filters.date, navigate]);

  return (
    <div className="report-container stock-ledger-container closing-stock-district-wise-container closing-stock-item-wise-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1 className="stock-ledger-title">Closing Stock - Item Wise</h1>
        <div className="stock-ledger-header-actions">
          <div className="stock-ledger-header-date-inline">
            <span className="stock-ledger-header-date-caption">As on Date</span>
            <div className="date-picker-wrapper stock-ledger-header-date">
              <Calendar className="date-picker-icon" size={18} />
              <button type="button" className="date-picker-button" onClick={openDatePicker} disabled={loading}>
                {filters.date ? toDdMmYyyy(filters.date) : ''}
              </button>
              <input
                ref={dateRef}
                type="date"
                className="date-picker-native"
                value={filters.date}
                onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>
          <button className="export-btn stock-ledger-export-btn" onClick={handleExport} disabled={loading || rows.length === 0}>
            <Download size={18} />
            <span>Excel</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>District:</label>
          <select value={filters.district} onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}>
            <option value="">All Districts</option>
            {districts.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group-store">
          <label>Store:</label>
          <div ref={storeSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={storeSearchInput}
              onChange={handleStoreInputChange}
              onKeyDown={handleStoreKeyDown}
              onFocus={() => {
                const results = filterStoresForSearch(storeSearchInput);
                setStoreSearchResults(results);
                setShowStoreSuggestions(true);
                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search store code or name..."
              autoComplete="off"
            />
            {showStoreSuggestions && storeSearchResults.length > 0 && (
              <div ref={storeSuggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', maxHeight: 260, overflowY: 'auto', zIndex: 50 }}>
                {storeSearchResults.map((st, idx) => (
                  <div
                    key={st.storeCode || idx}
                    style={{ padding: '10px 12px', cursor: 'pointer', background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff', borderBottom: '1px solid #f3f4f6' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectStore(st);
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{st.storeName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {st.storeCode}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Item Name:</label>
          <div ref={itemSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={itemSearchInput}
              onChange={handleItemInputChange}
              onKeyDown={handleItemKeyDown}
              onFocus={async () => {
                if (!itemSearchInput.trim()) return;
                const results = await searchItemsForInput(itemSearchInput);
                setItemSearchResults(results);
                setShowItemSuggestions(true);
                setFocusedItemSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search item code or name..."
              autoComplete="off"
            />
            {showItemSuggestions && itemSearchResults.length > 0 && (
              <div ref={itemSuggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', maxHeight: 260, overflowY: 'auto', zIndex: 50 }}>
                {itemSearchResults.map((item, idx) => (
                  <div
                    key={item.itemCode || idx}
                    style={{ padding: '10px 12px', cursor: 'pointer', background: idx === focusedItemSuggestionIndex ? '#eff6ff' : '#fff', borderBottom: '1px solid #f3f4f6' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectItem(item);
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{item.itemName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {item.itemCode}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Size:</label>
          <select value={filters.sizeCode} onChange={(e) => setFilters((prev) => ({ ...prev, sizeCode: e.target.value }))}>
            <option value="">All Sizes</option>
            {sizes.map((sz) => (
              <option key={sz.code || sz.id} value={sz.code || ''}>{sz.name || sz.code}</option>
            ))}
          </select>
        </div>

        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>District</th>
              <th>Store Name</th>
              <th>Item Category</th>
              <th>Item Name</th>
              <th>Size</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">{didSearch ? 'No data found.' : 'Search to view the report.'}</td>
              </tr>
            ) : rows.map((row, idx) => (
              <tr key={`${row.district || ''}|${row.storeName || ''}|${row.itemName || ''}|${row.size || ''}|${idx}`}>
                <td>{row.district}</td>
                <td>{row.storeName}</td>
                <td>{row.itemCategory}</td>
                <td>
                  {row.itemCode && row.storeCode ? (
                    <button type="button" className="qty-link" onClick={() => handleItemClick(row)}>
                      {row.itemName}
                    </button>
                  ) : row.itemName}
                </td>
                <td>{row.size}</td>
                <td className="text-right">{formatQty(row.quantity)}</td>
                <td className="text-right">{formatAmount(row.value)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right font-bold">GRAND TOTAL</td>
                <td className="text-right font-bold">{formatQty(totalQty)}</td>
                <td className="text-right font-bold">{formatAmount(totalValue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <ChangePeriodModal
        open={showChangePeriodModal}
        startDate={filters.date}
        endDate={filters.date}
        onClose={() => setShowChangePeriodModal(false)}
        onApply={({ startDate, endDate }) => {
          const next = String(endDate || startDate || '').trim();
          if (next) setFilters((prev) => ({ ...prev, date: next }));
          setShowChangePeriodModal(false);
        }}
      />

      {showStoreModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Select Store" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowStoreModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="text-base font-bold text-slate-800">Select Store</div>
              <button type="button" onClick={() => setShowStoreModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
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
                    setFocusedStoreModalIndex((prev) => Math.max(0, (prev < 0 ? 0 : prev - 1)));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (focusedStoreModalIndex >= 0 && focusedStoreModalIndex < storeModalOptions.length) {
                      handleSelectStore(storeModalOptions[focusedStoreModalIndex]);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Search store code or name..."
                autoComplete="off"
              />
              <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-200">
                {storeModalOptions.map((st, idx) => (
                  <button
                    key={st.storeCode || idx}
                    type="button"
                    className="w-full text-left px-3 py-2 border-b last:border-b-0 border-slate-100 hover:bg-slate-50"
                    style={{ background: idx === focusedStoreModalIndex ? '#eff6ff' : '#fff' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectStore(st);
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{st.storeName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {st.storeCode}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClosingStockItemWise;
