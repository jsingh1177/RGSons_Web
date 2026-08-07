import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit2, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import './InventoryList.css';

const InventoryList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const queryStoreCode = (searchParams.get('storeCode') || '').trim();
  const queryTranDate = (searchParams.get('tranDate') || '').trim();
  const queryItemCode = (searchParams.get('itemCode') || '').trim();
  const querySizeCode = (searchParams.get('sizeCode') || '').trim();
  const storeLocked = searchParams.get('lockedStore') === 'true' && !!queryStoreCode;
  const dateLocked = searchParams.get('lockedDate') === 'true' && !!queryTranDate;
  const initializedFromQueryRef = useRef(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [storeSearchInput, setStoreSearchInput] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
  const [selectedDate, setSelectedDate] = useState('2026-04-01');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [matrixSizes, setMatrixSizes] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [purchasePrices, setPurchasePrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);
  const exitConfirmOpenRef = useRef(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [removedKeys, setRemovedKeys] = useState(new Set());

  const [scanSearchInput, setScanSearchInput] = useState('');
  const [scanItemCode, setScanItemCode] = useState('');
  const [scanItemName, setScanItemName] = useState('');
  const [scanSizeCode, setScanSizeCode] = useState('');
  const [scanSizeInput, setScanSizeInput] = useState('');
  const [scanQty, setScanQty] = useState('');
  const [scanPrice, setScanPrice] = useState('');
  const [scanAmount, setScanAmount] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const lastScanEditedFieldRef = useRef('price');
  const [activeGridCell, setActiveGridCell] = useState(null);
  const [gridEditingValues, setGridEditingValues] = useState({});

  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

  const [sizeResults, setSizeResults] = useState([]);
  const [showSizeSuggestions, setShowSizeSuggestions] = useState(false);
  const [focusedSizeSuggestionIndex, setFocusedSizeSuggestionIndex] = useState(-1);

  const itemInputRef = useRef(null);
  const sizeInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const scanDebounceRef = useRef(null);
  const scanAbortControllerRef = useRef(null);
  const gridContainerRef = useRef(null);
  const pendingScrollRowIdRef = useRef(null);
  const itemSuggestionsRef = useRef(null);
  const sizeSuggestionsRef = useRef(null);
  const storeSearchWrapRef = useRef(null);
  const storeSuggestionsRef = useRef(null);

  const parseDecimalValue = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? '' : numeric;
  };

  const formatFixedNumber = (value, decimals) => {
    if (value === '' || value === null || value === undefined) return '';
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return '';
    return numeric.toFixed(decimals);
  };

  const getGridCellKey = (id, col) => `${id}:${col}`;

  const getGridCellDisplayValue = (row, col) => {
    const key = getGridCellKey(row.id, col);
    if (activeGridCell === key) {
      return Object.prototype.hasOwnProperty.call(gridEditingValues, key)
        ? gridEditingValues[key]
        : String(row[col] ?? '');
    }
    if (col === 'opening') return formatFixedNumber(row.opening, 2);
    if (col === 'price') return formatFixedNumber(row.price, 4);
    if (col === 'amount') return formatFixedNumber(row.amount, 2);
    return row[col] ?? '';
  };

  const beginGridCellEdit = (id, col, currentValue) => {
    const key = getGridCellKey(id, col);
    setActiveGridCell(key);
    setGridEditingValues(prev => ({ ...prev, [key]: currentValue === '' || currentValue === null || currentValue === undefined ? '' : String(currentValue) }));
  };

  const updateGridEditingValue = (id, col, value) => {
    const key = getGridCellKey(id, col);
    setGridEditingValues(prev => ({ ...prev, [key]: value }));
  };

  const finishGridCellEdit = (id, col) => {
    const key = getGridCellKey(id, col);
    const decimals = col === 'price' ? 4 : 2;
    setGridRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const currentValue = r[col];
      const normalized = currentValue === '' || currentValue === null || currentValue === undefined
        ? ''
        : parseFloat(parseFloat(currentValue).toFixed(decimals));
      return { ...r, [col]: normalized };
    }));
    setActiveGridCell(prev => (prev === key ? null : prev));
    setGridEditingValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isEditableDecimalText = (value) => /^\d*(\.\d*)?$/.test(value);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (e.defaultPrevented) return;
      const modalOpen = Boolean(
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('.modal-overlay') ||
        document.querySelector('.swal2-container')
      );
      if (modalOpen) return;
      const hasItems = Array.isArray(gridRows) && gridRows.length > 0;
      if (hasItems) {
        if (exitConfirmOpenRef.current) return;
        exitConfirmOpenRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        (async () => {
          try {
            const res = await Swal.fire({
              title: 'Exit voucher?',
              text: 'Items are present in grid. Do you want to exit?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Exit',
              cancelButtonText: 'Stay'
            });
            if (res.isConfirmed) navigate(-1);
          } finally {
            exitConfirmOpenRef.current = false;
          }
        })();
        return;
      }
      e.preventDefault();
      navigate(-1);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [gridRows, navigate]);

  const toIsoDate = (raw) => {
    const s = String(raw || '').trim();
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
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const slash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`;
    return '';
  };

  useEffect(() => {
    if (initializedFromQueryRef.current) return;
    initializedFromQueryRef.current = true;
    if (queryStoreCode) setSelectedLocation(queryStoreCode);
    const iso = toIsoDate(queryTranDate);
    if (iso) setSelectedDate(iso);
    if (queryItemCode && querySizeCode) {
      pendingScrollRowIdRef.current = `${queryItemCode}|${querySizeCode}`;
    }
  }, [queryItemCode, querySizeCode, queryStoreCode, queryTranDate]);

  useEffect(() => {
    if (!showSuggestions) return;
    const idx = focusedSuggestionIndex;
    if (idx < 0) return;
    const container = itemSuggestionsRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ block: 'nearest' });
    } catch {}
  }, [showSuggestions, focusedSuggestionIndex]);

  useEffect(() => {
    if (!showSizeSuggestions) return;
    const idx = focusedSizeSuggestionIndex;
    if (idx < 0) return;
    const container = sizeSuggestionsRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ block: 'nearest' });
    } catch {}
  }, [showSizeSuggestions, focusedSizeSuggestionIndex]);

  useEffect(() => {
    if (!showStoreSuggestions) return;
    const idx = focusedStoreSuggestionIndex;
    if (idx < 0) return;
    const container = storeSuggestionsRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ block: 'nearest' });
    } catch {}
  }, [showStoreSuggestions, focusedStoreSuggestionIndex]);

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
    if (!selectedLocation) return;
    const store = (locations || []).find(s => s?.storeCode === selectedLocation);
    if (!store) {
      if (storeLocked && storeSearchInput !== selectedLocation) setStoreSearchInput(selectedLocation);
      return;
    }
    const display = `${store.storeName} (${store.storeCode})`;
    if (storeSearchInput !== display) setStoreSearchInput(display);
  }, [locations, selectedLocation, storeSearchInput]);

  const filterStoresForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(locations) ? locations : [];
    if (!v) return all.slice(0, 50);
    const filtered = all.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    });
    return filtered.slice(0, 50);
  };

  const applyStoreCode = (next) => {
    setSelectedLocation(next);
    setSelectedCategory('');
    setMatrixSizes([]);
    setGridRows([]);
    setPurchasePrices({});
    setRemovedKeys(new Set());
    setError('');
    setSuccessMessage('');
  };

  const handleStoreInputChange = (e) => {
    if (storeLocked) return;
    const value = e.target.value;
    setStoreSearchInput(value);
    if (selectedLocation) {
      setSelectedLocation('');
      setSelectedCategory('');
      setMatrixSizes([]);
      setGridRows([]);
      setPurchasePrices({});
      setRemovedKeys(new Set());
    }
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
    if (storeLocked) return;
    if (!store?.storeCode) return;
    applyStoreCode(store.storeCode);
    setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
    setStoreSearchResults([]);
    setShowStoreSuggestions(false);
    setFocusedStoreSuggestionIndex(-1);
  };

  const handleStoreKeyDown = (e) => {
    if (storeLocked) return;
    if (!showStoreSuggestions || storeSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex(prev => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1);
        return next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedStoreSuggestionIndex(prev => {
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

  const sizeNameByCode = React.useMemo(() => {
    const map = {};
    (matrixSizes || []).forEach(s => {
      if (s?.code) map[s.code] = s.name || s.code;
    });
    return map;
  }, [matrixSizes]);

  const getNextSizeCode = (currentSizeCode) => {
    if (!currentSizeCode) return '';
    const idx = (matrixSizes || []).findIndex(s => s.code === currentSizeCode);
    if (idx < 0) return '';
    const next = matrixSizes[idx + 1];
    return next?.code || '';
  };

  const handleDownload = async () => {
    try {
      if (!selectedLocation) {
        Swal.fire('Warning', 'Please select Location', 'warning');
        return;
      }
      const token = localStorage.getItem('token');
      const url = `/api/opening-balance/export?storeCode=${encodeURIComponent(selectedLocation)}&tranDate=${encodeURIComponent(selectedDate)}&categoryCode=${encodeURIComponent(selectedCategory || '')}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const urlObj = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlObj;
      link.setAttribute('download', `opening_balance_${selectedLocation}_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading Excel:', err);
      Swal.fire('Error', 'Failed to download Excel file', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedLocation) {
      Swal.fire('Warning', 'Please select Location', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/opening-balance/import?storeCode=${encodeURIComponent(selectedLocation)}&tranDate=${encodeURIComponent(selectedDate)}&categoryCode=${encodeURIComponent(selectedCategory || '')}`,
        formData,
        {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        let msg = `Imported successfully! Saved: ${response.data.savedCount}`;
        if (response.data.errors && response.data.errors.length > 0) {
            msg += `. Errors: ${response.data.errors.join('\n')}`;
            Swal.fire('Warning', msg, 'warning');
        } else {
            Swal.fire('Success', msg, 'success');
        }
        if (selectedLocation) {
          fetchMatrix(selectedLocation, selectedCategory, selectedDate);
        }
      } else {
        Swal.fire('Error', response.data.message || 'Import failed', 'error');
      }
    } catch (err) {
      console.error('Error uploading Excel:', err);
      Swal.fire('Error', 'Failed to upload Excel file', 'error');
    } finally {
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!queryStoreCode) {
        setSelectedLocation('');
        setStoreSearchInput('');
      }
      setShowStoreSuggestions(false);
      setFocusedStoreSuggestionIndex(-1);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const [storesRes, categoriesRes] = await Promise.all([
        axios.get('/api/stores', config),
        axios.get('/api/categories', config)
      ]);

      // Process stores
      const storeList = (storesRes.data.stores || [])
        .filter(store => store.status === true);
      setLocations(storeList);

      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.categories || []);
      }

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to load data. Please try again.');
      }
      setLoading(false);
    }
  }, [navigate, queryStoreCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchMatrix = useCallback(async (storeCode, categoryCode, tranDate) => {
    if (!storeCode) {
      setMatrixSizes([]);
      setGridRows([]);
      setPurchasePrices({});
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/opening-balance/matrix', {
        params: { storeCode, categoryCode, tranDate },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data?.success) {
        const sizes = response.data.data?.sizes || [];
        const rows = response.data.data?.rows || [];
        const prices = response.data.data?.purchasePrices || {};
        const createdAtByKey = response.data.data?.cellCreatedAt || {};
        setMatrixSizes(sizes);
        setPurchasePrices(prices);
        setRemovedKeys(new Set());

        const nonZero = [];
        rows.forEach(r => {
          const itemCode = r?.itemCode;
          const itemName = r?.itemName;
          const openings = r?.openings || {};
          Object.entries(openings).forEach(([sizeCode, opening]) => {
            const qty = typeof opening === 'number' ? opening : parseFloat(opening) || 0;
            if (!itemCode || !sizeCode) return;
            if (qty !== 0) {
              const priceKey = `${itemCode}|${sizeCode}`;
              const price = (prices && typeof prices === 'object' && prices[priceKey] != null) ? (parseFloat(prices[priceKey]) || 0) : 0;
              const createdAt = createdAtByKey && createdAtByKey[priceKey] != null ? (parseInt(createdAtByKey[priceKey], 10) || 0) : 0;
              nonZero.push({
                id: `${itemCode}|${sizeCode}`,
                itemCode,
                itemName: itemName || '',
                sizeCode,
                sizeName: (sizes.find(s => s.code === sizeCode)?.name) || sizeCode,
                opening: qty,
                price,
                amount: qty * price,
                createdAt
              });
            }
          });
        });
        nonZero.sort((a, b) => {
          const aT = a.createdAt || 0;
          const bT = b.createdAt || 0;
          if (aT !== 0 || bT !== 0) {
            if (aT === 0) return 1;
            if (bT === 0) return -1;
            if (aT !== bT) return aT - bT;
          }
          return 0;
        });
        setGridRows(nonZero);
      }
    } catch (err) {
      console.error("Error fetching opening balance", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg ? `Failed to load opening balance: ${msg}` : 'Failed to load opening balance');
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedLocation && selectedDate) {
      fetchMatrix(selectedLocation, selectedCategory, selectedDate);
    }
  }, [selectedLocation, selectedCategory, selectedDate, fetchMatrix]);

  useEffect(() => {
    if (!scanItemCode) {
      const shouldClearEditContext = !editingRowId || !scanSearchInput || !scanSearchInput.trim();
      setScanSizeCode('');
      setScanSizeInput('');
      if (shouldClearEditContext) {
        setScanQty('');
        setScanPrice('');
      }
      setSizeResults([]);
      setShowSizeSuggestions(false);
      setFocusedSizeSuggestionIndex(-1);
      if (shouldClearEditContext) {
        setEditingRowId(null);
      }
    }
  }, [editingRowId, scanItemCode, scanSearchInput]);

  useEffect(() => {
    if (!purchasePrices || Object.keys(purchasePrices).length === 0) return;
    setGridRows(prev => prev.map(r => {
      const key = `${r.itemCode}|${r.sizeCode}`;
      const price = purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : (parseFloat(r.price) || 0);
      const opening = typeof r.opening === 'number' ? r.opening : parseFloat(r.opening) || 0;
      return { ...r, price, amount: opening * price };
    }));
  }, [purchasePrices]);

  const handleItemSearchChange = (e) => {
    const value = e.target.value;
    setScanSearchInput(value);
    setScanItemCode('');
    setScanItemName('');
    setScanSizeCode('');
    setScanSizeInput('');
    setFocusedSuggestionIndex(-1);

    if (scanDebounceRef.current) {
      clearTimeout(scanDebounceRef.current);
    }
    if (scanAbortControllerRef.current) {
      scanAbortControllerRef.current.abort();
    }

    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    scanDebounceRef.current = setTimeout(async () => {
      scanAbortControllerRef.current = new AbortController();
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/items/search', {
          params: { query: value.trim() },
          headers: { Authorization: `Bearer ${token}` },
          signal: scanAbortControllerRef.current.signal
        });
        if (response.data?.success) {
          let items = response.data.items || [];
          if (selectedCategory) {
            items = items.filter(i => (i.categoryCode || '') === selectedCategory);
          }
          setSearchResults(items);
          setShowSuggestions(true);
        } else {
          setSearchResults([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        if (axios.isCancel && axios.isCancel(error)) return;
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = (item) => {
    const itemCode = item?.itemCode || '';
    setScanItemCode(itemCode);
    setScanItemName(item?.itemName || '');
    setScanSearchInput(item?.itemName || itemCode || '');
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    const sizes = matrixSizes || [];
    setSizeResults(sizes);
    if (sizes.length > 0) {
      const first = sizes[0];
      const sizeCode = first?.code || '';
      const sizeName = first?.name || sizeCode;
      const key = `${itemCode}|${sizeCode}`;
      const price = purchasePrices && purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : 0;
      setScanSizeCode(sizeCode);
      setScanSizeInput(sizeName);
      setScanPrice(price ? String(price) : '');
      setShowSizeSuggestions(true);
      setFocusedSizeSuggestionIndex(0);
    } else {
      setScanSizeCode('');
      setScanSizeInput('');
      setScanPrice('');
      setShowSizeSuggestions(false);
      setFocusedSizeSuggestionIndex(-1);
    }
    requestAnimationFrame(() => {
      if (sizeInputRef.current) {
        sizeInputRef.current.focus();
        if (typeof sizeInputRef.current.select === 'function') sizeInputRef.current.select();
      }
    });
  };

  const handleItemSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        const list = searchResults.slice(0, 20);
        const selected = (focusedSuggestionIndex >= 0 && list[focusedSuggestionIndex])
          ? list[focusedSuggestionIndex]
          : list[0];
        handleSelectSuggestion(selected);
        requestAnimationFrame(() => {
          if (sizeInputRef.current) {
            sizeInputRef.current.focus();
            if (typeof sizeInputRef.current.select === 'function') sizeInputRef.current.select();
          }
        });
        return;
      }
      const input = scanSearchInput.trim();
      if (!input) return;
      const exact = searchResults.find(i => (i.itemCode || '').toString() === input);
      if (exact) {
        handleSelectSuggestion(exact);
        return;
      }
      if (searchResults.length === 1) {
        handleSelectSuggestion(searchResults[0]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/items/search', {
          params: { query: input },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data?.success) {
          const items = response.data.items || [];
          const exactFromApi = items.find(i => (i.itemCode || '').toString() === input);
          if (exactFromApi) {
            handleSelectSuggestion(exactFromApi);
            requestAnimationFrame(() => {
              if (sizeInputRef.current) {
                sizeInputRef.current.focus();
                if (typeof sizeInputRef.current.select === 'function') sizeInputRef.current.select();
              }
            });
            return;
          }
          if (items.length > 0) {
            handleSelectSuggestion(items[0]);
            requestAnimationFrame(() => {
              if (sizeInputRef.current) {
                sizeInputRef.current.focus();
                if (typeof sizeInputRef.current.select === 'function') sizeInputRef.current.select();
              }
            });
            return;
          }
        }
      } catch (ignored) {
      }

      if (sizeInputRef.current) sizeInputRef.current.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = Math.min(19, searchResults.length - 1);
      setFocusedSuggestionIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
      setShowSuggestions(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const max = Math.min(19, searchResults.length - 1);
      setFocusedSuggestionIndex(prev => Math.max(-1, Math.min(max, prev - 1)));
      setShowSuggestions(true);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  const resetScanLine = () => {
    setScanSearchInput('');
    setScanItemCode('');
    setScanItemName('');
    setScanSizeCode('');
    setScanSizeInput('');
    setScanQty('');
    setScanPrice('');
    setScanAmount('');
    setEditingRowId(null);
    lastScanEditedFieldRef.current = 'price';
    setSearchResults([]);
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    setSizeResults([]);
    setShowSizeSuggestions(false);
    setFocusedSizeSuggestionIndex(-1);
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const clearQtyAndAdvanceSize = () => {
    const nextSizeCode = getNextSizeCode(scanSizeCode);
    if (nextSizeCode) {
      const key = `${scanItemCode}|${nextSizeCode}`;
      const nextPrice = purchasePrices && purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : 0;
      setScanSizeCode(nextSizeCode);
      setScanSizeInput(sizeNameByCode[nextSizeCode] || nextSizeCode);
      setScanQty('');
      setScanPrice(nextPrice ? String(nextPrice) : '');
      setScanAmount('');
      setEditingRowId(null);
      lastScanEditedFieldRef.current = 'price';
      setShowSizeSuggestions(false);
      setFocusedSizeSuggestionIndex(-1);
      if (qtyInputRef.current) qtyInputRef.current.focus();
      return;
    }
    resetScanLine();
  };

  useEffect(() => {
    if (!scanItemCode || !scanSizeCode) {
      if (scanAmount !== '') setScanAmount('');
      return;
    }
    const qty = parseInt(scanQty, 10);
    if (!qty || qty <= 0) {
      if (scanAmount !== '') setScanAmount('');
      return;
    }

    if (lastScanEditedFieldRef.current === 'amount') {
      const enteredAmount = scanAmount === '' ? null : parseFloat(scanAmount);
      if (enteredAmount === null || Number.isNaN(enteredAmount)) return;
      const nextPrice = (enteredAmount / qty).toFixed(4);
      if (scanPrice !== nextPrice) setScanPrice(nextPrice);
      return;
    }

    const key = `${scanItemCode}|${scanSizeCode}`;
    const defaultPrice = purchasePrices && purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : 0;
    const enteredPrice = scanPrice === '' ? null : parseFloat(scanPrice);
    const price = enteredPrice !== null && !Number.isNaN(enteredPrice) ? enteredPrice : defaultPrice;
    const next = (qty * (parseFloat(price) || 0)).toFixed(2);
    if (scanAmount !== next) setScanAmount(next);
  }, [scanAmount, scanItemCode, scanQty, scanPrice, scanSizeCode, purchasePrices]);

  useEffect(() => {
    const rowId = pendingScrollRowIdRef.current;
    if (!rowId) return;
    pendingScrollRowIdRef.current = null;
    requestAnimationFrame(() => {
      const container = gridContainerRef.current;
      if (!container) return;
      const safe = String(rowId).replaceAll('"', '\\"');
      const rowEl = container.querySelector(`[data-row-id="${safe}"]`);
      if (rowEl && typeof rowEl.scrollIntoView === 'function') {
        try {
          rowEl.scrollIntoView({ block: 'nearest' });
        } catch {}
      }
    });
  }, [gridRows]);

  const handleSizeSearchChange = (e) => {
    const value = e.target.value;
    setScanSizeInput(value);
    setScanSizeCode('');
    setFocusedSizeSuggestionIndex(-1);
    if (!value) {
      setSizeResults(matrixSizes || []);
      setShowSizeSuggestions(true);
      return;
    }
    const q = value.trim().toLowerCase();
    const filtered = (matrixSizes || []).filter(s => {
      const code = (s.code || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
    setSizeResults(filtered);
    setShowSizeSuggestions(true);
  };

  const handleSelectSize = (size) => {
    const code = size?.code || '';
    if (!code) return;
    const key = `${scanItemCode}|${code}`;
    const price = purchasePrices && purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : 0;
    setScanSizeCode(code);
    setScanSizeInput(size?.name || code);
    setScanPrice(price ? String(price) : '');
    lastScanEditedFieldRef.current = 'price';
    setShowSizeSuggestions(false);
    setFocusedSizeSuggestionIndex(-1);
    if (qtyInputRef.current) qtyInputRef.current.focus();
  };

  const handleSizeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if ((sizeResults?.length || 0) > 0) {
        const list = (sizeResults || []).slice(0, 20);
        const selected = (focusedSizeSuggestionIndex >= 0 && list[focusedSizeSuggestionIndex])
          ? list[focusedSizeSuggestionIndex]
          : list[0];
        handleSelectSize(selected);
        return;
      }

      const input = (scanSizeInput || '').trim();
      const base = matrixSizes || [];
      const filtered = input
        ? base.filter(s => ((s.code || '').toLowerCase().includes(input.toLowerCase()) || (s.name || '').toLowerCase().includes(input.toLowerCase())))
        : base;
      if (filtered.length > 0) {
        handleSelectSize(filtered[0]);
        return;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = Math.min(19, (sizeResults?.length || 0) - 1);
      setFocusedSizeSuggestionIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
      setShowSizeSuggestions(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const max = Math.min(19, (sizeResults?.length || 0) - 1);
      setFocusedSizeSuggestionIndex(prev => Math.max(-1, Math.min(max, prev - 1)));
      setShowSizeSuggestions(true);
    } else if (e.key === 'Escape') {
      setShowSizeSuggestions(false);
      setFocusedSizeSuggestionIndex(-1);
    }
  };

  const handleAddRow = () => {
    if (!selectedLocation) {
      Swal.fire('Warning', 'Please select Location', 'warning');
      return;
    }
    if (!scanItemCode) {
      Swal.fire('Warning', 'Please select Item', 'warning');
      return;
    }
    if (!scanSizeCode) {
      Swal.fire('Warning', 'Please select Size', 'warning');
      return;
    }
    const qty = parseInt(scanQty, 10);
    if (!qty || qty <= 0) {
      Swal.fire('Warning', 'Please enter Opening Qty', 'warning');
      return;
    }

    const key = `${scanItemCode}|${scanSizeCode}`;
    const sizeName = sizeNameByCode[scanSizeCode] || scanSizeCode;
    const defaultPrice = purchasePrices && purchasePrices[key] != null ? (parseFloat(purchasePrices[key]) || 0) : 0;
    const enteredPrice = scanPrice === '' ? null : parseFloat(scanPrice);
    if (scanPrice !== '' && (enteredPrice === null || Number.isNaN(enteredPrice))) {
      Swal.fire('Warning', 'Please enter valid Price', 'warning');
      return;
    }
    const enteredAmount = scanAmount === '' ? null : parseFloat(scanAmount);
    if (scanAmount !== '' && (enteredAmount === null || Number.isNaN(enteredAmount))) {
      Swal.fire('Warning', 'Please enter valid Amount', 'warning');
      return;
    }

    const isAmountMode = lastScanEditedFieldRef.current === 'amount' && enteredAmount !== null && !Number.isNaN(enteredAmount);
    const price = isAmountMode ? (enteredAmount / qty).toFixed(4) : (enteredPrice !== null && !Number.isNaN(enteredPrice) ? enteredPrice : defaultPrice);
    const amount = isAmountMode ? enteredAmount : (qty * (parseFloat(price) || 0));
    setRemovedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      if (editingRowId && editingRowId !== key) next.add(editingRowId);
      return next;
    });

    setGridRows(prev => {
      const next = [...prev];
      const row = {
        id: key,
        itemCode: scanItemCode,
        itemName: scanItemName || scanSearchInput,
        sizeCode: scanSizeCode,
        sizeName,
        opening: qty,
        price,
        amount
      };

      if (editingRowId) {
        const editingIdx = next.findIndex(r => r.id === editingRowId);
        if (editingRowId !== key && editingIdx >= 0) {
          const existingIdx = next.findIndex(r => r.id === key);
          if (existingIdx >= 0 && existingIdx !== editingIdx) {
            next.splice(existingIdx, 1);
            if (existingIdx < editingIdx) {
              const newEditingIdx = next.findIndex(r => r.id === editingRowId);
              if (newEditingIdx >= 0) {
                next.splice(newEditingIdx, 1, row);
                return next;
              }
            }
          }
          next.splice(editingIdx, 1, row);
          return next;
        }
        if (editingIdx >= 0) {
          next[editingIdx] = row;
          return next;
        }
      }

      const existingIdx = next.findIndex(r => r.id === key);
      if (existingIdx >= 0) {
        next[existingIdx] = row;
        return next;
      }

      next.push(row);
      return next;
    });

    pendingScrollRowIdRef.current = key;
    if (editingRowId) {
      resetScanLine();
      return;
    }
    clearQtyAndAdvanceSize();
  };

  const handleEditRow = (row) => {
    if (!row?.id) return;
    setEditingRowId(row.id);
    setScanItemCode(row.itemCode || '');
    setScanItemName(row.itemName || '');
    setScanSearchInput(row.itemName || row.itemCode || '');
    setScanSizeCode(row.sizeCode || '');
    setScanSizeInput(row.sizeName || row.sizeCode || '');
    setScanQty(String(row.opening ?? ''));
    setScanPrice(row.price === null || row.price === undefined ? '' : String(row.price));
    setScanAmount(row.amount === null || row.amount === undefined ? '' : String(row.amount));
    lastScanEditedFieldRef.current = 'price';
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    setShowSizeSuggestions(false);
    setFocusedSizeSuggestionIndex(-1);
    if (qtyInputRef.current) qtyInputRef.current.focus();
    pendingScrollRowIdRef.current = row.id;
  };

  const handleDeleteRow = (row) => {
    const key = row?.id;
    setGridRows(prev => prev.filter(r => r.id !== key));
    if (key && editingRowId === key) {
      resetScanLine();
    }
    if (key) {
      setRemovedKeys(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }
  };

  const handleGridQtyChange = (id, value) => {
    if (!isEditableDecimalText(value)) return;
    updateGridEditingValue(id, 'opening', value);
    const v = parseDecimalValue(value);
    setGridRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const price = parseFloat(r.price) || 0;
      const opening = v;
      const numericOpening = typeof opening === 'number' ? opening : parseFloat(opening) || 0;
      return { ...r, opening, amount: numericOpening * price };
    }));
  };

  const handleGridPriceChange = (id, value) => {
    if (!isEditableDecimalText(value)) return;
    updateGridEditingValue(id, 'price', value);
    const v = parseDecimalValue(value);
    setGridRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const opening = typeof r.opening === 'number' ? r.opening : parseFloat(r.opening) || 0;
      const price = v;
      return { ...r, price, amount: opening * (parseFloat(price) || 0) };
    }));
  };

  const handleGridAmountChange = (id, value) => {
    if (!isEditableDecimalText(value)) return;
    updateGridEditingValue(id, 'amount', value);
    const v = parseDecimalValue(value);
    setGridRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const opening = typeof r.opening === 'number' ? r.opening : parseFloat(r.opening) || 0;
      if (v === '') return { ...r, amount: '', price: '' };
      const amount = v;
      const price = opening > 0 ? (amount / opening).toFixed(4) : 0;
      return { ...r, amount, price };
    }));
  };

  const focusGridInput = (rowIndex, col) => {
    const container = gridContainerRef.current;
    if (!container) return;
    const el = container.querySelector(`input[data-row-index="${rowIndex}"][data-col="${col}"]`);
    if (!el) return;
    try {
      el.focus();
      el.select?.();
    } catch {}
  };

  const handleGridInputKeyDown = (rowIndex, col, e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusGridInput(Math.min(gridRows.length - 1, rowIndex + 1), col);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusGridInput(Math.max(0, rowIndex - 1), col);
      return;
    }
    if (e.key === 'ArrowLeft') {
      if (col === 'price') {
        e.preventDefault();
        focusGridInput(rowIndex, 'opening');
        return;
      }
      if (col === 'amount') {
        e.preventDefault();
        focusGridInput(rowIndex, 'price');
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      if (col === 'opening') {
        e.preventDefault();
        focusGridInput(rowIndex, 'price');
        return;
      }
      if (col === 'price') {
        e.preventDefault();
        focusGridInput(rowIndex, 'amount');
      }
    }
  };

  const totalOpeningQty = React.useMemo(
    () => (gridRows || []).reduce((sum, r) => sum + (typeof r.opening === 'number' ? r.opening : parseFloat(r.opening) || 0), 0),
    [gridRows]
  );

  const totalAmount = React.useMemo(
    () => (gridRows || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [gridRows]
  );

  const handleSave = async () => {
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const grouped = new Map();

      gridRows.forEach(r => {
        if (!r?.itemCode || !r?.sizeCode) return;
        const opening = typeof r.opening === 'number' ? r.opening : parseFloat(r.opening) || 0;
        const entry = grouped.get(r.itemCode) || { itemCode: r.itemCode, itemName: r.itemName || '', openings: {}, prices: {}, amounts: {} };
        entry.openings[r.sizeCode] = opening;
        entry.prices[r.sizeCode] = parseFloat(r.price) || 0;
        entry.amounts[r.sizeCode] = parseFloat(r.amount) || (opening * (parseFloat(r.price) || 0));
        grouped.set(r.itemCode, entry);
      });

      removedKeys.forEach(key => {
        const [itemCode, sizeCode] = key.split('|');
        if (!itemCode || !sizeCode) return;
        const entry = grouped.get(itemCode) || { itemCode, itemName: '', openings: {}, prices: {}, amounts: {} };
        entry.openings[sizeCode] = 0;
        entry.amounts[sizeCode] = 0;
        grouped.set(itemCode, entry);
      });

      const rows = Array.from(grouped.values()).filter(r => r.itemCode && r.openings && Object.keys(r.openings).length > 0);

      const response = await axios.post('/api/opening-balance/save-matrix', {
        storeCode: selectedLocation,
        tranDate: selectedDate,
        rows
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        if (isEmbedded()) {
          requestCloseParentModal();
          return;
        }
        const savedLines = ['Opening balance saved successfully!'];
        if (response.data.fifoUpdated) {
          savedLines.push(
            `FIFO Rebuilt: ${String(response.data.fifoFromDate || selectedDate || '')} to ${String(response.data.fifoToDate || '')}`,
            `Snapshot Rows Inserted: ${String(response.data.snapshotRowsInserted ?? 0)}`,
            `STO Lines Updated: ${String(response.data.stoLinesUpdated ?? 0)}`
          );
        }
        setSuccessMessage(savedLines.join('\n'));
        setRemovedKeys(new Set());
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchMatrix(selectedLocation, selectedCategory, selectedDate);
      } else {
        setError(response.data.message || 'Failed to save');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpeningBalance = async () => {
    if (!selectedLocation) {
      Swal.fire('Warning', 'Please select Location', 'warning');
      return;
    }
    if (!selectedDate) {
      Swal.fire('Warning', 'Please select Date', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Voucher?',
      text: `Opening Inventory for ${selectedLocation} on ${selectedDate}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete('/api/opening-balance/delete', {
        params: {
          storeCode: selectedLocation,
          tranDate: selectedDate,
          categoryCode: selectedCategory || ''
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        if (isEmbedded()) {
          requestCloseParentModal();
          return;
        }
        Swal.fire('Deleted', response.data.message || 'Opening balance deleted', 'success');
        setGridRows([]);
        setRemovedKeys(new Set());
        fetchMatrix(selectedLocation, selectedCategory, selectedDate);
      } else {
        Swal.fire('Error', response.data?.message || 'Failed to delete opening balance', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to delete opening balance', 'error');
    }
  };

  const isEmbedded = () => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  };

  const requestCloseParentModal = () => {
    try {
      window.parent.postMessage({ type: 'RG_CLOSE_VOUCHER_MODAL' }, window.location.origin);
    } catch {}
  };

  useEffect(() => {
    if (!isEmbedded()) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      requestCloseParentModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleBack = () => {
    if (isEmbedded()) {
      requestCloseParentModal();
      return;
    }
    navigate(-1);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="inventory-list-container">
      <div className="inventory-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Opening Inventory</h1>
        </div>
        <div className="header-buttons">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!selectedLocation || saving}
            style={{ backgroundColor: '#8e44ad', backgroundImage: 'none' }}
          >
            Save
          </button>
          <button
            className="save-btn"
            onClick={handleDeleteOpeningBalance}
            disabled={!selectedLocation || saving}
            style={{ backgroundColor: '#dc2626', backgroundImage: 'none' }}
          >
            Delete
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
          />
          <button
            className="save-btn"
            onClick={handleDownload}
            style={{ backgroundColor: '#10B981', backgroundImage: 'none' }}
          >
            <Download size={16} style={{ marginRight: 8 }} />
            Export
          </button>
          <button
            className="save-btn"
            onClick={() => fileInputRef.current.click()}
            style={{ backgroundColor: '#3B82F6', backgroundImage: 'none' }}
            disabled={saving}
          >
            <Upload size={16} style={{ marginRight: 8 }} />
            Upload
          </button>
        </div>
      </div>

      <div className="inventory-content">
        {isUploading && (
            <div className="progress-overlay">
                <div className="progress-container">
                    <div 
                        className="progress-bar" 
                        style={{ width: `${uploadProgress}%` }}
                    ></div>
                </div>
                <div className="progress-text">
                    {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing... Please wait'}
                </div>
            </div>
        )}
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <div className="filters-section">
          <div className="filter-group">
            <label>Location</label>
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
                className="filter-input"
                autoComplete="off"
                disabled={storeLocked}
              />
              {showStoreSuggestions && storeSearchResults.length > 0 && (
                <div
                  ref={storeSuggestionsRef}
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
                      data-suggestion-index={idx}
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
                      <div style={{ fontWeight: 600 }}>{st.storeName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{st.storeCode}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="filter-group">
            <label htmlFor="date-select">Date</label>
            <input
              type="date"
              id="date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-input"
              disabled={dateLocked}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="category-select">Category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
              disabled={!selectedLocation}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedLocation ? (
          <>
            <div className="opening-scan-panel">
              <div className="opening-scan-row">
                <div className="opening-scan-field opening-item-field">
                  <label>Item</label>
                  <div className="opening-item-input-wrapper">
                    <input
                      ref={itemInputRef}
                      value={scanSearchInput}
                      onChange={handleItemSearchChange}
                      onKeyDown={handleItemSearchKeyDown}
                      placeholder="Search Item (code or name)"
                      className="opening-input"
                      disabled={!selectedLocation}
                    />
                    {showSuggestions && searchResults.length > 0 && (
                      <div ref={itemSuggestionsRef} className="opening-suggestions">
                        {searchResults.slice(0, 20).map((it, index) => (
                          <div
                            key={(it.id ?? it.itemCode ?? index).toString()}
                            data-suggestion-index={index}
                            className={`opening-suggestion-item ${index === focusedSuggestionIndex ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(it);
                            }}
                          >
                            <div className="opening-suggestion-title">{it.itemName}</div>
                            <div className="opening-suggestion-sub">{it.itemCode}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="opening-scan-field opening-scan-field-number">
                  <label>Size</label>
                  <div className="opening-item-input-wrapper">
                    <input
                      ref={sizeInputRef}
                      value={scanSizeInput}
                      onChange={handleSizeSearchChange}
                      onKeyDown={handleSizeKeyDown}
                      onFocus={() => {
                        if (!scanItemCode) return;
                        setSizeResults(matrixSizes || []);
                        setShowSizeSuggestions(true);
                      }}
                      placeholder="Search Size"
                      className="opening-input"
                      disabled={!scanItemCode}
                    />
                    {showSizeSuggestions && scanItemCode && (sizeResults?.length || 0) > 0 && (
                      <div ref={sizeSuggestionsRef} className="opening-suggestions">
                        {sizeResults.slice(0, 20).map((sz, index) => (
                          <div
                            key={(sz.code ?? index).toString()}
                            data-suggestion-index={index}
                            className={`opening-suggestion-item ${index === focusedSizeSuggestionIndex ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSize(sz);
                            }}
                          >
                            <div className="opening-suggestion-title">{sz.name || sz.code}</div>
                            <div className="opening-suggestion-sub">{sz.code}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="opening-scan-field opening-scan-field-number">
                  <label className="opening-number-label">Qty</label>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="0"
                    className="opening-input opening-number-input opening-scan-number-input"
                    placeholder="Qty"
                    value={scanQty}
                    onChange={(e) => {
                      lastScanEditedFieldRef.current = 'qty';
                      setScanQty(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!scanItemCode) {
                          if (itemInputRef.current) itemInputRef.current.focus();
                          return;
                        }
                        if (!scanSizeCode) {
                          if (sizeInputRef.current) sizeInputRef.current.focus();
                          return;
                        }
                        const qty = parseInt(scanQty, 10);
                        if (!qty || qty <= 0) {
                          clearQtyAndAdvanceSize();
                          return;
                        }
                        if (priceInputRef.current) priceInputRef.current.focus();
                      }
                    }}
                    disabled={!scanItemCode || !scanSizeCode}
                  />
                </div>

                <div className="opening-scan-field opening-scan-field-amount">
                  <label className="opening-number-label">Rate</label>
                  <input
                    ref={priceInputRef}
                    type="number"
                    min="0"
                    className="opening-input opening-number-input opening-scan-number-input"
                    placeholder="Rate"
                    value={scanPrice}
                    onChange={(e) => {
                      lastScanEditedFieldRef.current = 'price';
                      setScanPrice(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      if (!scanItemCode) {
                        if (itemInputRef.current) itemInputRef.current.focus();
                        return;
                      }
                      if (!scanSizeCode) {
                        if (sizeInputRef.current) sizeInputRef.current.focus();
                        return;
                      }
                      const qty = parseInt(scanQty, 10);
                      if (!qty || qty <= 0) {
                        if (qtyInputRef.current) qtyInputRef.current.focus();
                        return;
                      }
                      if (amountInputRef.current) {
                        amountInputRef.current.focus();
                        return;
                      }
                      handleAddRow();
                    }}
                    disabled={!scanItemCode || !scanSizeCode}
                  />
                </div>

                <div className="opening-scan-field">
                  <label className="opening-number-label">Amount</label>
                  <input
                    ref={amountInputRef}
                    type="number"
                    min="0"
                    className="opening-input opening-number-input opening-scan-number-input opening-scan-amount-input"
                    placeholder="0.00"
                    value={scanAmount}
                    onChange={(e) => {
                      lastScanEditedFieldRef.current = 'amount';
                      setScanAmount(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      handleAddRow();
                    }}
                    disabled={!scanItemCode || !scanSizeCode}
                  />
                </div>

                <div className="opening-scan-actions">
                  <button type="button" className="opening-add-btn" onClick={handleAddRow} disabled={!scanItemCode || !scanSizeCode}>
                    {editingRowId ? 'Update' : 'Add'}
                  </button>
                  <button type="button" className="opening-clear-btn" onClick={resetScanLine}>
                    Clear
                  </button>
                </div>
              </div>
              {(scanItemCode || scanItemName) && (
                <div className="opening-selected-meta">
                  <span className="opening-meta-pill">Item: {scanItemCode} {scanItemName ? `- ${scanItemName}` : ''}</span>
                </div>
              )}
            </div>

            <div ref={gridContainerRef} className="opening-grid-container">
              <table className="opening-grid-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '30%' }}>Item</th>
                    <th style={{ width: '18%' }}>Size</th>
                    <th style={{ width: '14%' }}>Opening</th>
                    <th style={{ width: '12%' }}>Price</th>
                    <th style={{ width: '14%' }}>Amount</th>
                    <th style={{ width: '8%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gridRows.length > 0 ? (
                    gridRows.map((r, rowIndex) => (
                      <tr key={r.id} data-row-id={r.id} data-row-index={rowIndex}>
                        <td className="opening-grid-number">{rowIndex + 1}</td>
                        <td>
                          <div className="opening-grid-item">
                            <div className="opening-grid-item-code">{r.itemName || r.itemCode}</div>
                            <div className="opening-grid-item-name">{r.itemCode}</div>
                          </div>
                        </td>
                        <td>
                          <div className="opening-grid-item">
                            <div className="opening-grid-item-code">{r.sizeName || r.sizeCode}</div>
                            <div className="opening-grid-item-name">{r.sizeCode}</div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="opening-grid-qty opening-grid-amount-input"
                            value={getGridCellDisplayValue(r, 'opening')}
                            onChange={(e) => handleGridQtyChange(r.id, e.target.value)}
                            onFocus={() => beginGridCellEdit(r.id, 'opening', r.opening)}
                            onBlur={() => finishGridCellEdit(r.id, 'opening')}
                            data-row-index={rowIndex}
                            data-col="opening"
                            onKeyDown={(e) => handleGridInputKeyDown(rowIndex, 'opening', e)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="opening-grid-qty"
                            value={getGridCellDisplayValue(r, 'price')}
                            onChange={(e) => handleGridPriceChange(r.id, e.target.value)}
                            onFocus={() => beginGridCellEdit(r.id, 'price', r.price)}
                            onBlur={() => finishGridCellEdit(r.id, 'price')}
                            data-row-index={rowIndex}
                            data-col="price"
                            onKeyDown={(e) => handleGridInputKeyDown(rowIndex, 'price', e)}
                          />
                        </td>
                        <td className="opening-grid-number opening-grid-amount">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="opening-grid-qty"
                            value={getGridCellDisplayValue(r, 'amount')}
                            onChange={(e) => handleGridAmountChange(r.id, e.target.value)}
                            onFocus={() => beginGridCellEdit(r.id, 'amount', r.amount)}
                            onBlur={() => finishGridCellEdit(r.id, 'amount')}
                            data-row-index={rowIndex}
                            data-col="amount"
                            onKeyDown={(e) => handleGridInputKeyDown(rowIndex, 'amount', e)}
                          />
                        </td>
                        <td>
                          <div className="opening-grid-actions">
                            <button type="button" className="opening-edit-btn" onClick={() => handleEditRow(r)}>
                              <Edit2 size={16} />
                            </button>
                            <button type="button" className="opening-delete-btn" onClick={() => handleDeleteRow(r)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '18px' }}>
                        No items found. Add items from above.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" style={{ fontWeight: 700 }}>TOTAL</td>
                    <td className="opening-grid-number" style={{ fontWeight: 700 }}>{totalOpeningQty.toFixed(2)}</td>
                    <td></td>
                    <td className="opening-grid-number opening-grid-amount" style={{ fontWeight: 700 }}>{totalAmount.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Please select Location</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryList;
