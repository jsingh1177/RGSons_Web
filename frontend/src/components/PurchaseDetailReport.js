import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const PURCHASE_DETAIL_REPORT_STATE_KEY = 'purchaseDetailReportState:v1';

const loadPurchaseDetailReportState = () => {
  try {
    const raw = sessionStorage.getItem(PURCHASE_DETAIL_REPORT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const savePurchaseDetailReportState = (state) => {
  try {
    sessionStorage.setItem(PURCHASE_DETAIL_REPORT_STATE_KEY, JSON.stringify(state));
  } catch {}
};

const ItemPartyPurchaseReport = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [partySearchInput, setPartySearchInput] = useState('');
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [itemSearchInput, setItemSearchInput] = useState('');

  const [categories, setCategories] = useState([]);
  const [parties, setParties] = useState([]);
  const [brands, setBrands] = useState([]);
  const [partySearchResults, setPartySearchResults] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);
  const [brandSearchResults, setBrandSearchResults] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [focusedBrandSuggestionIndex, setFocusedBrandSuggestionIndex] = useState(-1);
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [focusedItemSuggestionIndex, setFocusedItemSuggestionIndex] = useState(-1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState(() => new Set());

  const startRef = useRef(null);
  const endRef = useRef(null);
  const partyWrapRef = useRef(null);
  const brandWrapRef = useRef(null);
  const itemWrapRef = useRef(null);
  const partySuggestionsRef = useRef(null);
  const brandSuggestionsRef = useRef(null);
  const itemSuggestionsRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);

  const toDdMmYyyy = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    const today = new Date();
    const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1);
    setStartDate(fyStart.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

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

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [catRes, partyRes, brandRes] = await Promise.all([
          axios.get('/api/categories'),
          axios.get('/api/led-masters/by-group-names', {
            params: { names: 'Sundry Debtors,Sundry Creditors' },
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
          }),
          axios.get('/api/brands')
        ]);

        if (catRes.data?.success) {
          setCategories(catRes.data.categories || []);
        } else {
          setCategories([]);
        }

        if (partyRes.data?.success) {
          setParties(Array.isArray(partyRes.data.ledMasters) ? partyRes.data.ledMasters : []);
        } else if (Array.isArray(partyRes.data)) {
          setParties(partyRes.data);
        } else {
          setParties([]);
        }

        if (brandRes.data?.success) {
          setBrands(Array.isArray(brandRes.data.brands) ? brandRes.data.brands : []);
        } else if (Array.isArray(brandRes.data)) {
          setBrands(brandRes.data);
        } else {
          setBrands([]);
        }
      } catch {
        setCategories([]);
        setParties([]);
        setBrands([]);
      }
    };

    fetchLookups();
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

  const openStartPicker = () => openPicker(startRef);
  const openEndPicker = () => openPicker(endRef);

  const filterPartiesForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(parties) ? parties : [];
    if (!v) return all.slice(0, 50);
    return all.filter(p => {
      const name = String(p?.name || '').toLowerCase();
      const code = String(p?.code || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  }, [parties]);

  const filterBrandsForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(brands) ? brands : [];
    const active = all.filter((b) => b?.status !== false);
    if (!v) return active.slice(0, 50);
    return active.filter((b) => {
      const name = String(b?.name || '').toLowerCase();
      const code = String(b?.code || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  }, [brands]);

  const searchItemsForSuggestions = useCallback(async (value) => {
    const query = String(value || '').trim();
    if (!query) {
      setItemSearchResults([]);
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/items/search', {
        params: { query },
        headers: { Authorization: `Bearer ${token}` }
      });
      let items = Array.isArray(res.data?.items) ? res.data.items : [];
      if (categoryCode) {
        items = items.filter((item) => String(item?.categoryCode || '') === String(categoryCode));
      }
      items = items.slice(0, 50);
      setItemSearchResults(items);
      setShowItemSuggestions(items.length > 0);
      setFocusedItemSuggestionIndex(items.length > 0 ? 0 : -1);
    } catch {
      setItemSearchResults([]);
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
    }
  }, [categoryCode]);

  const handlePartyInputChange = (e) => {
    const value = e.target.value;
    setPartySearchInput(value);
    setPartyCode('');
    if (!value) {
      setPartySearchResults([]);
      setShowPartySuggestions(false);
      setFocusedPartySuggestionIndex(-1);
      return;
    }
    const results = filterPartiesForSearch(value);
    setPartySearchResults(results);
    setShowPartySuggestions(true);
    setFocusedPartySuggestionIndex(results.length ? 0 : -1);
  };

  const handleSelectParty = (party) => {
    if (!party?.code) return;
    setPartyCode(party.code);
    setPartySearchInput(`${party.name} (${party.code})`);
    setPartySearchResults([]);
    setShowPartySuggestions(false);
    setFocusedPartySuggestionIndex(-1);
  };

  const handleBrandInputChange = (e) => {
    const value = e.target.value;
    setBrandSearchInput(value);
    const results = filterBrandsForSearch(value);
    setBrandSearchResults(results);
    setShowBrandSuggestions(results.length > 0);
    setFocusedBrandSuggestionIndex(results.length > 0 ? 0 : -1);
  };

  const handleSelectBrand = (brand) => {
    const label = String(brand?.name || '').trim();
    setBrandSearchInput(label);
    setBrandSearchResults([]);
    setShowBrandSuggestions(false);
    setFocusedBrandSuggestionIndex(-1);
  };

  const handleBrandKeyDown = (e) => {
    if (!showBrandSuggestions || brandSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedBrandSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, brandSearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedBrandSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedBrandSuggestionIndex;
      if (idx >= 0 && idx < brandSearchResults.length) handleSelectBrand(brandSearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowBrandSuggestions(false);
      setFocusedBrandSuggestionIndex(-1);
    }
  };

  const handleItemInputChange = async (e) => {
    const value = e.target.value;
    setItemSearchInput(value);
    await searchItemsForSuggestions(value);
  };

  const handleSelectItem = (item) => {
    const label = String(item?.itemName || item?.itemCode || '').trim();
    setItemSearchInput(label);
    setItemSearchResults([]);
    setShowItemSuggestions(false);
    setFocusedItemSuggestionIndex(-1);
  };

  const handleItemKeyDown = (e) => {
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
  };

  const handlePartyKeyDown = (e) => {
    if (!showPartySuggestions || partySearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedPartySuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, partySearchResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedPartySuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedPartySuggestionIndex;
      if (idx >= 0 && idx < partySearchResults.length) handleSelectParty(partySearchResults[idx]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowPartySuggestions(false);
      setFocusedPartySuggestionIndex(-1);
    }
  };

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (partyWrapRef.current && !partyWrapRef.current.contains(t)) {
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
      }
      if (brandWrapRef.current && !brandWrapRef.current.contains(t)) {
        setShowBrandSuggestions(false);
        setFocusedBrandSuggestionIndex(-1);
      }
      if (itemWrapRef.current && !itemWrapRef.current.contains(t)) {
        setShowItemSuggestions(false);
        setFocusedItemSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const itemGroups = useMemo(() => {
    const groups = new Map();
    (rows || []).forEach((row, idx) => {
      const brandName = String(row?.brandName || '').trim();
      const itemName = String(row?.itemName || '').trim();
      const key = `${brandName}__${itemName}`;
      const existing = groups.get(key) || {
        key,
        brandName,
        itemName,
        qty: 0,
        amt: 0,
        details: []
      };
      existing.qty += Number(row?.qty || 0);
      existing.amt += Number(row?.amt || 0);
      existing.details.push({
        ...row,
        __rowKey: `ipd:${key}:${idx}`,
        __groupKey: key
      });
      groups.set(key, existing);
    });
    return Array.from(groups.values());
  }, [rows]);

  const allItemsExpanded = useMemo(() => {
    if (!itemGroups.length) return false;
    return itemGroups.every((group) => expandedItems.has(group.key));
  }, [expandedItems, itemGroups]);

  const displayedRows = useMemo(() => {
    const list = [];
    itemGroups.forEach((group) => {
      if (expandedItems.has(group.key)) {
        group.details.forEach((detail) => {
          list.push({
            type: 'detail',
            key: detail.__rowKey,
            groupKey: group.key,
            brandName: detail.brandName,
            itemName: detail.itemName,
            partyName: detail.partyName,
            qty: detail.qty,
            amt: detail.amt
          });
        });
      } else {
        list.push({
          type: 'summary',
          key: `ips:${group.key}`,
          groupKey: group.key,
          brandName: group.brandName,
          itemName: group.itemName,
          partyName: '',
          qty: group.qty,
          amt: group.amt
        });
      }
    });
    return list;
  }, [expandedItems, itemGroups]);

  const selectableRowKeys = useMemo(() => displayedRows.map((row) => row.key), [displayedRows]);

  useEffect(() => {
    if (selectableRowKeys.length === 0) {
      setFocusedRowIndex(-1);
      setSelectedRowKeys(new Set());
      return;
    }
    setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev, selectableRowKeys.length - 1)));
  }, [selectableRowKeys]);

  useEffect(() => {
    if (focusedRowIndex < 0) return;
    const key = selectableRowKeys[focusedRowIndex];
    if (!key) return;
    const el = tableContainerRef.current;
    const tr = el ? el.querySelector(`tr[data-row-key="${key}"]`) : null;
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

  const fetchData = async () => {
    if (!startDate || !endDate) {
      Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
      return;
    }

    setLoading(true);
    setRows([]);
    try {
      const token = localStorage.getItem('token');
      const params = {
        startDate,
        endDate,
        categoryCode: categoryCode || undefined,
        partyCode: partyCode || undefined,
        brandName: brandSearchInput.trim() || undefined,
        itemName: itemSearchInput.trim() || undefined
      };
      const res = await axios.get('/api/reports/purchase-detail', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch {
      Swal.fire('Error', 'Failed to fetch report', 'error');
    } finally {
      setLoading(false);
    }
  };
  searchActionRef.current = fetchData;

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate]);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        startDate,
        endDate,
        categoryCode: categoryCode || undefined,
        partyCode: partyCode || undefined,
        brandName: brandSearchInput.trim() || undefined,
        itemName: itemSearchInput.trim() || undefined
      };
      const res = await axios.get('/api/reports/purchase-detail/export', {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ItemWisePartyWisePurchase.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      Swal.fire('Error', 'Failed to export report', 'error');
    } finally {
      setLoading(false);
    }
  };
  exportActionRef.current = handleExport;

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
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        setExpandedItems(() => {
          if (!itemGroups.length) return new Set();
          if (allItemsExpanded) return new Set();
          return new Set(itemGroups.map((group) => group.key));
        });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [allItemsExpanded, itemGroups]);

  useEffect(() => {
    setExpandedItems(new Set());
  }, [rows]);

  useEffect(() => {
    const containers = [
      { show: showPartySuggestions, index: focusedPartySuggestionIndex, ref: partySuggestionsRef },
      { show: showBrandSuggestions, index: focusedBrandSuggestionIndex, ref: brandSuggestionsRef },
      { show: showItemSuggestions, index: focusedItemSuggestionIndex, ref: itemSuggestionsRef }
    ];
    containers.forEach(({ show, index, ref }) => {
      if (!show || index < 0 || !ref.current) return;
      const el = ref.current.querySelector(`[data-suggestion-index="${index}"]`);
      if (el && typeof el.scrollIntoView === 'function') {
        try {
          el.scrollIntoView({ block: 'nearest' });
        } catch {}
      }
    });
  }, [
    showPartySuggestions,
    focusedPartySuggestionIndex,
    showBrandSuggestions,
    focusedBrandSuggestionIndex,
    showItemSuggestions,
    focusedItemSuggestionIndex
  ]);

  const totals = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    let qty = 0;
    let amt = 0;
    for (const r of list) {
      qty += Number(r?.qty || 0);
      amt += Number(r?.amt || 0);
    }
    return { qty, amt };
  }, [rows]);

  const sortedCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return [...list].sort((a, b) => {
      const oa = Number(a?.shortOrder || 0);
      const ob = Number(b?.shortOrder || 0);
      if (oa !== ob) return oa - ob;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }, [categories]);

  return (
    <div className="report-container stock-ledger-container stock-ledger-report">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1 className="stock-ledger-title">Item Wise-Party Wise Purchase</h1>
        <div className="stock-ledger-header-actions">
          <button className="export-btn stock-ledger-export-btn" onClick={handleExport} disabled={loading}>
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>From Date</label>
          <div className="date-picker-wrapper">
            <Calendar className="date-picker-icon" size={18} />
            <button type="button" className="date-picker-button" onClick={openStartPicker} disabled={loading}>
              {startDate ? toDdMmYyyy(startDate) : ''}
            </button>
            <input
              ref={startRef}
              type="date"
              className="date-picker-native"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <div className="date-picker-wrapper">
            <Calendar className="date-picker-icon" size={18} />
            <button type="button" className="date-picker-button" onClick={openEndPicker} disabled={loading}>
              {endDate ? toDdMmYyyy(endDate) : ''}
            </button>
            <input
              ref={endRef}
              type="date"
              className="date-picker-native"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} disabled={loading}>
            <option value="">All</option>
            {sortedCategories.map((c) => (
              <option key={c.code || c.id} value={c.code || ''}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Party</label>
          <div ref={partyWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={partySearchInput}
              onChange={handlePartyInputChange}
              onKeyDown={handlePartyKeyDown}
              onFocus={() => {
                const results = filterPartiesForSearch(partySearchInput);
                setPartySearchResults(results);
                setShowPartySuggestions(true);
                setFocusedPartySuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search party..."
              disabled={loading}
              autoComplete="off"
            />
            {showPartySuggestions && partySearchResults.length > 0 && (
              <div ref={partySuggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {partySearchResults.map((p, idx) => (
                  <div
                    key={`${String(p?.code || idx)}-${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => handleSelectParty(p)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedPartySuggestionIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(p?.name || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(p?.code || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Brand</label>
          <div ref={brandWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={brandSearchInput}
              onChange={handleBrandInputChange}
              onKeyDown={handleBrandKeyDown}
              onFocus={() => {
                const results = filterBrandsForSearch(brandSearchInput);
                setBrandSearchResults(results);
                setShowBrandSuggestions(results.length > 0);
                setFocusedBrandSuggestionIndex(results.length > 0 ? 0 : -1);
              }}
              placeholder="Search brand..."
              disabled={loading}
              autoComplete="off"
            />
            {showBrandSuggestions && brandSearchResults.length > 0 && (
              <div ref={brandSuggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {brandSearchResults.map((b, idx) => (
                  <div
                    key={`${String(b?.code || idx)}-${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => handleSelectBrand(b)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedBrandSuggestionIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(b?.name || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(b?.code || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Item</label>
          <div ref={itemWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={itemSearchInput}
              onChange={handleItemInputChange}
              onKeyDown={handleItemKeyDown}
              onFocus={() => {
                if (!itemSearchInput.trim()) return;
                searchItemsForSuggestions(itemSearchInput);
              }}
              placeholder="Search item..."
              disabled={loading}
              autoComplete="off"
            />
            {showItemSuggestions && itemSearchResults.length > 0 && (
              <div ref={itemSuggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {itemSearchResults.map((item, idx) => (
                  <div
                    key={`${String(item?.itemCode || idx)}-${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => handleSelectItem(item)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedItemSuggestionIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(item?.itemName || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(item?.itemCode || '')}
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
              <th>Brand Name</th>
              <th>Item Name</th>
              <th>Party Name</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  No data available for the selected period
                </td>
              </tr>
            ) : (
              displayedRows.map((r, idx) => {
                const rowKey = selectableRowKeys[idx];
                const isFocused = idx === focusedRowIndex;
                const isSelected = selectedRowKeys.has(rowKey);
                return (
                  <tr
                    key={rowKey}
                    data-row-key={rowKey}
                    className={`${isFocused ? 'row-focused' : ''} ${isSelected ? 'row-selected' : ''} ${r?.type === 'summary' ? 'row-summary' : 'row-detail'}`}
                    onClick={() => {
                      setFocusedRowIndex(idx);
                      toggleSelectedRow(rowKey);
                    }}
                  >
                    <td>{r?.brandName || ''}</td>
                    <td style={{ fontWeight: r?.type === 'summary' ? 'bold' : undefined }}>{r?.itemName || ''}</td>
                    <td style={{ fontWeight: r?.type === 'summary' ? 'bold' : undefined }}>{r?.type === 'summary' ? 'Item Total' : (r?.partyName || '')}</td>
                    <td style={{ textAlign: 'right', fontWeight: r?.type === 'summary' ? 'bold' : undefined }}>{Number(r?.qty || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: r?.type === 'summary' ? 'bold' : undefined }}>{Number(r?.amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {displayedRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 'bold' }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{totals.qty.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{totals.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          )}
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
    </div>
  );
};

const PurchaseDetailPivotReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const lockedStoreCode = searchParams.get('storeCode') || '';
  const storeLocked = searchParams.get('lockedStore') === 'true' && !!lockedStoreCode;
  const restoredStateRef = useRef(null);
  if (restoredStateRef.current === null) {
    restoredStateRef.current = loadPurchaseDetailReportState();
  }

  const [startDate, setStartDate] = useState(() => restoredStateRef.current?.startDate || '');
  const [endDate, setEndDate] = useState(() => restoredStateRef.current?.endDate || '');
  const [district, setDistrict] = useState(() => restoredStateRef.current?.district || '');
  const [storeCode, setStoreCode] = useState(() => {
    if (storeLocked && lockedStoreCode) return lockedStoreCode;
    return restoredStateRef.current?.storeCode || '';
  });
  const [partyCode, setPartyCode] = useState(() => restoredStateRef.current?.partyCode || '');

  const [districts, setDistricts] = useState([]);
  const [stores, setStores] = useState([]);
  const [parties, setParties] = useState([]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSearchRequested, setLastSearchRequested] = useState(() => !!restoredStateRef.current?.lastSearchRequested);
  const autoSearchOnceRef = useRef(false);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());
  const [expandedDateKeys, setExpandedDateKeys] = useState(() => new Set());
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');

  const [districtSearchInput, setDistrictSearchInput] = useState(() => restoredStateRef.current?.districtSearchInput || '');
  const [districtSearchResults, setDistrictSearchResults] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [focusedDistrictSuggestionIndex, setFocusedDistrictSuggestionIndex] = useState(-1);

  const [partySearchInput, setPartySearchInput] = useState(() => restoredStateRef.current?.partySearchInput || '');
  const [partySearchResults, setPartySearchResults] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);

  const [storeSearchInput, setStoreSearchInput] = useState(() => restoredStateRef.current?.storeSearchInput || '');
  const [storeSearchResults, setStoreSearchResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const storeModalSearchRef = useRef(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);

  const selectableColumnDefs = useMemo(() => ([
    { key: 'storeCode', label: 'Store Code' },
    { key: 'storeName', label: 'Store Name' },
    { key: 'partyInvoiceNo', label: 'Party Invoice#' },
    { key: 'supplierName', label: 'Supplier Name' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'sizeName', label: 'Size Name' }
  ]), []);

  const [selectedColumns, setSelectedColumns] = useState(() => {
    const all = selectableColumnDefs.map(c => c.key);
    const saved = restoredStateRef.current?.selectedColumns;
    if (Array.isArray(saved) && saved.length > 0) {
      const next = new Set();
      for (const v of saved) {
        const k = String(v || '').trim();
        if (all.includes(k)) next.add(k);
      }
      if (next.size > 0) return next;
    }
    return new Set(all);
  });

  const districtSearchWrapRef = useRef(null);
  const partySearchWrapRef = useRef(null);
  const storeSearchWrapRef = useRef(null);
  const districtSuggestionsRef = useRef(null);
  const storeSuggestionsRef = useRef(null);
  const partySuggestionsRef = useRef(null);
  const lastHiddenStorageKeyRef = useRef(null);

  const storeModalStores = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    const districtFiltered = district
      ? all.filter(s => String(s?.district || '').trim() === String(district || '').trim())
      : all;
    if (!q) return districtFiltered.slice(0, 100);
    return districtFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 100);
  }, [district, storeModalQuery, stores]);

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
        if (voucherModalOpen) return;
        setShowChangePeriodModal(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (storeLocked) return;
        if (showStoreModal) return;
        if (showChangePeriodModal) return;
        if (voucherModalOpen) return;
        setStoreModalQuery('');
        const active = Array.isArray(storeModalStores) ? storeModalStores : [];
        const idx = storeCode
          ? active.findIndex(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim())
          : -1;
        setFocusedStoreModalIndex(idx >= 0 ? idx : (active.length ? 0 : -1));
        setShowStoreModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChangePeriodModal, showStoreModal, storeCode, storeLocked, storeModalStores, voucherModalOpen]);

  useEffect(() => {
    const toIsoLocalDate = (d) => {
      if (!d) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(prev => prev || toIsoLocalDate(firstDay));
    setEndDate(prev => prev || toIsoLocalDate(today));
  }, []);

  const toDdMmYyyy = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return String(iso);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const openDatePicker = (ref) => {
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

  const openStartDatePicker = () => openDatePicker(startDateRef);
  const openEndDatePicker = () => openDatePicker(endDateRef);

  useEffect(() => {
    if (!storeLocked || !lockedStoreCode) return;
    if (storeCode !== lockedStoreCode) setStoreCode(lockedStoreCode);
  }, [storeLocked, lockedStoreCode, storeCode]);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const token = localStorage.getItem('token');
        const [districtsRes, storesRes, partiesRes] = await Promise.all([
          axios.get('/api/reports/purchase-summary/districts', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/stores', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/led-masters/by-group-names', {
            params: { names: 'Sundry Debtors,Sundry Creditors' },
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setDistricts(Array.isArray(districtsRes.data) ? districtsRes.data : []);

        const storeList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || []);
        if (storeLocked && storeCode) {
          setStores(storeList.filter(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim()));
        } else {
          setStores(storeList);
        }

        if (partiesRes.data?.success) {
          setParties(Array.isArray(partiesRes.data.ledMasters) ? partiesRes.data.ledMasters : []);
        } else if (Array.isArray(partiesRes.data)) {
          setParties(partiesRes.data);
        } else {
          setParties([]);
        }
      } catch {
        setDistricts([]);
        setStores([]);
        setParties([]);
      }
    };

    fetchLookups();
  }, [storeLocked, storeCode]);

  useEffect(() => {
    savePurchaseDetailReportState({
      startDate,
      endDate,
      district,
      storeCode,
      partyCode,
      districtSearchInput,
      storeSearchInput,
      partySearchInput,
      lastSearchRequested,
      selectedColumns: Array.from(selectedColumns)
    });
  }, [startDate, endDate, district, storeCode, partyCode, districtSearchInput, storeSearchInput, partySearchInput, lastSearchRequested, selectedColumns]);

  const filterDistrictsForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(districts) ? districts : [];
    if (!v) return all.slice(0, 50);
    return all.filter(d => String(d || '').toLowerCase().includes(v)).slice(0, 50);
  }, [districts]);

  const filterStoresForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    const districtFiltered = district
      ? all.filter(s => String(s?.district || '').trim() === String(district || '').trim())
      : all;
    if (!v) return districtFiltered.slice(0, 50);
    return districtFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  }, [stores, district]);

  const filterPartiesForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(parties) ? parties : [];
    if (!v) return all.slice(0, 50);
    return all.filter(p => {
      const name = String(p?.name || '').toLowerCase();
      const code = String(p?.code || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  }, [parties]);

  const applyDistrict = useCallback((next) => {
    setDistrict(next);
    setDistrictSearchInput(next);
    setShowDistrictSuggestions(false);
    setFocusedDistrictSuggestionIndex(-1);
    if (!storeLocked) {
      setStoreCode('');
      setStoreSearchInput('');
    }
  }, [storeLocked]);

  const applyStore = useCallback((store) => {
    if (!store?.storeCode) return;
    setStoreCode(store.storeCode);
    setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
  }, []);

  const applyParty = useCallback((party) => {
    if (!party?.code) return;
    setPartyCode(party.code);
    setPartySearchInput(`${party.name} (${party.code})`);
    setShowPartySuggestions(false);
    setFocusedPartySuggestionIndex(-1);
  }, []);

  useEffect(() => {
    if (!showDistrictSuggestions) return;
    const container = districtSuggestionsRef.current;
    const idx = focusedDistrictSuggestionIndex;
    if (!container || idx < 0) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try { el.scrollIntoView({ block: 'nearest' }); } catch {}
  }, [showDistrictSuggestions, focusedDistrictSuggestionIndex]);

  useEffect(() => {
    if (!showStoreSuggestions) return;
    const container = storeSuggestionsRef.current;
    const idx = focusedStoreSuggestionIndex;
    if (!container || idx < 0) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try { el.scrollIntoView({ block: 'nearest' }); } catch {}
  }, [showStoreSuggestions, focusedStoreSuggestionIndex]);

  useEffect(() => {
    if (!showPartySuggestions) return;
    const container = partySuggestionsRef.current;
    const idx = focusedPartySuggestionIndex;
    if (!container || idx < 0) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try { el.scrollIntoView({ block: 'nearest' }); } catch {}
  }, [showPartySuggestions, focusedPartySuggestionIndex]);

  useEffect(() => {
    const onMouseDown = (e) => {
      const t = e.target;
      if (districtSearchWrapRef.current && !districtSearchWrapRef.current.contains(t)) {
        setShowDistrictSuggestions(false);
        setFocusedDistrictSuggestionIndex(-1);
      }
      if (storeSearchWrapRef.current && !storeSearchWrapRef.current.contains(t)) {
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
      }
      if (partySearchWrapRef.current && !partySearchWrapRef.current.contains(t)) {
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  const formatAmount = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatQty = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const handleSearch = useCallback(async () => {
    if (!startDate || !endDate) {
      Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
      return;
    }

    setLastSearchRequested(true);
    setLoading(true);
    setData([]);
    try {
      const token = localStorage.getItem('token');
      const supplierNameQuery = !partyCode
        ? String(partySearchInput || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
        : '';
      const params = {
        startDate,
        endDate,
        district: district || undefined,
        storeCode: storeCode || undefined,
        partyCode: partyCode || undefined,
        supplierName: supplierNameQuery || undefined
      };
      const res = await axios.get('/api/reports/purchase-detail/detail', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data || []);
    } catch {
      Swal.fire('Error', 'Failed to fetch Purchase Detail Report', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, district, storeCode, partyCode, partySearchInput]);
  searchActionRef.current = handleSearch;

  useEffect(() => {
    if (autoSearchOnceRef.current) return;
    if (!lastSearchRequested) return;
    if (!startDate || !endDate) return;
    autoSearchOnceRef.current = true;
    handleSearch();
  }, [handleSearch, lastSearchRequested, startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate, storeCode]);

  const toggleSelectedColumn = useCallback((key) => {
    if (!key) return;
    setSelectedColumns(prev => {
      const next = new Set(prev || []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleColumnKeys = useMemo(() => {
    const base = ['storeCode', 'storeName', 'date', 'billNumber', 'partyInvoiceNo', 'supplierName', 'itemName', 'sizeName'];
    const out = [];
    for (const k of base) {
      if (k === 'date' || k === 'billNumber') {
        out.push(k);
        continue;
      }
      if (selectedColumns?.has(k)) out.push(k);
    }
    out.push('quantity', 'amount');
    return out;
  }, [selectedColumns]);

  const selectedGroupKeys = useMemo(() => {
    const base = selectableColumnDefs.map(c => c.key);
    return base.filter(k => selectedColumns?.has(k));
  }, [selectableColumnDefs, selectedColumns]);

  const invoiceLabelColumnKey = useMemo(() => {
    const order = ['itemName', 'sizeName', 'supplierName', 'partyInvoiceNo', 'storeName', 'storeCode'];
    for (const k of order) {
      if (selectedColumns?.has(k)) return k;
    }
    return null;
  }, [selectedColumns]);

  const columnLabelByKey = useMemo(() => {
    const m = {
      storeCode: 'Store Code',
      storeName: 'Store Name',
      date: 'Date',
      billNumber: 'Bill Number',
      partyInvoiceNo: 'Party Invoice#',
      supplierName: 'Supplier Name',
      itemName: 'Item Name',
      sizeName: 'Size Name',
      quantity: 'Quantity',
      amount: 'Amount'
    };
    for (const c of selectableColumnDefs || []) {
      if (!c?.key) continue;
      m[c.key] = c.label || c.key;
    }
    return m;
  }, [selectableColumnDefs]);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const rows = (flattenedRows || []).map((entry) => {
        const out = {};
        if (entry.kind === 'group') {
          const t = entry.totals || {};
          const expanded = expandedDateKeys.has(entry.dateKey);
          for (const k of visibleColumnKeys) {
            if (k === 'date') out.date = String(entry.dateKey || '');
            else if (k === 'billNumber') out.billNumber = expanded ? 'Totals (expanded)' : 'Totals';
            else if (k === 'quantity') out.quantity = Number(t.quantity || 0);
            else if (k === 'amount') out.amount = Number(t.amount || 0);
            else out[k] = '';
          }
          return out;
        }
        if (entry.kind === 'invoice') {
          const t = entry.totals || {};
          for (const k of visibleColumnKeys) {
            if (k === 'date') out.date = String(entry.dateKey || '');
            else if (k === 'billNumber') out.billNumber = String(entry.billNumber || '');
            else if (k === 'quantity') out.quantity = Number(t.quantity || 0);
            else if (k === 'amount') out.amount = Number(t.amount || 0);
            else if (invoiceLabelColumnKey && k === invoiceLabelColumnKey) out[k] = 'Invoice Total';
            else out[k] = String(entry[k] || '');
          }
          return out;
        }
        const row = entry.row || {};
        for (const k of visibleColumnKeys) {
          if (k === 'quantity') out.quantity = Number(row.quantity || 0);
          else if (k === 'amount') out.amount = Number(row.amount || 0);
          else out[k] = String(row[k] || '');
        }
        return out;
      });

      const response = await axios.post('/api/reports/purchase-detail/detail/export-view', {
        rows,
        columns: visibleColumnKeys
      }, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PurchaseDetail_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      Swal.fire('Error', 'Failed to export Purchase Detail Report', 'error');
    }
  };
  exportActionRef.current = handleExport;

  const getRowKey = useCallback((row, idx) => {
    const sc = String(row?.storeCode || '').trim();
    const bill = String(row?.billNumber || '').trim();
    const dt = String(row?.date || '').trim();
    const billKey = bill || `idx${idx}`;
    const itemName = String(row?.itemName || '').trim();
    const sizeName = String(row?.sizeName || '').trim();
    const itemKey = itemName || `it${idx}`;
    return `pd:${sc}:${billKey}:${dt}:${itemKey}:${sizeName}:${idx}`;
  }, []);

  const selectedColumnsKey = useMemo(() => {
    return Array.from(selectedColumns || []).map(v => String(v)).sort().join(',');
  }, [selectedColumns]);

  const hiddenStorageKey = useMemo(() => {
    const sd = String(startDate || '').trim();
    const ed = String(endDate || '').trim();
    const dist = String(district || '').trim();
    const sc = String(storeCode || '').trim();
    const pc = String(partyCode || '').trim();
    return `RG_hiddenRows_purchaseDetail:${sd}|${ed}|${dist}|${sc}|${pc}|${selectedColumnsKey}`;
  }, [startDate, endDate, district, storeCode, partyCode, selectedColumnsKey]);

  useEffect(() => {
    if (lastHiddenStorageKeyRef.current !== hiddenStorageKey) {
      setHiddenRowKeys(new Set());
      lastHiddenStorageKeyRef.current = hiddenStorageKey;
    }
    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setHiddenRowKeys(new Set(parsed.map((v) => String(v))));
    } catch {}
  }, [hiddenStorageKey]);

  useEffect(() => {
    try {
      if (!hiddenRowKeys || hiddenRowKeys.size === 0) {
        localStorage.removeItem(hiddenStorageKey);
        return;
      }
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
    } catch {}
  }, [hiddenRowKeys, hiddenStorageKey]);

  const aggregatedDetails = useMemo(() => {
    const allKeys = selectableColumnDefs.map(c => c.key);
    const map = new Map();
    const order = [];
    for (const src of (data || [])) {
      const r = src || {};
      const dateKey = String(r.date || '').trim();
      const billNumber = String(r.billNumber || '').trim();
      if (!dateKey || !billNumber) continue;
      const keyParts = [dateKey, billNumber, ...(selectedGroupKeys || []).map(k => String(r[k] || '').trim())];
      const key = keyParts.join('||');
      let agg = map.get(key);
      if (!agg) {
        agg = { date: dateKey, billNumber };
        for (const k of allKeys) agg[k] = String(r[k] || '');
        agg.quantity = 0;
        agg.amount = 0;
        map.set(key, agg);
        order.push(key);
      }
      agg.quantity += Number(r.quantity || 0);
      agg.amount += Number(r.amount || 0);
    }
    return order.map(k => map.get(k)).filter(Boolean);
  }, [data, selectableColumnDefs, selectedGroupKeys]);

  const aggregatedWithKeys = useMemo(() => {
    return (aggregatedDetails || []).map((row, idx) => ({ row, idx, rowKey: getRowKey(row, idx) }));
  }, [aggregatedDetails, getRowKey]);

  const visibleDetails = useMemo(() => {
    const hidden = hiddenRowKeys || new Set();
    const hiddenDates = new Set();
    const hiddenInvoices = new Set();
    hidden.forEach((k) => {
      const s = String(k || '');
      if (s.startsWith('g|')) hiddenDates.add(s.slice(2));
      if (s.startsWith('i|')) hiddenInvoices.add(s.slice(2));
    });
    return (aggregatedWithKeys || []).filter(r => {
      if (hidden.has(r.rowKey)) return false;
      const dateKey = String(r?.row?.date || '').trim();
      if (hiddenDates.has(dateKey)) return false;
      const bill = String(r?.row?.billNumber || '').trim();
      const invKey = `${dateKey}|${bill}`;
      if (hiddenInvoices.has(invKey)) return false;
      return true;
    });
  }, [aggregatedWithKeys, hiddenRowKeys]);

  const dateGroupedRows = useMemo(() => {
    const map = new Map();
    for (const r of visibleDetails || []) {
      const dateKey = String(r?.row?.date || '').trim();
      if (!dateKey) continue;
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          rows: [],
          totals: {
            quantity: 0,
            amount: 0
          }
        });
      }
      const g = map.get(dateKey);
      g.rows.push(r);
      const row = r.row || {};
      g.totals.quantity += Number(row.quantity || 0);
      g.totals.amount += Number(row.amount || 0);
    }
    const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
    const out = Array.from(map.values());
    for (const g of out) {
      g.rows.sort((ra, rb) => {
        const a = ra?.row || {};
        const b = rb?.row || {};
        const billCmp = cmp(a.billNumber, b.billNumber);
        if (billCmp !== 0) return billCmp;
        for (const k of (selectedGroupKeys || [])) {
          const d = cmp(a[k], b[k]);
          if (d !== 0) return d;
        }
        return cmp(ra.rowKey, rb.rowKey);
      });
    }
    out.sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));
    return out;
  }, [visibleDetails, selectedGroupKeys]);

  const flattenedRows = useMemo(() => {
    const out = [];
    const hidden = hiddenRowKeys || new Set();
    const allKeys = selectableColumnDefs.map(c => c.key);
    for (const g of dateGroupedRows) {
      const groupKey = `g|${g.dateKey}`;
      if (hidden.has(groupKey)) continue;
      out.push({ kind: 'group', key: groupKey, dateKey: g.dateKey, totals: g.totals });
      if (!expandedDateKeys.has(g.dateKey)) continue;
      const invoiceGroups = [];
      let current = null;
      for (const r of g.rows) {
        const row = r?.row || {};
        const billNumber = String(row?.billNumber || '').trim();
        if (!current || current.billNumber !== billNumber) {
          current = {
            billNumber,
            dateKey: g.dateKey,
            totals: { quantity: 0, amount: 0 },
            rows: [],
            meta: {}
          };
          for (const k of allKeys) current.meta[k] = String(row[k] || '');
          invoiceGroups.push(current);
        }
        current.rows.push(r);
        current.totals.quantity += Number(row.quantity || 0);
        current.totals.amount += Number(row.amount || 0);
      }
      for (const inv of invoiceGroups) {
        const invoiceKey = `i|${inv.dateKey}|${inv.billNumber}`;
        if (hidden.has(invoiceKey)) continue;
        out.push({ kind: 'invoice', key: invoiceKey, dateKey: inv.dateKey, billNumber: inv.billNumber, totals: inv.totals, ...inv.meta });
        for (const r of inv.rows) {
          out.push({ kind: 'detail', key: r.rowKey, dateKey: g.dateKey, row: r.row, rowKey: r.rowKey });
        }
      }
    }
    return out;
  }, [dateGroupedRows, expandedDateKeys, hiddenRowKeys, selectableColumnDefs]);

  const grandTotals = useMemo(() => {
    return (visibleDetails || []).reduce((acc, r) => {
      const row = r.row || {};
      acc.quantity += Number(row.quantity || 0);
      acc.amount += Number(row.amount || 0);
      return acc;
    }, {
      quantity: 0,
      amount: 0
    });
  }, [visibleDetails]);

  const selectableRowKeys = useMemo(() => {
    return (flattenedRows || []).filter(e => e.kind === 'detail').map(e => e.rowKey);
  }, [flattenedRows]);

  const selectableRowIndexByKey = useMemo(() => {
    const map = new Map();
    (flattenedRows || []).forEach((e, idx) => {
      if (e?.kind !== 'detail') return;
      if (!e?.rowKey) return;
      map.set(e.rowKey, idx);
    });
    return map;
  }, [flattenedRows]);

  useEffect(() => {
    if (!flattenedRows || flattenedRows.length === 0) {
      setFocusedRowIndex(-1);
      setSelectedRowKeys(new Set());
      return;
    }
    setFocusedRowIndex((prev) => (prev >= 0 && prev < flattenedRows.length ? prev : 0));
    setSelectedRowKeys((prev) => {
      if (!prev || prev.size === 0) return prev;
      const allowed = new Set(selectableRowKeys);
      const next = new Set();
      prev.forEach((k) => {
        if (allowed.has(k)) next.add(k);
      });
      return next;
    });
  }, [flattenedRows, selectableRowKeys]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    if (focusedRowIndex < 0 || focusedRowIndex >= flattenedRows.length) return;
    const entry = flattenedRows[focusedRowIndex];
    if (!entry) return;
    const selector = entry.kind === 'detail' && entry.rowKey
      ? `tr[data-row-key="${entry.rowKey}"]`
      : entry.kind === 'invoice'
        ? `tr[data-invoice-group="${entry.dateKey}|${entry.billNumber}"]`
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
    if (!flattenedRows || flattenedRows.length === 0) return;
    const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
    const entry = flattenedRows[idx];
    if (!entry) return;
    const rowKey = entry.kind === 'group'
      ? `g|${entry.dateKey}`
      : entry.kind === 'invoice'
        ? `i|${entry.dateKey}|${entry.billNumber}`
        : entry.rowKey;
    if (!rowKey) return;
    setHiddenRowKeys((prev) => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
    if (entry.kind === 'detail' && entry.rowKey) {
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        next.delete(entry.rowKey);
        return next;
      });
    }
  }, [focusedRowIndex, flattenedRows]);

  const unhideAllRows = useCallback(() => {
    setHiddenRowKeys(new Set());
    setSelectedColumns(new Set((selectableColumnDefs || []).map(c => c.key)));
    try {
      localStorage.removeItem(hiddenStorageKey);
    } catch {}
    lastHiddenStorageKeyRef.current = null;
  }, [hiddenStorageKey, selectableColumnDefs]);

  const toggleExpandCollapseAll = useCallback(() => {
    const hidden = hiddenRowKeys || new Set();
    const visibleDates = (dateGroupedRows || [])
      .map(g => String(g?.dateKey || '').trim())
      .filter(Boolean)
      .filter(d => !hidden.has(`g|${d}`));

    setExpandedDateKeys((prev) => {
      const current = prev || new Set();
      const allExpanded = visibleDates.length > 0 && visibleDates.every(d => current.has(d));
      return allExpanded ? new Set() : new Set(visibleDates);
    });
  }, [dateGroupedRows, hiddenRowKeys]);

  const deleteSelectedVouchers = useCallback(async () => {
    const keys = selectedRowKeys || new Set();
    if (keys.size === 0) return;

    const invoices = Array.from(
      new Set(
        (flattenedRows || [])
          .filter((e) => e?.kind === 'detail' && e?.rowKey && keys.has(e.rowKey))
          .map((e) => String(e?.row?.billNumber || '').trim())
          .filter(Boolean)
      )
    );

    if (invoices.length === 0) return;

    const result = await Swal.fire({
      title: 'Delete selected vouchers?',
      text: `${invoices.length} voucher(s) will be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const outcomes = await Promise.allSettled(
      invoices.map((no) => axios.delete(`/api/purchase/${encodeURIComponent(no)}`, { headers }))
    );

    const failed = outcomes.filter((o) => o.status === 'rejected').length;
    const success = invoices.length - failed;

    if (failed === 0) {
      await Swal.fire({ title: 'Deleted', text: `${success} voucher(s) deleted.`, icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      await Swal.fire({ title: 'Completed', text: `${success} deleted, ${failed} failed.`, icon: failed === invoices.length ? 'error' : 'warning' });
    }

    setSelectedRowKeys(new Set());
    handleSearch();
  }, [flattenedRows, handleSearch, selectedRowKeys]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (voucherModalOpen) return;
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
        return;
      }
      if (k === 'd') {
        e.preventDefault();
        deleteSelectedVouchers();
        return;
      }
      if (k === '2') {
        const idx = focusedRowIndex;
        if (idx < 0 || idx >= flattenedRows.length) return;
        const entry = flattenedRows[idx];
        if (!entry || entry.kind !== 'detail') return;
        const invoiceNo = String(entry?.row?.billNumber || '').trim();
        if (!invoiceNo) return;
        e.preventDefault();
        const href = `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=duplicate`;
        openVoucherModal(href, invoiceNo ? `PURCHASE (DUP) - ${invoiceNo}` : 'PURCHASE (DUP)');
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        unhideAllRows();
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        toggleExpandCollapseAll();
        return;
      }
      if (k === 'h' || k === 'r') {
        e.preventDefault();
        hideFocusedRow();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedVouchers, flattenedRows, focusedRowIndex, hideFocusedRow, toggleExpandCollapseAll, unhideAllRows, voucherModalOpen]);

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
    if (e.key === ' ') {
      e.preventDefault();
      if (flattenedRows.length === 0) return;
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= flattenedRows.length) return;
      const entry = flattenedRows[idx];
      if (!entry || entry.kind !== 'detail') return;
      toggleSelectedRow(entry.rowKey);
      return;
    }
    if (e.key === 'Enter') {
      if (flattenedRows.length === 0) return;
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= flattenedRows.length) return;
      const entry = flattenedRows[idx];
      if (!entry || entry.kind !== 'group') return;
      e.preventDefault();
      toggleDateExpanded(entry.dateKey);
    }
  };

  const openVoucherModal = (href, title) => {
    if (!href) return;
    const sep = href.includes('?') ? '&' : '?';
    setVoucherModalHref(`${href}${sep}_ts=${Date.now()}`);
    setVoucherModalTitle(title || 'Purchase Voucher');
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
    <div className="report-container stock-ledger-container stock-ledger-report">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1 className="stock-ledger-title">Purchase Detail</h1>
        <div className="stock-ledger-header-actions">
          <button className="export-btn stock-ledger-export-btn" onClick={handleExport} disabled={loading}>
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group" style={{ minWidth: 170 }}>
          <label>From Date</label>
          <div className="date-picker-wrapper">
            <Calendar className="date-picker-icon" size={18} />
            <button type="button" className="date-picker-button" onClick={openStartDatePicker} disabled={loading}>
              {startDate ? toDdMmYyyy(startDate) : ''}
            </button>
            <input
              ref={startDateRef}
              type="date"
              className="date-picker-native"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="filter-group" style={{ minWidth: 170 }}>
          <label>To Date</label>
          <div className="date-picker-wrapper">
            <Calendar className="date-picker-icon" size={18} />
            <button type="button" className="date-picker-button" onClick={openEndDatePicker} disabled={loading}>
              {endDate ? toDdMmYyyy(endDate) : ''}
            </button>
            <input
              ref={endDateRef}
              type="date"
              className="date-picker-native"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>District</label>
          <div ref={districtSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={districtSearchInput}
              onChange={(e) => {
                const value = e.target.value;
                setDistrictSearchInput(value);
                setDistrict(value);
                const results = filterDistrictsForSearch(value);
                setDistrictSearchResults(results);
                setShowDistrictSuggestions(true);
                setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
              }}
              onKeyDown={(e) => {
                if (!showDistrictSuggestions || districtSearchResults.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusedDistrictSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, districtSearchResults.length - 1)));
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusedDistrictSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const idx = focusedDistrictSuggestionIndex;
                  const next = districtSearchResults[idx];
                  if (next) applyDistrict(next);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowDistrictSuggestions(false);
                  setFocusedDistrictSuggestionIndex(-1);
                }
              }}
              onFocus={() => {
                const results = filterDistrictsForSearch(districtSearchInput);
                setDistrictSearchResults(results);
                setShowDistrictSuggestions(true);
                setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search district..."
              disabled={loading}
              autoComplete="off"
            />
            {showDistrictSuggestions && districtSearchResults.length > 0 && (
              <div
                ref={districtSuggestionsRef}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
              >
                {districtSearchResults.map((d, idx) => (
                  <div
                    key={`${d}:${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => applyDistrict(d)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedDistrictSuggestionIndex ? '#eef2ff' : '#fff' }}
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
          <div ref={storeSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={storeSearchInput}
              onChange={(e) => {
                const value = e.target.value;
                setStoreSearchInput(value);
                if (!storeLocked) setStoreCode('');
                const results = filterStoresForSearch(value);
                setStoreSearchResults(results);
                setShowStoreSuggestions(true);
                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              onKeyDown={(e) => {
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
                  const st = storeSearchResults[idx];
                  if (st) applyStore(st);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowStoreSuggestions(false);
                  setFocusedStoreSuggestionIndex(-1);
                }
              }}
              onFocus={() => {
                const results = filterStoresForSearch(storeSearchInput);
                setStoreSearchResults(results);
                setShowStoreSuggestions(true);
                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search store code or name..."
              disabled={loading || storeLocked}
              autoComplete="off"
            />
            {showStoreSuggestions && storeSearchResults.length > 0 && !storeLocked && (
              <div
                ref={storeSuggestionsRef}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
              >
                {storeSearchResults.map((s, idx) => (
                  <div
                    key={`${String(s?.storeCode || idx)}:${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => applyStore(s)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedStoreSuggestionIndex ? '#eef2ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
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
          <label>Party</label>
          <div ref={partySearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={partySearchInput}
              onChange={(e) => {
                const value = e.target.value;
                setPartySearchInput(value);
                setPartyCode('');
                const results = filterPartiesForSearch(value);
                setPartySearchResults(results);
                setShowPartySuggestions(true);
                setFocusedPartySuggestionIndex(results.length ? 0 : -1);
              }}
              onKeyDown={(e) => {
                if (!showPartySuggestions || partySearchResults.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusedPartySuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, partySearchResults.length - 1)));
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusedPartySuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const idx = focusedPartySuggestionIndex;
                  const p = partySearchResults[idx];
                  if (p) applyParty(p);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowPartySuggestions(false);
                  setFocusedPartySuggestionIndex(-1);
                }
              }}
              onFocus={() => {
                const results = filterPartiesForSearch(partySearchInput);
                setPartySearchResults(results);
                setShowPartySuggestions(true);
                setFocusedPartySuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search party..."
              disabled={loading}
              autoComplete="off"
            />
            {showPartySuggestions && partySearchResults.length > 0 && (
              <div
                ref={partySuggestionsRef}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
              >
                {partySearchResults.map((p, idx) => (
                  <div
                    key={`${String(p?.code || idx)}:${idx}`}
                    data-suggestion-index={idx}
                    onMouseDown={() => applyParty(p)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedPartySuggestionIndex ? '#eef2ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(p?.name || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                      {String(p?.code || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        <button type="button" className="search-btn" onClick={hideFocusedRow} disabled={flattenedRows.length === 0}>
          Hide Row
        </button>
        <button
          type="button"
          className="search-btn"
          onClick={unhideAllRows}
          disabled={hiddenRowKeys.size === 0 && selectedColumns.size === (selectableColumnDefs || []).length}
        >
          Unhide All
        </button>
      </div>

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
              {visibleColumnKeys.map((k) => (
                <th key={k} style={k === 'quantity' || k === 'amount' ? { textAlign: 'right' } : undefined}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {(k !== 'date' && k !== 'billNumber' && k !== 'quantity' && k !== 'amount') && (
                      <input
                        type="checkbox"
                        checked={selectedColumns.has(k)}
                        onChange={() => toggleSelectedColumn(k)}
                        disabled={loading}
                      />
                    )}
                    <span>{columnLabelByKey[k] || k}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flattenedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnKeys.length} style={{ textAlign: 'center', padding: '12px' }}>
                  {loading ? 'Loading report data...' : 'No data found for selected criteria'}
                </td>
              </tr>
            ) : (
              flattenedRows.map((entry, idx) => {
                if (entry.kind === 'group') {
                  const expanded = expandedDateKeys.has(entry.dateKey);
                  const t = entry.totals || {};
                  return (
                    <tr
                      key={entry.key || `grp:${entry.dateKey}`}
                      data-date-group={entry.dateKey}
                      className={[idx === focusedRowIndex ? 'row-focused' : ''].filter(Boolean).join(' ')}
                      style={{ fontWeight: 700, background: '#f8fafc', cursor: 'pointer' }}
                      onMouseDown={() => setFocusedRowIndex(idx)}
                      onClick={() => toggleDateExpanded(entry.dateKey)}
                    >
                      {visibleColumnKeys.map((k) => {
                        if (k === 'date') return <td key={k}>{entry.dateKey}</td>;
                        if (k === 'billNumber') return <td key={k}>{expanded ? 'Totals (expanded)' : 'Totals'}</td>;
                        if (k === 'quantity') return <td key={k} style={{ textAlign: 'right' }}>{formatQty(t.quantity)}</td>;
                        if (k === 'amount') return <td key={k} style={{ textAlign: 'right' }}>{formatAmount(t.amount)}</td>;
                        return <td key={k}></td>;
                      })}
                    </tr>
                  );
                }

                if (entry.kind === 'invoice') {
                  const t = entry.totals || {};
                  const focused = idx === focusedRowIndex;
                  return (
                    <tr
                      key={entry.key || `inv:${entry.dateKey}:${entry.billNumber}`}
                      data-invoice-group={`${entry.dateKey}|${entry.billNumber}`}
                      className={[focused ? 'row-focused' : ''].filter(Boolean).join(' ')}
                      style={{ fontWeight: 700, background: '#f1f5f9' }}
                      onMouseDown={() => setFocusedRowIndex(idx)}
                    >
                      {visibleColumnKeys.map((k) => {
                        if (k === 'date') return <td key={k}>{String(entry.dateKey || '')}</td>;
                        if (k === 'billNumber') {
                          return (
                            <td key={k}>
                              {entry.billNumber ? (
                                <button
                                  type="button"
                                  className="qty-link"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const invoiceNo = String(entry.billNumber || '').trim();
                                    const href = `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                                    openVoucherModal(href, invoiceNo ? `PURCHASE - ${invoiceNo}` : 'PURCHASE');
                                  }}
                                >
                                  {entry.billNumber}
                                </button>
                              ) : ('')}
                            </td>
                          );
                        }
                        if (k === 'quantity') return <td key={k} style={{ textAlign: 'right' }}>{formatQty(t.quantity)}</td>;
                        if (k === 'amount') return <td key={k} style={{ textAlign: 'right' }}>{formatAmount(t.amount)}</td>;
                        if (invoiceLabelColumnKey && k === invoiceLabelColumnKey) return <td key={k}>Invoice Total</td>;
                        return <td key={k}>{String(entry[k] || '')}</td>;
                      })}
                    </tr>
                  );
                }

                const row = entry.row || {};
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
                    {visibleColumnKeys.map((k) => {
                      if (k === 'billNumber') {
                        return (
                          <td key={k}>
                            {row.billNumber ? (
                              <button
                                type="button"
                                className="qty-link"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const invoiceNo = String(row.billNumber || '').trim();
                                  const href = `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                                  openVoucherModal(href, invoiceNo ? `PURCHASE - ${invoiceNo}` : 'PURCHASE');
                                }}
                              >
                                {row.billNumber}
                              </button>
                            ) : ('')}
                          </td>
                        );
                      }
                      if (k === 'quantity') return <td key={k} style={{ textAlign: 'right' }}>{formatQty(row.quantity)}</td>;
                      if (k === 'amount') return <td key={k} style={{ textAlign: 'right' }}>{formatAmount(row.amount)}</td>;
                      return <td key={k}>{String(row[k] || '')}</td>;
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {visibleDetails.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={Math.max(1, visibleColumnKeys.length - 2)} style={{ fontWeight: 700 }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(grandTotals.quantity)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.amount)}</td>
              </tr>
            </tfoot>
          )}
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
                    if (!s) return;
                    applyStore(s);
                    setShowStoreModal(false);
                    setTimeout(() => searchActionRef.current?.(), 0);
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
                          applyStore(s);
                          setShowStoreModal(false);
                          setTimeout(() => searchActionRef.current?.(), 0);
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
              <iframe title="Purchase Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseDetailReport = () => {
  const location = useLocation();
  const view = useMemo(() => {
    const v = new URLSearchParams(location.search || '').get('view');
    return String(v || '').trim() || 'purchase-detail';
  }, [location.search]);

  if (view === 'item-party') return <ItemPartyPurchaseReport />;
  return <PurchaseDetailPivotReport />;
};

export default PurchaseDetailReport;
