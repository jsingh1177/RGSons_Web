import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download } from 'lucide-react';
import './ClosingStockReport.css';

const PurchaseDetailReport = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [partySearchInput, setPartySearchInput] = useState('');

  const [categories, setCategories] = useState([]);
  const [parties, setParties] = useState([]);
  const [partySearchResults, setPartySearchResults] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const partyWrapRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());

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
    const fetchLookups = async () => {
      try {
        const [catRes, partyRes] = await Promise.all([
          axios.get('/api/categories'),
          axios.get('/api/parties', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
          })
        ]);

        if (catRes.data?.success) {
          setCategories(catRes.data.categories || []);
        } else {
          setCategories([]);
        }

        if (partyRes.data?.success) {
          const all = partyRes.data.parties || [];
          const suppliers = all.filter(p => {
            const t = String(p?.type || '').toLowerCase();
            return !t || t === 'supplier';
          });
          setParties(suppliers);
        } else if (Array.isArray(partyRes.data)) {
          setParties(partyRes.data);
        } else {
          setParties([]);
        }
      } catch {
        setCategories([]);
        setParties([]);
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
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const selectableRowKeys = useMemo(() => {
    return (rows || []).map((_, idx) => `ip:${idx}`);
  }, [rows]);

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
        partyCode: partyCode || undefined
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
        partyCode: partyCode || undefined
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
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {partySearchResults.map((p, idx) => (
                  <div
                    key={`${String(p?.code || idx)}-${idx}`}
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
              <th>Item Name</th>
              <th>Party Name</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  No data available for the selected period
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const rowKey = selectableRowKeys[idx];
                const isFocused = idx === focusedRowIndex;
                const isSelected = selectedRowKeys.has(rowKey);
                return (
                  <tr
                    key={rowKey}
                    data-row-key={rowKey}
                    className={`${isFocused ? 'focused-row' : ''} ${isSelected ? 'selected-row' : ''}`}
                    onClick={() => {
                      setFocusedRowIndex(idx);
                      toggleSelectedRow(rowKey);
                    }}
                  >
                    <td>{r?.itemName || ''}</td>
                    <td>{r?.partyName || ''}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r?.qty || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r?.amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 'bold' }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{totals.qty.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{totals.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default PurchaseDetailReport;
