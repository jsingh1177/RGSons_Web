import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import Swal from 'sweetalert2';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const STOCK_LEDGER_STATE_KEY = 'stockLedgerReportState:v1';

const loadStockLedgerState = () => {
  try {
    const raw = sessionStorage.getItem(STOCK_LEDGER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveStockLedgerState = (state) => {
  try {
    sessionStorage.setItem(STOCK_LEDGER_STATE_KEY, JSON.stringify(state));
  } catch {}
};

const StockLedgerReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const storeLocked = searchParams.get('lockedStore') === 'true';
  const lockedStoreCode = searchParams.get('storeCode') || '';
  const restoredStateRef = useRef(null);
  if (restoredStateRef.current === null) {
    restoredStateRef.current = loadStockLedgerState();
  }
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const tableContainerRef = useRef(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [storeCode, setStoreCode] = useState(() => restoredStateRef.current?.storeCode || '');
  const [storeSearchInput, setStoreSearchInput] = useState(() => restoredStateRef.current?.storeSearchInput || '');
  const [categoryCode, setCategoryCode] = useState(() => restoredStateRef.current?.categoryCode || '');
  const [selectedItemCode, setSelectedItemCode] = useState(() => restoredStateRef.current?.selectedItemCode || '');
  const [selectedSizeCode, setSelectedSizeCode] = useState(() => restoredStateRef.current?.selectedSizeCode || '');
  const [viewType, setViewType] = useState(() => restoredStateRef.current?.viewType || 'QtyAmount');
  const [asOnDate, setAsOnDate] = useState(() => restoredStateRef.current?.asOnDate || new Date().toISOString().split('T')[0]);
  const asOnDateRef = useRef(null);
  const [fromDate, setFromDate] = useState(() => restoredStateRef.current?.fromDate || '');
  const fromDateRef = useRef(null);
  const fromDateTouchedRef = useRef(false);
  const initializedFromQueryRef = useRef(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');
  const hiddenStorageKey = useMemo(() => {
    const sc = String(storeCode || '').trim();
    const it = String(selectedItemCode || '').trim();
    const sz = String(selectedSizeCode || '').trim();
    const from = String(fromDate || '').trim();
    const to = String(asOnDate || '').trim();
    return `RG_hiddenRows_stockLedger:${sc}:${it}:${sz}:${from}:${to}`;
  }, [storeCode, selectedItemCode, selectedSizeCode, fromDate, asOnDate]);
  const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());
  const [expandedDateKeys, setExpandedDateKeys] = useState(() => new Set());

  const [storeSearchResults, setStoreSearchResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
  const storeSearchWrapRef = useRef(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const storeModalSearchRef = useRef(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);

  const [itemSearchInput, setItemSearchInput] = useState(() => restoredStateRef.current?.itemSearchInput || '');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [focusedItemSuggestionIndex, setFocusedItemSuggestionIndex] = useState(-1);
  const itemSearchWrapRef = useRef(null);

  const storeModalStores = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    if (!q) return all.slice(0, 100);
    return all.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 100);
  }, [storeModalQuery, stores]);

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

  const toDdMmYyyy = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  const applyStoreCode = (next) => {
    setStoreCode(next);
    setCategoryCode('');
    setSelectedItemCode('');
    setSelectedSizeCode('');
    setViewType('QtyAmount');
    setItemSearchInput('');
    setItemSearchResults([]);
    setShowItemSuggestions(false);
    setFocusedItemSuggestionIndex(-1);
    setAsOnDate(new Date().toISOString().split('T')[0]);
    setFromDate('');
    fromDateTouchedRef.current = false;
    setRows([]);
    setError('');
  };

  const resetForStoreChange = () => {
    setCategoryCode('');
    setSelectedItemCode('');
    setSelectedSizeCode('');
    setViewType('QtyAmount');
    setItemSearchInput('');
    setItemSearchResults([]);
    setShowItemSuggestions(false);
    setFocusedItemSuggestionIndex(-1);
    setAsOnDate(new Date().toISOString().split('T')[0]);
    setFromDate('');
    fromDateTouchedRef.current = false;
    setRows([]);
    setError('');
  };

  const openFromDatePicker = () => {
    const el = fromDateRef.current;
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

  const openAsOnDatePicker = () => {
    const el = asOnDateRef.current;
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

  const selectedStockItem = useMemo(() => {
    if (!selectedItemCode) return null;
    const found = stockItems.find(s => s.itemCode === selectedItemCode);
    return found ? { ...found } : { itemCode: selectedItemCode, itemName: '' };
  }, [selectedItemCode, stockItems]);

  useEffect(() => {
    if (!storeCode) {
      setStoreSearchInput((prev) => (prev !== '' ? '' : prev));
      return;
    }
    const store = stores.find(s => s.storeCode === storeCode);
    if (store) {
      const display = `${store.storeName} (${store.storeCode})`;
      setStoreSearchInput((prev) => (prev !== display ? display : prev));
    }
  }, [storeCode, stores]);

  useEffect(() => {
    if (!selectedItemCode) {
      setItemSearchInput((prev) => (prev !== '' ? '' : prev));
      return;
    }
    const found = stockItems.find(s => s.itemCode === selectedItemCode);
    if (found?.itemName) {
      setItemSearchInput((prev) => (prev !== found.itemName ? found.itemName : prev));
    }
  }, [selectedItemCode, stockItems]);

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
    if (initializedFromQueryRef.current) return;
    const params = new URLSearchParams(location.search || '');
    const qStoreCode = params.get('storeCode') || '';
    const qCategoryCode = params.get('categoryCode') || '';
    const qItemCode = params.get('itemCode') || '';
    const qSizeCode = params.get('sizeCode') || '';
    const qAsOnDate = params.get('asOnDate') || '';

    if (qStoreCode) setStoreCode(qStoreCode);
    if (qCategoryCode) setCategoryCode(qCategoryCode);
    if (qItemCode) setSelectedItemCode(qItemCode);
    if (qSizeCode) setSelectedSizeCode(qSizeCode);
    if (qAsOnDate) setAsOnDate(qAsOnDate);

    initializedFromQueryRef.current = true;
  }, [location.search]);

  useEffect(() => {
    if (!storeLocked || !lockedStoreCode) return;
    if (storeCode !== lockedStoreCode) setStoreCode(lockedStoreCode);
  }, [storeLocked, lockedStoreCode, storeCode]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [storesRes, categoriesRes, sizesRes] = await Promise.all([
          axios.get('/api/stores'),
          axios.get('/api/categories'),
          axios.get('/api/sizes/active')
        ]);

        if (storesRes.data?.success) {
          const allStores = storesRes.data.stores || [];
          if (storeLocked && storeCode) {
            setStores(allStores.filter(s => s.storeCode === storeCode));
          } else {
            setStores(allStores);
          }
        }
        if (categoriesRes.data?.success) {
          setCategories(categoriesRes.data.categories || []);
        }
        if (Array.isArray(sizesRes.data)) {
          setSizes(sizesRes.data || []);
        } else if (sizesRes.data?.success) {
          setSizes(sizesRes.data.sizes || []);
        }
      } catch (e) {
        setError('Failed to load dropdowns');
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setStockItems([]);
      setRows([]);
      setError('');
      setItemSearchResults([]);
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);

      try {
        const params = {};
        if (storeCode) params.storeCode = storeCode;
        if (categoryCode) params.categoryCode = categoryCode;
        const res = await axios.get('/api/reports/stock-ledger/items', {
          params
        });
        setStockItems(res.data || []);
      } catch (e) {
        setError('Failed to load stock items');
      }
    };
    fetchItems();
  }, [storeCode, categoryCode]);

  useEffect(() => {
    if (!asOnDate) return;
    if (fromDate && fromDate > asOnDate) {
      setFromDate(asOnDate);
      return;
    }
  }, [fromDate, asOnDate]);

  useEffect(() => {
    saveStockLedgerState({
      storeCode,
      storeSearchInput,
      categoryCode,
      selectedItemCode,
      selectedSizeCode,
      viewType,
      fromDate,
      asOnDate,
      itemSearchInput
    });
  }, [storeCode, storeSearchInput, categoryCode, selectedItemCode, selectedSizeCode, viewType, fromDate, asOnDate, itemSearchInput]);

  const filterStoresForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(stores) ? stores : [];
    if (!v) return all.slice(0, 50);
    const filtered = all.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    });
    return filtered.slice(0, 50);
  };

  const handleStoreInputChange = (e) => {
    const value = e.target.value;
    setStoreSearchInput(value);
    if (storeCode) setStoreCode('');
    resetForStoreChange();
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
    applyStoreCode(store.storeCode);
    setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setStoreSearchResults([]);
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
  };

  const handleStoreKeyDown = (e) => {
    if (!showStoreSuggestions || storeSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex((prev) => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1);
        return next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex((prev) => {
        const next = prev <= 0 ? 0 : prev - 1;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedStoreSuggestionIndex;
      if (idx >= 0 && idx < storeSearchResults.length) {
        handleSelectStore(storeSearchResults[idx]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowStoreSuggestions(false);
      setFocusedStoreSuggestionIndex(-1);
    }
  };

  const filterItemsForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    if (!v) return [];
    const all = Array.isArray(stockItems) ? stockItems : [];
    const filtered = all.filter(it => {
      const name = String(it?.itemName || '').toLowerCase();
      const code = String(it?.itemCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    });
    return filtered.slice(0, 50);
  };

  const handleItemInputChange = (e) => {
    const value = e.target.value;
    setItemSearchInput(value);
    setSelectedItemCode('');
    setSelectedSizeCode('');
    setRows([]);
    setError('');
    if (!value) {
      setItemSearchResults([]);
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
      return;
    }
    const results = filterItemsForSearch(value);
    setItemSearchResults(results);
    setShowItemSuggestions(true);
    setFocusedItemSuggestionIndex(results.length ? 0 : -1);
  };

  const handleSelectItem = (item) => {
    if (!item?.itemCode) return;
    setSelectedItemCode(item.itemCode);
    setItemSearchInput(item.itemName || item.itemCode);
    setSelectedSizeCode('');
    setRows([]);
    setError('');
    setItemSearchResults([]);
    setShowItemSuggestions(false);
    setFocusedItemSuggestionIndex(-1);
  };

  const handleItemKeyDown = (e) => {
    if (!showItemSuggestions || itemSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedItemSuggestionIndex((prev) => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, itemSearchResults.length - 1);
        return next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedItemSuggestionIndex((prev) => {
        const next = prev <= 0 ? 0 : prev - 1;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = focusedItemSuggestionIndex;
      if (idx >= 0 && idx < itemSearchResults.length) {
        handleSelectItem(itemSearchResults[idx]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowItemSuggestions(false);
      setFocusedItemSuggestionIndex(-1);
    }
  };

  useEffect(() => {
    const fetchLedger = async () => {
      setRows([]);
      setError('');
      setFocusedRowIndex(-1);
      setSelectedRowKeys(new Set());

      if (!selectedStockItem?.itemCode || !asOnDate) return;

      setLoading(true);
      try {
        const params = {
          itemCode: selectedStockItem.itemCode,
          sizeCode: selectedSizeCode,
          asOnDate
        };
        if (fromDate) params.fromDate = fromDate;
        if (storeCode) params.storeCode = storeCode;
        const res = await axios.get('/api/reports/stock-ledger', {
          params
        });
        const nextRows = res.data || [];
        setRows(nextRows);
        setFromDate((prev) => {
          if (fromDateTouchedRef.current) return prev;
          if (prev) return prev;
          const dates = (Array.isArray(nextRows) ? nextRows : [])
            .map(r => new Date(r?.date))
            .filter(d => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
          if (dates.length === 0) return asOnDate;
          return dates[0].toISOString().split('T')[0];
        });
      } catch (e) {
        setError('Failed to load stock ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [storeCode, selectedStockItem, selectedSizeCode, asOnDate, refreshNonce]);

  searchActionRef.current = () => setRefreshNonce((n) => n + 1);

  const displayRows = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];
    if (!fromDate || !asOnDate) return all;
    const from = new Date(fromDate);
    const to = new Date(asOnDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return all;
    const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
    return all.filter((r) => {
      const d = new Date(r?.date);
      if (Number.isNaN(d.getTime())) return true;
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return t >= fromTime && t <= toTime;
    });
  }, [rows, fromDate, asOnDate]);

  useEffect(() => {
    if (focusedRowIndex < 0) return;
    const el = tableContainerRef.current?.querySelector(`[data-row-index="${focusedRowIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ block: 'nearest' });
      } catch {}
    }
  }, [focusedRowIndex]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setVoucherModalOpen(false);
      setVoucherModalHref('');
      setVoucherModalTitle('');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [voucherModalOpen]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
      setVoucherModalOpen(false);
      setVoucherModalHref('');
      setVoucherModalTitle('');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [voucherModalOpen]);

  const handleDownload = async () => {
    if (!selectedStockItem?.itemCode || !asOnDate) return;
    try {
      const params = {
        itemCode: selectedStockItem.itemCode,
        sizeCode: selectedSizeCode,
        asOnDate
      };
      if (fromDate) params.fromDate = fromDate;
      if (storeCode) params.storeCode = storeCode;
      const response = await axios.get('/api/reports/stock-ledger/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const sizeSuffix = selectedSizeCode ? `_${selectedSizeCode}` : '';
      const storeSuffix = storeCode || 'ALL';
      link.setAttribute('download', `StockLedger_${storeSuffix}_${selectedStockItem.itemCode}${sizeSuffix}_${asOnDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Excel download failed');
    }
  };
  exportActionRef.current = handleDownload;

  const toIsoDateFromDisplay = (displayDate) => {
    const s = String(displayDate || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (m) {
      const dd = m[1];
      const mon = m[2].toLowerCase();
      const yyyy = m[3];
      const map = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const mm = map[mon];
      if (mm) return `${yyyy}-${mm}-${dd}`;
    }
    const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    }
    return '';
  };

  const getVoucherUrl = (row, mode = 'edit') => {
    if (!row?.movementType || !row?.voucherNo) return '';
    const voucherNo = row.voucherNo;
    const m = String(mode || 'edit').trim() || 'edit';
    if (row.movementType === 'PURCHASE') {
      return `/purchase-entry?invoiceNo=${encodeURIComponent(voucherNo)}&mode=${encodeURIComponent(m)}`;
    }
    if (row.movementType === 'SALE') {
      return `/sales-entry?invoiceNo=${encodeURIComponent(voucherNo)}&mode=${encodeURIComponent(m)}`;
    }
    if (row.movementType === 'OUTWARD') {
      return `/stock-transfer-out?stoNumber=${encodeURIComponent(voucherNo)}&mode=${encodeURIComponent(m)}`;
    }
    if (row.movementType === 'INWARD') {
      return `/stock-transfer-out?stoNumber=${encodeURIComponent(voucherNo)}&mode=${encodeURIComponent(m)}`;
    }
    return '';
  };

  const getOpeningVoucherUrl = (row) => {
    if (!storeCode) return '';
    const tranDate = toIsoDateFromDisplay(row?.date) || '';
    const params = new URLSearchParams();
    params.set('storeCode', storeCode);
    if (tranDate) params.set('tranDate', tranDate);
    params.set('lockedStore', 'true');
    params.set('lockedDate', 'true');
    if (selectedItemCode) params.set('itemCode', selectedItemCode);
    const sz = selectedSizeCode || row?.sizeCode || '';
    if (sz) params.set('sizeCode', sz);
    return `/inventory?${params.toString()}`;
  };

  const openVoucherModal = (href, row) => {
    if (!href) return;
    const voucherNo = String(row?.voucherNo || '').trim();
    const movementType = String(row?.movementType || '').trim();
    setVoucherModalHref(href);
    if (movementType === 'OPENING') {
      const dt = String(row?.date || '').trim();
      setVoucherModalTitle(dt ? `Opening Inventory - ${dt}` : 'Opening Inventory');
    } else {
      setVoucherModalTitle(voucherNo ? `${movementType} - ${voucherNo}` : movementType);
    }
    setVoucherModalOpen(true);
  };

  const closeVoucherModal = () => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
  };

  const renderQtyCell = (value, row, emphasize, kind) => {
    const v = Number(value || 0);
    const cellStyle = { textAlign: 'right', ...(emphasize ? { fontWeight: 700 } : {}) };
    if (v === 0 || !row?.movementType) {
      return <td style={cellStyle}></td>;
    }
    if (kind === 'opening' && row.movementType === 'OPENING') {
      const href = getOpeningVoucherUrl(row);
      if (!href) return <td style={cellStyle}>{v}</td>;
      return (
        <td style={cellStyle}>
          <button
            type="button"
            className="qty-link"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openVoucherModal(href, row);
            }}
          >
            {v}
          </button>
        </td>
      );
    }
    if (!row?.voucherNo) {
      return <td style={cellStyle}>{v}</td>;
    }
    const href = getVoucherUrl(row, 'edit');
    if (!href) {
      return <td style={cellStyle}>{v}</td>;
    }
    return (
      <td style={cellStyle}>
        <button
          type="button"
          className="qty-link"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openVoucherModal(href, row);
          }}
        >
          {v}
        </button>
      </td>
    );
  };

  const formatAmount = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n === 0) return '';
    return n.toFixed(2);
  };

  const formatQty = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n === 0) return '';
    return String(n);
  };

  const showQty = viewType === 'Qty' || viewType === 'QtyAmount';
  const showAmt = viewType === 'Amount' || viewType === 'QtyAmount';
  const showSizeCol = !selectedSizeCode;
  const tableColCount = (showSizeCol ? 4 : 3) + (showQty ? 3 : 0) + (showAmt ? 3 : 0);

  const getPrice = (row) => {
    const p = Number(row?.purchasePrice || 0);
    return Number.isFinite(p) ? p : 0;
  };

  const qtyAmount = (qty, row) => {
    const q = Number(qty || 0);
    if (!Number.isFinite(q)) return 0;
    return q * getPrice(row);
  };

  const getDescriptionText = (row) => {
    if (!row) return '';
    return row.description || row.voucherNo || '';
  };

  const getRowKey = (row) => {
    const date = String(row?.date || '');
    const desc = String(row?.description || '');
    const voucher = String(row?.voucherNo || '');
    const mv = String(row?.movementType || '');
    const size = String(row?.sizeCode || '');
    const opening = String(row?.openingQty ?? '');
    const purchase = String(row?.purchaseQty ?? '');
    const inward = String(row?.inwardQty ?? '');
    const outward = String(row?.outwardQty ?? '');
    const sale = String(row?.saleQty ?? '');
    const balance = String(row?.balanceQty ?? '');
    return `${date}|${mv}|${voucher}|${size}|${opening}|${purchase}|${inward}|${outward}|${sale}|${balance}|${desc}`;
  };

  const toggleSelectedRow = (rowKey) => {
    if (!rowKey) return;
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  useEffect(() => {
    setExpandedDateKeys(new Set());
  }, [storeCode, selectedItemCode, selectedSizeCode, fromDate, asOnDate]);

  useEffect(() => {
    if (!selectedItemCode) {
      setHiddenRowKeys(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) {
        setHiddenRowKeys(new Set());
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setHiddenRowKeys(new Set());
        return;
      }
      setHiddenRowKeys(new Set(parsed.map((v) => String(v))));
    } catch {
      setHiddenRowKeys(new Set());
    }
  }, [hiddenStorageKey, storeCode, selectedItemCode]);

  useEffect(() => {
    if (!selectedItemCode) return;
    try {
      if (!hiddenRowKeys || hiddenRowKeys.size === 0) {
        localStorage.removeItem(hiddenStorageKey);
        return;
      }
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
    } catch {}
  }, [hiddenRowKeys, hiddenStorageKey, storeCode, selectedItemCode]);

  const toggleDateExpanded = (dateKey) => {
    if (!dateKey) return;
    setExpandedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const flattenedRows = useMemo(() => {
    const all = Array.isArray(displayRows) ? displayRows : [];
    const hidden = hiddenRowKeys || new Set();
    const expanded = expandedDateKeys || new Set();

    const order = [];
    const map = new Map();

    all.forEach((r) => {
      const dateKey = String(r?.date || '').trim();
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
        order.push(dateKey);
      }
      map.get(dateKey).push(r);
    });

    const out = [];
    order.forEach((dateKey) => {
      const groupKey = `g|${dateKey}`;
      if (hidden.has(groupKey)) return;

      const detailsAll = map.get(dateKey) || [];
      const details = detailsAll.filter((r) => !hidden.has(getRowKey(r)));
      if (details.length === 0) return;

      const totals = details.reduce((acc, r) => {
        const openingQty = Number(r?.openingQty || 0);
        const purchaseQty = Number(r?.purchaseQty || 0);
        const inwardQty = Number(r?.inwardQty || 0);
        const outwardQty = Number(r?.outwardQty || 0);
        const saleQty = Number(r?.saleQty || 0);

        const openingAmt = Number(r?.openingAmount ?? qtyAmount(openingQty, r));
        const purchaseAmt = Number(r?.purchaseAmount ?? qtyAmount(purchaseQty, r));
        const inwardAmt = Number(r?.inwardAmount ?? qtyAmount(inwardQty, r));
        const outwardAmt = Number(r?.outwardAmount ?? qtyAmount(outwardQty, r));
        const saleAmt = Number(r?.saleAmount ?? qtyAmount(saleQty, r));

        const inQty = openingQty + purchaseQty + inwardQty;
        const inAmt = openingAmt + purchaseAmt + inwardAmt;
        const outQty = outwardQty + saleQty;
        const outAmt = outwardAmt + saleAmt;

        const closeQty = Number(r?.balanceQty || 0);
        const closeAmt = Number(r?.balanceAmount ?? qtyAmount(closeQty, r));

        acc.inQty += inQty;
        acc.inAmt += inAmt;
        acc.outQty += outQty;
        acc.outAmt += outAmt;
        acc.closeQty = closeQty;
        acc.closeAmt = closeAmt;
        return acc;
      }, {
        inQty: 0, inAmt: 0,
        outQty: 0, outAmt: 0,
        closeQty: 0, closeAmt: 0
      });

      if (!expanded.has(dateKey)) {
        out.push({ kind: 'group', key: groupKey, dateKey, totals });
      } else {
        details.forEach((r) => {
          const key = getRowKey(r);
          out.push({ kind: 'detail', key, dateKey, row: r });
        });
      }
    });

    return out;
  }, [displayRows, expandedDateKeys, hiddenRowKeys]);

  const selectableRowKeys = useMemo(() => {
    return (flattenedRows || []).map((r) => r.key);
  }, [flattenedRows]);

  useEffect(() => {
    if (!selectableRowKeys || selectableRowKeys.length === 0) {
      setFocusedRowIndex(-1);
      setSelectedRowKeys(new Set());
      return;
    }
    setFocusedRowIndex((prev) => (prev >= 0 && prev < selectableRowKeys.length ? prev : 0));
    setSelectedRowKeys((prev) => {
      if (!prev || prev.size === 0) return prev;
      const allowed = new Set(selectableRowKeys);
      const next = new Set();
      prev.forEach((k) => {
        if (allowed.has(k)) next.add(k);
      });
      return next;
    });
  }, [selectableRowKeys]);

  const hideFocusedRow = useMemo(() => {
    return () => {
      if (!selectableRowKeys || selectableRowKeys.length === 0) return;
      const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
      const rowKey = selectableRowKeys[idx];
      if (!rowKey) return;
      setHiddenRowKeys((prev) => {
        const next = new Set(prev);
        next.add(rowKey);
        return next;
      });
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
    };
  }, [focusedRowIndex, selectableRowKeys]);

  const unhideAllRows = useMemo(() => {
    return () => {
      setHiddenRowKeys(new Set());
      try {
        localStorage.removeItem(hiddenStorageKey);
      } catch {}
    };
  }, [hiddenStorageKey]);

  const toggleExpandCollapseAll = useCallback(() => {
    const visibleDates = Array.from(
      new Set(
        (displayRows || [])
          .map((r) => String(r?.date || '').trim())
          .filter(Boolean)
      )
    );

    setExpandedDateKeys((prev) => {
      const current = prev || new Set();
      const allExpanded = visibleDates.length > 0 && visibleDates.every((d) => current.has(d));
      return allExpanded ? new Set() : new Set(visibleDates);
    });
  }, [displayRows]);

  const deleteSelectedVouchers = useCallback(async () => {
    const keys = selectedRowKeys || new Set();
    if (keys.size === 0) return;

    const selectedDetails = (flattenedRows || []).filter((e) => e?.kind === 'detail' && e?.key && keys.has(e.key));
    if (selectedDetails.length === 0) return;

    const candidates = Array.from(
      new Map(
        selectedDetails
          .map((e) => {
            const row = e?.row || {};
            const movementType = String(row?.movementType || '').trim();
            const voucherNo = String(row?.voucherNo || '').trim();
            if (!movementType || !voucherNo) return null;
            if (movementType !== 'PURCHASE' && movementType !== 'SALE' && movementType !== 'OUTWARD' && movementType !== 'INWARD') return null;
            return [`${movementType}|${voucherNo}`, { movementType, voucherNo }];
          })
          .filter(Boolean)
      ).values()
    );

    if (candidates.length === 0) {
      await Swal.fire({ title: 'Nothing to delete', text: 'Selected rows do not contain deletable vouchers.', icon: 'info' });
      return;
    }

    const result = await Swal.fire({
      title: 'Delete selected vouchers?',
      text: `${candidates.length} voucher(s) will be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const deleteUrlFor = (movementType, voucherNo) => {
      if (movementType === 'PURCHASE') return `/api/purchase/${encodeURIComponent(voucherNo)}`;
      if (movementType === 'SALE') return `/api/sales/${encodeURIComponent(voucherNo)}`;
      if (movementType === 'OUTWARD' || movementType === 'INWARD') return `/api/sto/${encodeURIComponent(voucherNo)}`;
      return '';
    };

    const outcomes = await Promise.allSettled(
      candidates.map((c) => {
        const url = deleteUrlFor(c.movementType, c.voucherNo);
        if (!url) return Promise.resolve(null);
        return axios.delete(url, { headers });
      })
    );

    const failed = outcomes.filter((o) => o.status === 'rejected').length;
    const success = candidates.length - failed;

    if (failed === 0) {
      await Swal.fire({ title: 'Deleted', text: `${success} voucher(s) deleted.`, icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      await Swal.fire({ title: 'Completed', text: `${success} deleted, ${failed} failed.`, icon: failed === candidates.length ? 'error' : 'warning' });
    }

    setSelectedRowKeys(new Set());

    if (!selectedStockItem?.itemCode || !asOnDate) return;
    setLoading(true);
    try {
      const params = {
        itemCode: selectedStockItem.itemCode,
        sizeCode: selectedSizeCode,
        asOnDate
      };
      if (storeCode) params.storeCode = storeCode;
      const res = await axios.get('/api/reports/stock-ledger', { params });
      setRows(res.data || []);
    } catch {
      setError('Failed to load stock ledger');
    } finally {
      setLoading(false);
    }
  }, [asOnDate, flattenedRows, selectedRowKeys, selectedSizeCode, selectedStockItem, storeCode]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey) return;
      const k = String(e.key || '').toLowerCase();
      const tag = String(document.activeElement?.tagName || '').toLowerCase();
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
        if (idx < 0 || idx >= (flattenedRows || []).length) return;
        const focused = flattenedRows[idx];
        if (!focused || focused.kind !== 'detail') return;
        const row = focused.row;
        const href = getVoucherUrl(row, 'duplicate');
        if (!href) return;
        e.preventDefault();
        openVoucherModal(href, row);
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        toggleExpandCollapseAll();
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        unhideAllRows();
        return;
      }
      if (k === 'h' || k === 'r') {
        e.preventDefault();
        hideFocusedRow();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedVouchers, flattenedRows, focusedRowIndex, getVoucherUrl, hideFocusedRow, openVoucherModal, toggleExpandCollapseAll, unhideAllRows]);

  const handleGridKeyDown = (e) => {
    const tag = String(document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (!selectableRowKeys || selectableRowKeys.length === 0) return;

    if (e.key === 'Enter') {
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= (flattenedRows || []).length) return;
      const focused = flattenedRows[idx];
      if (focused?.kind !== 'group' && focused?.kind !== 'detail') return;
      e.preventDefault();
      toggleDateExpanded(focused.dateKey);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex((prev) => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex((prev) => {
        const next = prev <= 0 ? 0 : prev - 1;
        return next;
      });
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      const idx = focusedRowIndex;
      if (idx < 0 || idx >= selectableRowKeys.length) return;
      toggleSelectedRow(selectableRowKeys[idx]);
    }
  };

  const totals = useMemo(() => {
    return (displayRows || []).reduce((acc, r) => {
      const openingQty = Number(r?.openingQty || 0);
      const purchaseQty = Number(r?.purchaseQty || 0);
      const inwardQty = Number(r?.inwardQty || 0);
      const outwardQty = Number(r?.outwardQty || 0);
      const saleQty = Number(r?.saleQty || 0);

      const openingAmt = Number(r?.openingAmount ?? qtyAmount(openingQty, r));
      const purchaseAmt = Number(r?.purchaseAmount ?? qtyAmount(purchaseQty, r));
      const inwardAmt = Number(r?.inwardAmount ?? qtyAmount(inwardQty, r));
      const outwardAmt = Number(r?.outwardAmount ?? qtyAmount(outwardQty, r));
      const saleAmt = Number(r?.saleAmount ?? qtyAmount(saleQty, r));

      acc.inQty += openingQty + purchaseQty + inwardQty;
      acc.inAmt += openingAmt + purchaseAmt + inwardAmt;
      acc.outQty += outwardQty + saleQty;
      acc.outAmt += outwardAmt + saleAmt;
      return acc;
    }, {
      inQty: 0, inAmt: 0,
      outQty: 0, outAmt: 0
    });
  }, [displayRows]);

  const lastBalanceQty = useMemo(() => {
    if (!displayRows || displayRows.length === 0) return 0;
    return Number(displayRows[displayRows.length - 1]?.balanceQty || 0);
  }, [displayRows]);

  const lastBalanceAmt = useMemo(() => {
    if (!displayRows || displayRows.length === 0) return 0;
    const last = displayRows[displayRows.length - 1];
    return Number(last?.balanceAmount || 0) || 0;
  }, [displayRows]);

  return (
    <div className="report-container stock-ledger-container stock-ledger-report">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
        <h1 className="stock-ledger-title">Stock Ledger</h1>
        <div className="stock-ledger-header-actions">
          <div className="stock-ledger-header-date-inline">
            <span className="stock-ledger-header-date-caption">From Date</span>
            <div className="date-picker-wrapper stock-ledger-header-date">
              <Calendar className="date-picker-icon" size={18} />
              <button
                type="button"
                className="date-picker-button"
                onClick={openFromDatePicker}
              disabled={!selectedItemCode}
              >
                {fromDate ? toDdMmYyyy(fromDate) : ''}
              </button>
              <input
                ref={fromDateRef}
                type="date"
                value={fromDate}
                onChange={(e) => {
                  fromDateTouchedRef.current = true;
                  setFromDate(e.target.value);
                }}
                disabled={!selectedItemCode}
                className="date-picker-native"
              />
            </div>
          </div>
          <div className="stock-ledger-header-date-inline">
            <span className="stock-ledger-header-date-caption">To Date</span>
            <div className="date-picker-wrapper stock-ledger-header-date">
              <Calendar className="date-picker-icon" size={18} />
              <button
                type="button"
                className="date-picker-button"
                onClick={openAsOnDatePicker}
                disabled={!selectedItemCode}
              >
                {toDdMmYyyy(asOnDate)}
              </button>
              <input
                ref={asOnDateRef}
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                disabled={!selectedItemCode}
                className="date-picker-native"
              />
            </div>
          </div>
          <button className="export-btn stock-ledger-export-btn" onClick={handleDownload} disabled={!displayRows.length}>
            <Download size={18} />
            <span>Excel</span>
          </button>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>Store:</label>
          <div ref={storeSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={storeSearchInput}
              onChange={handleStoreInputChange}
              onKeyDown={handleStoreKeyDown}
              onFocus={() => {
                if (storeLocked) return;
                const results = filterStoresForSearch(storeSearchInput);
                setStoreSearchResults(results);
                setShowStoreSuggestions(true);
                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search store code or name..."
              disabled={storeLocked}
              autoComplete="off"
            />
            {showStoreSuggestions && storeSearchResults.length > 0 && !storeLocked && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  marginTop: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  maxHeight: 260,
                  overflowY: 'auto',
                  zIndex: 50
                }}
              >
                {storeSearchResults.map((st, idx) => (
                  <div
                    key={st.storeCode || idx}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff',
                      borderBottom: '1px solid #f3f4f6'
                    }}
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
          <label>Category:</label>
          <select
            value={categoryCode}
            onChange={(e) => {
              const next = e.target.value;
              setCategoryCode(next);
              setSelectedItemCode('');
              setSelectedSizeCode('');
              setRows([]);
              setError('');
            }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Stock Item:</label>
          <div ref={itemSearchWrapRef} style={{ position: 'relative' }}>
            <input
              type="text"
              value={itemSearchInput}
              onChange={handleItemInputChange}
              onKeyDown={handleItemKeyDown}
              onFocus={() => {
                if (!stockItems || stockItems.length === 0) return;
                if (!itemSearchInput) {
                  const first = (Array.isArray(stockItems) ? stockItems : []).slice(0, 50);
                  setItemSearchResults(first);
                  setShowItemSuggestions(true);
                  setFocusedItemSuggestionIndex(first.length ? 0 : -1);
                  return;
                }
                const results = filterItemsForSearch(itemSearchInput);
                setItemSearchResults(results);
                setShowItemSuggestions(true);
                setFocusedItemSuggestionIndex(results.length ? 0 : -1);
              }}
              placeholder="Search item code or name..."
              autoComplete="off"
            />
            {showItemSuggestions && itemSearchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  marginTop: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  maxHeight: 260,
                  overflowY: 'auto',
                  zIndex: 50
                }}
              >
                {itemSearchResults.map((it, idx) => (
                  <div
                    key={it.itemCode || idx}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: idx === focusedItemSuggestionIndex ? '#eff6ff' : '#fff',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectItem(it);
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{it.itemName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {it.itemCode}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Size:</label>
          <select
            value={selectedSizeCode}
            onChange={(e) => setSelectedSizeCode(e.target.value)}
            disabled={!selectedItemCode}
          >
            <option value="">All Sizes</option>
            {sizes.map(s => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>View:</label>
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            disabled={!selectedItemCode}
          >
            <option value="Qty">Quantity Only</option>
            <option value="Amount">Amount Only</option>
            <option value="QtyAmount">Quantity With Amount</option>
          </select>
        </div>

      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div style={{ padding: '10px', color: '#444' }}>Loading...</div>}

      <div
        ref={tableContainerRef}
        className="table-container"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        onClick={() => tableContainerRef.current?.focus()}
      >
        <table className="report-table">
          <thead>
            <tr>
              <th rowSpan="2">Date</th>
              <th rowSpan="2">Vch Type</th>
              <th rowSpan="2">Vch No.</th>
              {showSizeCol && <th rowSpan="2">Size</th>}
              <th colSpan={(showQty ? 1 : 0) + (showAmt ? 1 : 0)}>Inwards</th>
              <th colSpan={(showQty ? 1 : 0) + (showAmt ? 1 : 0)}>Outwards</th>
              <th colSpan={(showQty ? 1 : 0) + (showAmt ? 1 : 0)}>Closing</th>
            </tr>
            <tr>
              {showQty && <th>Quantity</th>}
              {showAmt && <th>Value</th>}
              {showQty && <th>Quantity</th>}
              {showAmt && <th>Value</th>}
              {showQty && <th>Quantity</th>}
              {showAmt && <th>Value</th>}
            </tr>
          </thead>
          <tbody>
            {flattenedRows.length === 0 ? (
              <tr>
                <td colSpan={tableColCount} style={{ textAlign: 'center', padding: '12px' }}>
                  {selectedItemCode ? 'No data found' : 'Select Stock Item'}
                </td>
              </tr>
            ) : (
              flattenedRows.map((entry, idx) => {
                if (entry.kind === 'group') {
                  const rowKey = entry.key;
                  const expanded = expandedDateKeys.has(entry.dateKey);
                  return (
                    <tr
                      key={rowKey}
                      data-row-index={idx}
                      className={[
                        selectedRowKeys.has(rowKey) ? 'row-selected' : '',
                        idx === focusedRowIndex ? 'row-focused' : ''
                      ].filter(Boolean).join(' ')}
                      style={{ fontWeight: 700, background: '#f8fafc', cursor: 'pointer' }}
                      onMouseDown={() => setFocusedRowIndex(idx)}
                      onClick={() => toggleDateExpanded(entry.dateKey)}
                    >
                      <td>{entry.dateKey}</td>
                      <td>{expanded ? 'Totals (expanded)' : 'Totals'}</td>
                      <td></td>
                      {showSizeCol && <td></td>}
                      {showQty && <td style={{ textAlign: 'right' }}>{formatQty(entry.totals?.inQty)}</td>}
                      {showAmt && <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.inAmt || 0)}</td>}
                      {showQty && <td style={{ textAlign: 'right' }}>{formatQty(entry.totals?.outQty)}</td>}
                      {showAmt && <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.outAmt || 0)}</td>}
                      {showQty && <td style={{ textAlign: 'right' }}>{formatQty(entry.totals?.closeQty)}</td>}
                      {showAmt && <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.closeAmt || 0)}</td>}
                    </tr>
                  );
                }

                const r = entry.row;
                const rowKey = entry.key;
                const openingQty = Number(r?.openingQty || 0);
                const purchaseQty = Number(r?.purchaseQty || 0);
                const inwardQty = Number(r?.inwardQty || 0);
                const outwardQty = Number(r?.outwardQty || 0);
                const saleQty = Number(r?.saleQty || 0);
                const inQty = openingQty + purchaseQty + inwardQty;
                const inAmt = Number(r?.openingAmount || 0) + Number(r?.purchaseAmount || 0) + Number(r?.inwardAmount || 0);
                const outQty = outwardQty + saleQty;
                const outAmt = Number(r?.outwardAmount || 0) + Number(r?.saleAmount || 0);
                const inKind = String(r?.movementType || '').trim() === 'OPENING' ? 'opening' : 'inward';
                return (
                  <tr
                    key={rowKey}
                    data-row-index={idx}
                    className={[
                      rowKey && selectedRowKeys.has(rowKey) ? 'row-selected' : '',
                      idx === focusedRowIndex ? 'row-focused' : ''
                    ].filter(Boolean).join(' ')}
                    onMouseDown={() => setFocusedRowIndex(idx)}
                    onClick={(ev) => {
                      const target = ev?.target;
                      const isInteractive = target?.closest?.('button,a,input,select,textarea');
                      if (isInteractive) return;
                      if (!rowKey) return;
                      toggleSelectedRow(rowKey);
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDateExpanded(entry.dateKey);
                        }}
                        style={{ background: 'transparent', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                      >
                        {r.date}
                      </button>
                    </td>
                    <td>{getDescriptionText(r)}</td>
                    <td>{r.voucherNo || ''}</td>
                    {showSizeCol && <td>{r.sizeName || ''}</td>}
                    {showQty && renderQtyCell(inQty, r, false, inKind)}
                    {showAmt && <td style={{ textAlign: 'right' }}>{formatAmount(inAmt)}</td>}
                    {showQty && renderQtyCell(outQty, r, false, 'outward')}
                    {showAmt && <td style={{ textAlign: 'right' }}>{formatAmount(outAmt)}</td>}
                    {showQty && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(r.balanceQty)}</td>}
                    {showAmt && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(Number(r.balanceAmount || 0))}</td>}
                  </tr>
                );
              })
            )}
          </tbody>
          {displayRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={showSizeCol ? 4 : 3} style={{ fontWeight: 700 }}>TOTAL</td>
                {showQty && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(totals.inQty)}</td>}
                {showAmt && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.inAmt)}</td>}
                {showQty && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(totals.outQty)}</td>}
                {showAmt && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.outAmt)}</td>}
                {showQty && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatQty(lastBalanceQty)}</td>}
                {showAmt && <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(lastBalanceAmt)}</td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <footer style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          className="search-btn"
          onClick={hideFocusedRow}
          disabled={!selectedItemCode || !selectableRowKeys || selectableRowKeys.length === 0}
        >
          ALT+H Hide
        </button>
        <button
          type="button"
          className="search-btn"
          onClick={unhideAllRows}
          disabled={!selectedItemCode || !hiddenRowKeys || hiddenRowKeys.size === 0}
        >
          ALT+U Unhide
        </button>
      </footer>

      <ChangePeriodModal
        open={showChangePeriodModal}
        startDate={fromDate || asOnDate}
        endDate={asOnDate}
        onClose={() => setShowChangePeriodModal(false)}
        onApply={({ startDate: sd, endDate: ed }) => {
          fromDateTouchedRef.current = true;
          setFromDate(sd);
          setAsOnDate(ed);
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
                    if (!s?.storeCode) return;
                    applyStoreCode(s.storeCode);
                    setStoreSearchInput(`${s.storeName} (${s.storeCode})`);
                    setShowStoreModal(false);
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
                          if (!code) return;
                          applyStoreCode(code);
                          setStoreSearchInput(`${name} (${code})`);
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

export default StockLedgerReport;
