import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Download, Filter, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChangePeriodModal from './ChangePeriodModal';
import DateInputButton from './DateInputButton';
import { todayIsoDate } from './dateUtils';
import './InventoryReplenishmentReport.css';

const PAGE_SIZE_OPTIONS = [50, 100, 200];

const formatQty = (value) => {
  const numeric = Number(value || 0);
  return numeric === 0 ? '' : numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatAmount = (value) => {
  const numeric = Number(value || 0);
  return numeric === 0 ? '' : numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatCount = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const today = todayIsoDate();
const firstDayOfMonth = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
})();

const InventoryReplenishmentReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backParam = searchParams.get('back') || '/ho-reports';
  const lockedStoreCode = searchParams.get('lockedStore') === 'true' ? (searchParams.get('storeCode') || '') : '';

  const tokenConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    }
  }), []);

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [district, setDistrict] = useState('');
  const [storeCode, setStoreCode] = useState(lockedStoreCode);
  const [sizeCode, setSizeCode] = useState('');
  const [forecastDays, setForecastDays] = useState(7);
  const [stores, setStores] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedItemMap, setSelectedItemMap] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalSaleQty: 0,
    totalSaleAmount: 0,
    totalClosingStock: 0,
    totalForecastQty: 0,
    totalSuggestedOrderQty: 0,
    totalShortItems: 0,
    totalExcessItems: 0
  });
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [sortBy, setSortBy] = useState('shortExcessQty');
  const [sortDir, setSortDir] = useState('DESC');
  const [columnFilters, setColumnFilters] = useState({});
  const [draftFromDate, setDraftFromDate] = useState(firstDayOfMonth);
  const [draftToDate, setDraftToDate] = useState(today);
  const [draftDistrict, setDraftDistrict] = useState('');
  const [draftStoreCode, setDraftStoreCode] = useState(lockedStoreCode);
  const [draftSizeCode, setDraftSizeCode] = useState('');
  const [draftForecastDays, setDraftForecastDays] = useState(7);
  const [draftSelectedItems, setDraftSelectedItems] = useState([]);
  const [draftSelectedItemMap, setDraftSelectedItemMap] = useState({});
  const itemSearchDebounceRef = useRef(null);
  const searchActionRef = useRef(null);

  const districtOptions = useMemo(() => {
    return Array.from(new Set(
      (stores || [])
        .map(store => String(store?.district || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  const filteredStores = useMemo(() => {
    const allStores = Array.isArray(stores) ? stores : [];
    return allStores.filter(store => {
      if (String(store?.storeType || '').trim().toUpperCase() !== 'STORE') return false;
      if (!district) return true;
      return String(store?.district || '').trim() === district;
    });
  }, [district, stores]);

  const draftFilteredStores = useMemo(() => {
    const allStores = Array.isArray(stores) ? stores : [];
    return allStores.filter(store => {
      if (String(store?.storeType || '').trim().toUpperCase() !== 'STORE') return false;
      if (!draftDistrict) return true;
      return String(store?.district || '').trim() === draftDistrict;
    });
  }, [draftDistrict, stores]);

  const displayedRows = useMemo(() => {
    const filters = columnFilters || {};
    return (rows || []).filter((row) => {
      return Object.entries(filters).every(([key, rawFilter]) => {
        const query = String(rawFilter || '').trim().toLowerCase();
        if (!query) return true;
        const value = row?.[key];
        return String(value == null ? '' : value).toLowerCase().includes(query);
      });
    });
  }, [columnFilters, rows]);

  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    return Math.max(1, Math.ceil((totalRows || 0) / pageSize));
  }, [pageSize, totalRows]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [storesRes, sizesRes] = await Promise.all([
          axios.get('/api/stores', tokenConfig),
          axios.get('/api/sizes', tokenConfig)
        ]);

        const storeList = Array.isArray(storesRes.data?.stores) ? storesRes.data.stores : [];
        const sizeList = Array.isArray(sizesRes.data?.sizes) ? sizesRes.data.sizes : [];

        setStores(storeList);
        setSizes(sizeList);

        if (lockedStoreCode) {
          const matchedStore = storeList.find(store => String(store?.storeCode || '').trim() === lockedStoreCode);
          if (matchedStore) {
            setStoreCode(lockedStoreCode);
            setDistrict(String(matchedStore?.district || '').trim());
          }
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to load report filters'
        });
      }
    };

    loadOptions();
  }, [lockedStoreCode, tokenConfig]);

  useEffect(() => {
    if (!storeCode) return;
    const exists = filteredStores.some(store => String(store?.storeCode || '').trim() === String(storeCode || '').trim());
    if (!exists && !lockedStoreCode) {
      setStoreCode('');
    }
  }, [filteredStores, lockedStoreCode, storeCode]);

  useEffect(() => {
    if (!draftStoreCode) return;
    const exists = draftFilteredStores.some(store => String(store?.storeCode || '').trim() === String(draftStoreCode || '').trim());
    if (!exists && !lockedStoreCode) {
      setDraftStoreCode('');
    }
  }, [draftFilteredStores, draftStoreCode, lockedStoreCode]);

  useEffect(() => {
    window.clearTimeout(itemSearchDebounceRef.current);
    if (!showFiltersModal) {
      setItemResults([]);
      setItemLoading(false);
      return undefined;
    }
    if (String(itemSearch || '').trim().length < 2) {
      setItemResults([]);
      setItemLoading(false);
      return undefined;
    }

    itemSearchDebounceRef.current = window.setTimeout(async () => {
      try {
        setItemLoading(true);
        const response = await axios.get('/api/items/search', {
          ...tokenConfig,
          params: { query: itemSearch.trim() }
        });
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        setItemResults(items.slice(0, 100));
      } catch {
        setItemResults([]);
      } finally {
        setItemLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(itemSearchDebounceRef.current);
    };
  }, [itemSearch, showFiltersModal, tokenConfig]);

  const buildParams = useCallback((targetPage, targetSize) => ({
    fromDate,
    toDate,
    district: district || undefined,
    storeCode: storeCode || undefined,
    sizeCode: sizeCode || undefined,
    itemCodes: selectedItems.length ? selectedItems.join(',') : undefined,
    forecastDays,
    page: targetPage,
    size: targetSize,
    sortBy,
    sortDir
  }), [district, forecastDays, fromDate, selectedItems, sizeCode, sortBy, sortDir, storeCode, toDate]);

  const fetchReport = useCallback(async (targetPage, targetSize) => {
    if (!fromDate || !toDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please select From Date and To Date'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/reports/inventory-replenishment', {
        ...tokenConfig,
        params: buildParams(targetPage, targetSize)
      });

      const payload = response.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary(payload.summary || {});
      setTotalRows(Number(payload.totalRows || 0));
      setPage(Number(payload.page || 0));
      setPageSize(Number(payload.size || targetSize));
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to load inventory replenishment report'
      });
    } finally {
      setLoading(false);
    }
  }, [buildParams, fromDate, toDate, tokenConfig]);
  searchActionRef.current = fetchReport;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (showChangePeriodModal) return;
        setShowChangePeriodModal(true);
        return;
      }
      if (!e.altKey || String(e.key || '').toLowerCase() !== 's') return;
      const tag = String(document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      searchActionRef.current?.(0, pageSize);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pageSize, showChangePeriodModal]);

  const handleToggleItem = (item, setItems, setItemMap) => {
    const code = String(item?.itemCode || '').trim();
    if (!code) return;
    const label = String(item?.itemName || code).trim();
    setItems(prev => prev.includes(code) ? prev.filter(value => value !== code) : [...prev, code]);
    setItemMap(prev => ({
      ...prev,
      [code]: label
    }));
  };

  const handleRemoveItem = (itemCode, setItems) => {
    setItems(prev => prev.filter(value => value !== itemCode));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await axios.get('/api/reports/inventory-replenishment/export', {
        ...tokenConfig,
        params: buildParams(page, pageSize),
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'InventoryReplenishmentReport.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to export report'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === key) {
        setSortDir(prevDir => (prevDir === 'ASC' ? 'DESC' : 'ASC'));
        return prevSortBy;
      }
      setSortDir(key === 'itemName' ? 'ASC' : 'DESC');
      return key;
    });
    setPage(0);
  };

  useEffect(() => {
    if (!fromDate || !toDate || stores.length === 0) return;
    fetchReport(page, pageSize);
  }, [fetchReport, page, pageSize, sortBy, sortDir, stores.length, fromDate, toDate]);

  const openFiltersModal = () => {
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setDraftDistrict(district);
    setDraftStoreCode(storeCode);
    setDraftSizeCode(sizeCode);
    setDraftForecastDays(forecastDays);
    setDraftSelectedItems(selectedItems);
    setDraftSelectedItemMap(selectedItemMap);
    setItemSearch('');
    setItemResults([]);
    setShowFiltersModal(true);
  };

  const closeFiltersModal = () => {
    setShowFiltersModal(false);
    setItemSearch('');
    setItemResults([]);
    setItemLoading(false);
  };

  const applyFilters = async () => {
    if (!draftFromDate || !draftToDate) {
      await Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please select From Date and To Date'
      });
      return;
    }
    if (draftFromDate > draftToDate) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Date Range',
        text: 'From Date cannot be greater than To Date'
      });
      return;
    }

    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setDistrict(draftDistrict);
    setStoreCode(draftStoreCode);
    setSizeCode(draftSizeCode);
    setForecastDays(draftForecastDays > 0 ? draftForecastDays : 7);
    setSelectedItems(draftSelectedItems);
    setSelectedItemMap(draftSelectedItemMap);
    setPage(0);
    closeFiltersModal();
  };

  const summaryCards = [
    { label: 'Total Sale Qty', value: formatQty(summary.totalSaleQty) || '0.00' },
    { label: 'Total Sale Amount', value: formatAmount(summary.totalSaleAmount) || '0.00' },
    { label: 'Total Closing Stock', value: formatQty(summary.totalClosingStock) || '0.00' },
    { label: 'Total Forecast Qty', value: formatQty(summary.totalForecastQty) || '0.00' },
    { label: 'Total Suggested Order Qty', value: formatQty(summary.totalSuggestedOrderQty) || '0.00' },
    { label: 'Total Short Items', value: formatCount(summary.totalShortItems) },
    { label: 'Total Excess Items', value: formatCount(summary.totalExcessItems) }
  ];

  const selectedItemLabels = selectedItems.map(code => ({
    code,
    label: selectedItemMap[code] || code
  }));

  const draftSelectedItemLabels = draftSelectedItems.map(code => ({
    code,
    label: draftSelectedItemMap[code] || code
  }));

  const activeFilterBadges = [
    `From: ${fromDate}`,
    `To: ${toDate}`,
    `District: ${district || 'All'}`,
    `Store: ${storeCode || 'All'}`,
    `Size: ${sizeCode || 'All'}`,
    `Forecast Days: ${formatCount(forecastDays)}`,
    `Items: ${formatCount(selectedItems.length)}`
  ];

  const columns = [
    { key: 'district', label: 'District', sortable: true },
    { key: 'storeCode', label: 'Store Code', sortable: true },
    { key: 'storeName', label: 'Store Name', sortable: true },
    { key: 'itemName', label: 'Item Name', sortable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'saleQty', label: 'Sale Qty', sortable: true, numeric: true, formatter: formatQty },
    { key: 'saleAmount', label: 'Sale Amount', sortable: true, numeric: true, formatter: formatAmount },
    { key: 'noOfDays', label: 'No Of Days', numeric: true, formatter: formatCount },
    { key: 'averageDailySale', label: 'Average Daily Sale', sortable: true, numeric: true, formatter: formatQty },
    { key: 'forecastDays', label: 'Forecast Days', numeric: true, formatter: formatCount },
    { key: 'forecastQuantity', label: 'Forecast Quantity', sortable: true, numeric: true, formatter: formatQty },
    { key: 'closingStock', label: 'Closing Stock', sortable: true, numeric: true, formatter: formatQty },
    { key: 'shortExcessQty', label: 'Short / Excess Qty', sortable: true, numeric: true, formatter: formatQty },
    { key: 'stockCoverageDays', label: 'Stock Coverage Days', sortable: true, numeric: true, formatter: formatQty },
    { key: 'suggestedOrderQty', label: 'Suggested Order Qty', sortable: true, numeric: true, formatter: formatQty }
  ];

  return (
    <div className="inventory-replenishment-report">
      <div className="inventory-replenishment-header">
        <div>
          <h1>Inventory Replenishment Report</h1>
          <p>Forecast demand, compare with closing stock, and identify shortages or excess inventory.</p>
        </div>
        <div className="inventory-replenishment-actions">
          <button type="button" className="inventory-replenishment-back-btn" onClick={() => navigate(backParam)}>
            Back
          </button>
          <button type="button" className="inventory-replenishment-filter-btn" onClick={openFiltersModal}>
            <Filter size={16} />
            Filter
          </button>
          <button type="button" className="inventory-replenishment-search-btn" onClick={() => fetchReport(0, pageSize)} disabled={loading}>
            <Search size={16} />
            Search
          </button>
          <button type="button" className="inventory-replenishment-export-btn" onClick={handleExport} disabled={loading || exporting}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="inventory-replenishment-active-filters">
        {activeFilterBadges.map((badge) => (
          <span key={badge} className="inventory-replenishment-active-filter-chip">{badge}</span>
        ))}
      </div>

      <div className="inventory-replenishment-summary-grid">
        {summaryCards.map(card => (
          <div key={card.label} className="inventory-replenishment-summary-card">
            <div className="inventory-replenishment-summary-label">{card.label}</div>
            <div className="inventory-replenishment-summary-value">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="inventory-replenishment-table-card">
        <div className="inventory-replenishment-table-toolbar">
          <div className="inventory-replenishment-table-title">
            Results ({displayedRows.length} shown, {formatCount(totalRows)} total)
          </div>
          <div className="inventory-replenishment-pagination">
            <select value={pageSize} onChange={(e) => { const next = Number(e.target.value); setPage(0); setPageSize(next); }}>
              {PAGE_SIZE_OPTIONS.map(option => (
                <option key={option} value={option}>{option} / page</option>
              ))}
            </select>
            <button type="button" onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page <= 0 || loading}>
              <ChevronLeft size={14} />
            </button>
            <span>Page {page + 1} / {totalPages}</span>
            <button type="button" onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))} disabled={page + 1 >= totalPages || loading}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="inventory-replenishment-table-wrap">
          <table className="inventory-replenishment-table">
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className={column.numeric ? 'numeric' : ''}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <div className={`inventory-replenishment-th ${column.sortable ? 'sortable' : ''}`}>
                      <span>{column.label}</span>
                      {column.sortable && sortBy === column.key && (
                        <span>{sortDir === 'ASC' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
              <tr>
                {columns.map(column => (
                  <th key={`${column.key}-filter`} className={column.numeric ? 'numeric' : ''}>
                    <input
                      type="text"
                      value={columnFilters[column.key] || ''}
                      onChange={(e) => setColumnFilters(prev => ({ ...prev, [column.key]: e.target.value }))}
                      placeholder="Filter"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="inventory-replenishment-empty">Loading report...</td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="inventory-replenishment-empty">No rows found for the selected filters.</td>
                </tr>
              ) : displayedRows.map((row, index) => (
                <tr key={`${row.storeCode}-${row.itemCode}-${row.sizeCode}-${index}`}>
                  {columns.map(column => {
                    const rawValue = row?.[column.key];
                    const displayValue = column.formatter ? column.formatter(rawValue) : (rawValue ?? '');
                    let className = column.numeric ? 'numeric' : '';
                    if (column.key === 'shortExcessQty') {
                      const numeric = Number(rawValue || 0);
                      className = `${className} ${numeric < 0 ? 'short' : numeric > 0 ? 'excess' : ''}`.trim();
                    }
                    if (column.key === 'stockCoverageDays') {
                      const numeric = Number(rawValue || 0);
                      className = `${className} ${numeric > 0 && numeric < 3 ? 'coverage-low' : numeric >= 3 && numeric <= 7 ? 'coverage-medium' : numeric > 7 ? 'coverage-high' : ''}`.trim();
                    }
                    return (
                      <td key={`${column.key}-${index}`} className={className} title={String(rawValue ?? '')}>
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ChangePeriodModal
        open={showChangePeriodModal}
        startDate={fromDate}
        endDate={toDate}
        onClose={() => setShowChangePeriodModal(false)}
        onApply={({ startDate: sd, endDate: ed }) => {
          setFromDate(sd);
          setToDate(ed);
          setShowChangePeriodModal(false);
          setPage(0);
          setTimeout(() => searchActionRef.current?.(0, pageSize), 0);
        }}
      />
      {showFiltersModal && (
        <div className="inventory-replenishment-modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            closeFiltersModal();
          }
        }}>
          <div className="inventory-replenishment-modal">
            <div className="inventory-replenishment-modal-header">
              <div>
                <h2>Filters</h2>
                <p>Select report filters and apply to refresh the report.</p>
              </div>
              <button type="button" className="inventory-replenishment-modal-close" onClick={closeFiltersModal}>
                <X size={18} />
              </button>
            </div>
            <div className="inventory-replenishment-modal-body">
              <div className="inventory-replenishment-filter-grid">
                <div className="inventory-replenishment-filter-group">
                  <label>From Date *</label>
                  <DateInputButton
                    value={draftFromDate}
                    onChange={setDraftFromDate}
                    buttonClassName="inventory-replenishment-date-btn"
                    wrapperClassName="inventory-replenishment-date-wrap"
                    hiddenInputClassName="inventory-replenishment-date-native"
                  />
                </div>
                <div className="inventory-replenishment-filter-group">
                  <label>To Date *</label>
                  <DateInputButton
                    value={draftToDate}
                    onChange={setDraftToDate}
                    buttonClassName="inventory-replenishment-date-btn"
                    wrapperClassName="inventory-replenishment-date-wrap"
                    hiddenInputClassName="inventory-replenishment-date-native"
                  />
                </div>
                <div className="inventory-replenishment-filter-group">
                  <label>District</label>
                  <select
                    value={draftDistrict}
                    onChange={(e) => {
                      setDraftDistrict(e.target.value);
                      if (!lockedStoreCode) {
                        setDraftStoreCode('');
                      }
                    }}
                    disabled={!!lockedStoreCode}
                  >
                    <option value="">All Districts</option>
                    {districtOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="inventory-replenishment-filter-group">
                  <label>Store</label>
                  <select value={draftStoreCode} onChange={(e) => setDraftStoreCode(e.target.value)} disabled={!!lockedStoreCode}>
                    <option value="">All Stores</option>
                    {draftFilteredStores.map(store => (
                      <option key={store.storeCode} value={store.storeCode}>
                        {store.storeName} ({store.storeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inventory-replenishment-filter-group">
                  <label>Size</label>
                  <select value={draftSizeCode} onChange={(e) => setDraftSizeCode(e.target.value)}>
                    <option value="">All Sizes</option>
                    {(sizes || []).map(size => (
                      <option key={size.code} value={size.code}>{size.name || size.code}</option>
                    ))}
                  </select>
                </div>
                <div className="inventory-replenishment-filter-group">
                  <label>Forecast Days</label>
                  <input
                    type="number"
                    min="1"
                    value={draftForecastDays}
                    onChange={(e) => {
                      const next = Number(e.target.value || 0);
                      setDraftForecastDays(next > 0 ? next : 7);
                    }}
                  />
                </div>
                <div className="inventory-replenishment-filter-group inventory-replenishment-item-group">
                  <label>Item (Multi Select)</label>
                  <div className="inventory-replenishment-item-picker">
                    <input
                      type="text"
                      placeholder="Type at least 2 letters to search items"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                    <div className="inventory-replenishment-item-meta">
                      <span>{draftSelectedItems.length} selected</span>
                      {draftSelectedItems.length > 0 && (
                        <button type="button" onClick={() => setDraftSelectedItems([])}>Clear All</button>
                      )}
                    </div>
                    <div className="inventory-replenishment-item-results">
                      {itemLoading ? (
                        <div className="inventory-replenishment-item-empty">Searching items...</div>
                      ) : itemResults.length > 0 ? (
                        itemResults.map(item => {
                          const code = String(item?.itemCode || '').trim();
                          const label = String(item?.itemName || code).trim();
                          const checked = draftSelectedItems.includes(code);
                          return (
                            <label key={code} className="inventory-replenishment-item-option" title={`${label} (${code})`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleItem(item, setDraftSelectedItems, setDraftSelectedItemMap)}
                              />
                              <span>{label} ({code})</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="inventory-replenishment-item-empty">Search item name or code to add multiple items.</div>
                      )}
                    </div>
                    {draftSelectedItemLabels.length > 0 && (
                      <div className="inventory-replenishment-selected-items">
                        {draftSelectedItemLabels.map(item => (
                          <button
                            key={item.code}
                            type="button"
                            className="inventory-replenishment-item-chip"
                            onClick={() => handleRemoveItem(item.code, setDraftSelectedItems)}
                            title={`${item.label} (${item.code})`}
                          >
                            <span>{item.label} ({item.code})</span>
                            <X size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="inventory-replenishment-modal-footer">
              <button type="button" className="inventory-replenishment-modal-secondary" onClick={closeFiltersModal}>
                Cancel
              </button>
              <button type="button" className="inventory-replenishment-modal-primary" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryReplenishmentReport;
