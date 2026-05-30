import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Download, Upload } from 'lucide-react';
import './ItemList.css'; 
import './PriceManagement.css'; // We can reuse or adapt ItemList.css styles if PriceManagement.css is empty

const PriceManagement = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null); // If null, it's Add mode
  const [modalError, setModalError] = useState('');

  const [showAltUnitModal, setShowAltUnitModal] = useState(false);
  const [altUnitEditingPrice, setAltUnitEditingPrice] = useState(null);
  const [altUnitRows, setAltUnitRows] = useState([]);
  const [altUnitEditingId, setAltUnitEditingId] = useState(null);
  const [altUnitModalError, setAltUnitModalError] = useState('');
  const [altUnitSearch, setAltUnitSearch] = useState('');
  const [showAltUnitSuggestions, setShowAltUnitSuggestions] = useState(false);
  const [focusedAltUnitSuggestionIndex, setFocusedAltUnitSuggestionIndex] = useState(-1);
  const altUnitInputRef = useRef(null);
  const altFactorRef = useRef(null);
  const altPurchaseRef = useRef(null);
  const altSaleRef = useRef(null);
  const altMrpRef = useRef(null);
  const altUnitSuggestWrapRef = useRef(null);
  const [altUnitForm, setAltUnitForm] = useState({
    altUom: '',
    factor: '',
    purchasePrice: '',
    salePrice: '',
    mrp: ''
  });
  
  // Form Data
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '', // Read-only in Add mode after selection, or populated from selection
    sizeCode: '',
    sizeName: '',
    purchasePrice: '',
    salePrice: '',
    mrp: '',
    uom: '',
    altUom: '',
    factor: ''
  });

  // Helper data for Add mode
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  const normalizeUomCode = (val) => String(val || '').trim().toLowerCase();

  const resolveUomInputToCode = useCallback((rawValue) => {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';

    const byCode = uoms.find(u => normalizeUomCode(u?.code) === normalizeUomCode(raw));
    if (byCode?.code) return String(byCode.code).trim();

    const byName = uoms.find(u => normalizeUomCode(u?.name) === normalizeUomCode(raw));
    if (byName?.code) return String(byName.code).trim();

    return raw;
  }, [uoms]);

  const sanitizeDecimalInput = (rawValue, maxDecimals) => {
    let v = String(rawValue || '');
    v = v.replace(/[^\d.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    if (v.startsWith('.')) v = `0${v}`;
    if (firstDot !== -1) {
      const [intPart, decPart = ''] = v.split('.');
      v = `${intPart}.${decPart.slice(0, Math.max(0, maxDecimals))}`;
    }
    return v;
  };

  const formatFixedDecimals = (value, decimals) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return n.toFixed(decimals);
  };

  const fetchPrices = useCallback(async (queryOverride) => {
    try {
      const currentSearch = queryOverride !== undefined ? queryOverride : searchQueryRef.current;
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `/api/prices?page=${currentPage}&size=${pageSize}`;
      if (currentSearch) {
        url += `&search=${encodeURIComponent(currentSearch)}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setPrices(response.data.prices || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalItems(response.data.totalItems || 0);
        setCurrentPage(response.data.currentPage || 0);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch prices');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch prices. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, currentPage, pageSize]);

  // Fetch Sizes for dropdown
  const fetchSizes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/sizes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSizes(response.data.sizes || []);
      }
    } catch (error) {
      console.error("Error fetching sizes", error);
    }
  }, []);

  const fetchUoms = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/uoms/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (Array.isArray(response.data)) {
        setUoms(response.data);
        return;
      }
      if (response.data?.success) {
        setUoms(response.data.uoms || []);
      }
    } catch (error) {
      console.error("Error fetching uoms", error);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchSizes();
    fetchUoms();
  }, [fetchSizes, fetchUoms]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrices(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPrices, searchQuery]);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showModal]);

  useEffect(() => {
    if (!showAltUnitModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAltUnitModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showAltUnitModal]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!Swal.isVisible?.()) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        try { Swal.clickConfirm(); } catch {}
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        try { Swal.close(); } catch {}
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    if (!showAltUnitModal) return;
    const onMouseDown = (e) => {
      const el = altUnitSuggestWrapRef.current;
      if (el && !el.contains(e.target)) {
        setShowAltUnitSuggestions(false);
        setFocusedAltUnitSuggestionIndex(-1);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showAltUnitModal]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(0);
  };

  const handleEdit = (price) => {
    const nextUom = resolveUomInputToCode(price.uom || '');
    const nextAltUom = resolveUomInputToCode(price.altUom || '');
    const shouldClearAlt = normalizeUomCode(nextUom) && normalizeUomCode(nextUom) === normalizeUomCode(nextAltUom);

    setEditingPrice(price);
    setFormData({
      itemCode: price.itemCode,
      itemName: price.itemName,
      sizeCode: price.sizeCode,
      sizeName: price.sizeName,
      purchasePrice: price.purchasePrice === null || price.purchasePrice === undefined ? '' : formatFixedDecimals(price.purchasePrice, 2),
      salePrice: price.salePrice === null || price.salePrice === undefined ? '' : formatFixedDecimals(price.salePrice, 2),
      mrp: price.mrp === null || price.mrp === undefined ? '' : formatFixedDecimals(price.mrp, 2),
      uom: nextUom,
      altUom: shouldClearAlt ? '' : nextAltUom,
      factor: shouldClearAlt
        ? ''
        : (price.factor === null || price.factor === undefined ? '' : formatFixedDecimals(price.factor, 4))
    });
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingPrice(null);
    setFormData({
      itemCode: '',
      itemName: '',
      sizeCode: '',
      sizeName: '',
      purchasePrice: '',
      salePrice: '',
      mrp: '',
      uom: '',
      altUom: '',
      factor: ''
    });
    setItemSearch('');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPrice(null);
  };

  const closeAltUnitModal = () => {
    setShowAltUnitModal(false);
    setAltUnitEditingPrice(null);
    setAltUnitRows([]);
    setAltUnitEditingId(null);
    setAltUnitModalError('');
    setAltUnitSearch('');
    setShowAltUnitSuggestions(false);
    setFocusedAltUnitSuggestionIndex(-1);
  };

  const getAltUnitSuggestionLabel = useCallback((uom) => {
    const code = String(uom?.code || '').trim();
    const name = String(uom?.name || '').trim();
    if (!name) return code;
    if (!code) return name;
    return `${name} (${code})`;
  }, []);

  const openAltUnitModal = (price) => {
    if (!price) return;
    const baseUom = resolveUomInputToCode(price.uom || '');
    const nextAltUom = resolveUomInputToCode(price.altUom || '');
    const shouldClearAlt = normalizeUomCode(baseUom) && normalizeUomCode(baseUom) === normalizeUomCode(nextAltUom);

    const safeAltCode = shouldClearAlt ? '' : nextAltUom;
    const safeFactor = shouldClearAlt
      ? ''
      : (price.factor === null || price.factor === undefined ? '' : formatFixedDecimals(price.factor, 4));

    let nextSearchLabel = safeAltCode;
    if (safeAltCode) {
      const match = (uoms || []).find(u => normalizeUomCode(u?.code) === normalizeUomCode(safeAltCode));
      if (match) nextSearchLabel = getAltUnitSuggestionLabel(match);
    }

    setAltUnitEditingPrice(price);
    setAltUnitEditingId(null);
    setAltUnitRows([]);
    setAltUnitSearch(nextSearchLabel || '');
    setAltUnitForm({
      altUom: safeAltCode,
      factor: safeFactor,
      purchasePrice: '',
      salePrice: '',
      mrp: ''
    });
    setAltUnitModalError('');
    setShowAltUnitModal(true);
    setShowAltUnitSuggestions(false);
    setFocusedAltUnitSuggestionIndex(-1);
    setTimeout(() => altUnitInputRef.current?.focus?.(), 0);
  };

  const fetchAltUnitRows = useCallback(async (price) => {
    const itemCode = String(price?.itemCode || '').trim();
    const sizeCode = String(price?.sizeCode || '').trim();
    if (!itemCode || !sizeCode) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/item-uom-map', {
        params: { itemCode, sizeCode },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data?.success) {
        const rows = Array.isArray(response.data.rows) ? response.data.rows : [];
        setAltUnitRows(rows);
      } else {
        setAltUnitRows([]);
      }
    } catch {
      setAltUnitRows([]);
    }
  }, []);

  useEffect(() => {
    if (!showAltUnitModal) return;
    if (!altUnitEditingPrice) return;
    fetchAltUnitRows(altUnitEditingPrice);
  }, [showAltUnitModal, altUnitEditingPrice, fetchAltUnitRows]);

  const filterAltUnitSuggestions = useCallback((rawQuery, baseUomCode) => {
    const q = String(rawQuery || '').trim().toLowerCase();
    const base = normalizeUomCode(baseUomCode);
    const list = Array.isArray(uoms) ? uoms : [];
    const filtered = list
      .filter(u => String(u?.code || '').trim() !== '')
      .filter(u => normalizeUomCode(u?.code) !== base)
      .filter(u => {
        if (!q) return true;
        const code = String(u?.code || '').toLowerCase();
        const name = String(u?.name || '').toLowerCase();
        return code.includes(q) || name.includes(q);
      });
    return filtered.slice(0, 50);
  }, [uoms]);

  const handleAltUnitSearchChange = (e) => {
    const value = e.target.value;
    setAltUnitSearch(value);
    setShowAltUnitSuggestions(true);
    setFocusedAltUnitSuggestionIndex(0);
    setAltUnitForm(prev => ({ ...prev, altUom: '' }));
  };

  const selectAltUnit = (uom) => {
    const code = String(uom?.code || '').trim();
    if (!code) return;
    setAltUnitForm(prev => ({ ...prev, altUom: code }));
    setAltUnitSearch(getAltUnitSuggestionLabel(uom));
    setShowAltUnitSuggestions(false);
    setFocusedAltUnitSuggestionIndex(-1);
    setTimeout(() => altFactorRef.current?.focus?.(), 0);
  };

  const startAddAltUnit = () => {
    setAltUnitEditingId(null);
    setAltUnitModalError('');
    setAltUnitSearch('');
    setAltUnitForm({
      altUom: '',
      factor: '',
      purchasePrice: '',
      salePrice: '',
      mrp: ''
    });
    setShowAltUnitSuggestions(false);
    setFocusedAltUnitSuggestionIndex(-1);
    setTimeout(() => altUnitInputRef.current?.focus?.(), 0);
  };

  const startEditAltUnitRow = (row) => {
    const baseUom = resolveUomInputToCode(altUnitEditingPrice?.uom || '');
    const altCode = resolveUomInputToCode(row?.altUom || '');
    const shouldClearAlt = normalizeUomCode(baseUom) && normalizeUomCode(baseUom) === normalizeUomCode(altCode);
    const safeAlt = shouldClearAlt ? '' : altCode;
    const match = safeAlt ? (uoms || []).find(u => normalizeUomCode(u?.code) === normalizeUomCode(safeAlt)) : null;
    setAltUnitEditingId(row?.id ?? null);
    setAltUnitModalError('');
    setAltUnitSearch(match ? getAltUnitSuggestionLabel(match) : safeAlt);
    setAltUnitForm({
      altUom: safeAlt,
      factor: row?.factor == null ? '' : formatFixedDecimals(row.factor, 4),
      purchasePrice: row?.purchasePrice == null ? '' : formatFixedDecimals(row.purchasePrice, 2),
      salePrice: row?.salePrice == null ? '' : formatFixedDecimals(row.salePrice, 2),
      mrp: row?.mrp == null ? '' : formatFixedDecimals(row.mrp, 2)
    });
    setShowAltUnitSuggestions(false);
    setFocusedAltUnitSuggestionIndex(-1);
    setTimeout(() => altFactorRef.current?.focus?.(), 0);
  };

  const syncDefaultAltToPriceMaster = useCallback(async (price, rows) => {
    const token = localStorage.getItem('token');
    const uom = resolveUomInputToCode(price?.uom || '');
    if (!price?.itemCode || !price?.sizeCode || !uom) return;

    const first = Array.isArray(rows) && rows.length ? rows[0] : null;
    const altUom = first ? resolveUomInputToCode(first.altUom || '') : '';
    const factorVal = first?.factor == null ? '' : String(first.factor);

    const payload = [{
      itemCode: price.itemCode,
      itemName: price.itemName,
      sizeCode: price.sizeCode,
      sizeName: price.sizeName,
      purchasePrice: null,
      salePrice: null,
      mrp: null,
      uom,
      altUom: altUom || null,
      factor: factorVal ? parseFloat(factorVal) : null
    }];

    await axios.post('/api/prices/save-all', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }, [resolveUomInputToCode]);

  const handleAltUnitKeyDown = (e, suggestions) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (showAltUnitSuggestions) {
        setShowAltUnitSuggestions(false);
        setFocusedAltUnitSuggestionIndex(-1);
        return;
      }
      closeAltUnitModal();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showAltUnitSuggestions) {
        setShowAltUnitSuggestions(true);
        setFocusedAltUnitSuggestionIndex(0);
        return;
      }
      setFocusedAltUnitSuggestionIndex(prev => {
        const max = suggestions.length - 1;
        const next = prev < 0 ? 0 : prev + 1;
        return Math.min(max, next);
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showAltUnitSuggestions) {
        setShowAltUnitSuggestions(true);
        setFocusedAltUnitSuggestionIndex(Math.max(0, suggestions.length - 1));
        return;
      }
      setFocusedAltUnitSuggestionIndex(prev => {
        const next = prev < 0 ? 0 : prev - 1;
        return Math.max(0, next);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAltUnitSuggestions && focusedAltUnitSuggestionIndex >= 0 && focusedAltUnitSuggestionIndex < suggestions.length) {
        selectAltUnit(suggestions[focusedAltUnitSuggestionIndex]);
        return;
      }
      const price = altUnitEditingPrice;
      const baseUom = resolveUomInputToCode(price?.uom || '');
      const resolved = resolveUomInputToCode(altUnitSearch);
      if (resolved && normalizeUomCode(resolved) !== normalizeUomCode(baseUom)) {
        setAltUnitForm(prev => ({ ...prev, altUom: resolved }));
        const match = (uoms || []).find(u => normalizeUomCode(u?.code) === normalizeUomCode(resolved));
        setAltUnitSearch(match ? getAltUnitSuggestionLabel(match) : resolved);
      } else {
        setAltUnitForm(prev => ({ ...prev, altUom: '' }));
      }
      setShowAltUnitSuggestions(false);
      setFocusedAltUnitSuggestionIndex(-1);
      setTimeout(() => altFactorRef.current?.focus?.(), 0);
    }
  };

  const handleAltUnitFormChange = (e) => {
    const { name, value } = e.target;
    setAltUnitForm(prev => {
      if (name === 'purchasePrice' || name === 'salePrice' || name === 'mrp') {
        return { ...prev, [name]: sanitizeDecimalInput(value, 2) };
      }
      if (name === 'factor') {
        return { ...prev, factor: sanitizeDecimalInput(value, 4) };
      }
      return { ...prev, [name]: value };
    });
  };

  const submitAltUnit = async () => {
    const price = altUnitEditingPrice;
    if (!price?.itemCode || !price?.sizeCode) return;

    const token = localStorage.getItem('token');
    const baseUom = resolveUomInputToCode(price.uom || '');
    const altUom = resolveUomInputToCode(altUnitForm.altUom || altUnitSearch || '');
    const factorVal = String(altUnitForm.factor || '').trim();

    if (!baseUom) {
      setAltUnitModalError('Base Unit is missing for this item.');
      return;
    }

    if (altUom && normalizeUomCode(altUom) === normalizeUomCode(baseUom)) {
      setAltUnitModalError('Alternate Unit cannot be same as Base Unit');
      return;
    }

    if (!altUom) {
      setAltUnitModalError('Alternate Unit is required');
      return;
    }

    if (!factorVal) {
      setAltUnitModalError('Factor is required');
      return;
    }

    const f = parseFloat(factorVal);
    if (!Number.isFinite(f) || f <= 0) {
      setAltUnitModalError('Factor must be greater than 0');
      return;
    }

    try {
      const response = await axios.post('/api/item-uom-map', {
        id: altUnitEditingId,
        itemCode: price.itemCode,
        sizeCode: price.sizeCode,
        baseUom,
        altUom,
        factor: parseFloat(factorVal),
        purchasePrice: altUnitForm.purchasePrice === '' ? null : parseFloat(altUnitForm.purchasePrice),
        salePrice: altUnitForm.salePrice === '' ? null : parseFloat(altUnitForm.salePrice),
        mrp: altUnitForm.mrp === '' ? null : parseFloat(altUnitForm.mrp)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        const fresh = await axios.get('/api/item-uom-map', {
          params: { itemCode: price.itemCode, sizeCode: price.sizeCode },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const rows = Array.isArray(fresh.data?.rows) ? fresh.data.rows : [];
        setAltUnitRows(rows);
        await syncDefaultAltToPriceMaster(price, rows);
        startAddAltUnit();
        Swal.fire({
          title: 'Success',
          text: 'Alternate Unit saved successfully',
          icon: 'success',
          confirmButtonText: 'OK',
          allowEnterKey: true,
          allowEscapeKey: true,
          focusConfirm: true,
          returnFocus: false
        });
        fetchPrices();
      } else {
        setAltUnitModalError(response.data.message || 'Failed to save Alternate Unit');
      }
    } catch (err) {
      setAltUnitModalError(err.response?.data?.message || 'Error saving Alternate Unit');
    }
  };

  const deleteAltUnitRow = async (row) => {
    const id = row?.id;
    const price = altUnitEditingPrice;
    if (!id || !price?.itemCode || !price?.sizeCode) return;
    const token = localStorage.getItem('token');
    const result = await Swal.fire({
      title: 'Delete Alternate Unit?',
      text: 'Do you want to delete this Alternate Unit?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
      const delRes = await axios.delete(`/api/item-uom-map/${encodeURIComponent(id)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!delRes.data?.success) {
        Swal.fire('Error', delRes.data?.message || 'Failed to delete', 'error');
        return;
      }
      const fresh = await axios.get('/api/item-uom-map', {
        params: { itemCode: price.itemCode, sizeCode: price.sizeCode },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rows = Array.isArray(fresh.data?.rows) ? fresh.data.rows : [];
      setAltUnitRows(rows);
      await syncDefaultAltToPriceMaster(price, rows);
      if (altUnitEditingId && altUnitEditingId === id) {
        startAddAltUnit();
      }
      Swal.fire({
        title: 'Success',
        text: 'Deleted successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        allowEnterKey: true,
        allowEscapeKey: true,
        focusConfirm: true,
        returnFocus: false
      });
      fetchPrices();
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'Error deleting', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'uom') {
        const nextUom = value;
        const shouldClearAlt = normalizeUomCode(prev.altUom) && normalizeUomCode(prev.altUom) === normalizeUomCode(nextUom);
        return {
          ...prev,
          uom: nextUom,
          altUom: shouldClearAlt ? '' : prev.altUom,
          factor: shouldClearAlt ? '' : prev.factor
        };
      }
      if (name === 'purchasePrice' || name === 'salePrice' || name === 'mrp') {
        return {
          ...prev,
          [name]: sanitizeDecimalInput(value, 2)
        };
      }
      if (name === 'factor') {
        return {
          ...prev,
          factor: sanitizeDecimalInput(value, 4)
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  // Item Search for Add Modal
  const handleItemSearch = async (e) => {
    const value = e.target.value;
    setItemSearch(value);
    if (value.length > 1) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/items/search?query=${value}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          setItems(response.data.items || []);
          setShowItemSuggestions(true);
        }
      } catch (error) {
        console.error("Error searching items", error);
      }
    } else {
      setItems([]);
      setShowItemSuggestions(false);
    }
  };

  const selectItem = (item) => {
    setFormData(prev => ({
      ...prev,
      itemCode: item.itemCode,
      itemName: item.itemName
    }));
    setItemSearch(`${item.itemName} (${item.itemCode})`);
    setShowItemSuggestions(false);
  };

  const handleSizeChange = (e) => {
    const selectedSizeCode = e.target.value;
    const selectedSize = sizes.find(s => s.code === selectedSizeCode);
    if (selectedSize) {
      setFormData(prev => ({
        ...prev,
        sizeCode: selectedSize.code,
        sizeName: selectedSize.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sizeCode: '',
        sizeName: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const uom = resolveUomInputToCode(formData.uom);
      const altUom = resolveUomInputToCode(formData.altUom);
      const factorVal = String(formData.factor || '').trim();

      if (!formData.itemCode || !formData.sizeCode) {
        setModalError("Item and Size are required");
        return;
      }
      if (!uom) {
        setModalError("Base Unit is required");
        return;
      }
      if ((altUom && !factorVal) || (!altUom && factorVal)) {
        setModalError("Alternate Unit and Factor must be entered together");
        return;
      }
      if (factorVal) {
        const f = parseFloat(factorVal);
        if (!Number.isFinite(f) || f <= 0) {
          setModalError("Factor must be greater than 0");
          return;
        }
      }

      const payload = [{
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        sizeCode: formData.sizeCode,
        sizeName: formData.sizeName,
        purchasePrice: formData.purchasePrice === '' ? null : parseFloat(formData.purchasePrice),
        salePrice: formData.salePrice === '' ? null : parseFloat(formData.salePrice),
        mrp: formData.mrp === '' ? null : parseFloat(formData.mrp),
        uom,
        altUom: altUom || null,
        factor: factorVal ? parseFloat(factorVal) : null
      }];

      const response = await axios.post('/api/prices/save-all', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowModal(false);
        Swal.fire('Success', 'Price saved successfully', 'success');
        fetchPrices();
      } else {
        setModalError(response.data.message || 'Failed to save price');
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error saving price');
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/prices/export', {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'prices.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      Swal.fire({
        title: 'Success',
        text: 'Prices downloaded successfully',
        icon: 'success',
        timer: 2000
      });
    } catch (error) {
      console.error('Download error', error);
      Swal.fire('Error', 'Failed to download prices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      Swal.fire({
        title: 'Processing Upload...',
        text: 'Please wait while we process the Excel file. This may take a moment.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/prices/import', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const errors = response.data.errors || [];
        
        if (errors.length > 0) {
            const csvRows = ["Error Details"];
            errors.forEach(err => {
                csvRows.push(`"${err.replace(/"/g, '""')}"`);
            });
            
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'error.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Swal.fire({
                title: 'Upload Completed with Errors',
                text: (response.data.message || 'Import processed') + '. Error log has been downloaded.',
                icon: 'warning'
            });
        } else {
            Swal.fire({
                title: 'Upload Successful',
                text: response.data.message,
                icon: 'success'
            });
        }
        fetchPrices();
      } else {
        Swal.fire('Error', response.data.message || 'Failed to import prices', 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error importing prices';
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div className="item-list-container"> {/* Reusing ItemList container class */}
      <div className="item-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)} title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Price List</h1>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by Item Name or Code..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '10px 15px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              outline: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
          />
        </div>

        <div className="header-buttons">
          {currentUser && currentUser.role === 'SUPPER' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <button 
                className="add-btn" 
                style={{ backgroundColor: '#217346', backgroundImage: 'none', marginRight: '10px' }}
                onClick={() => fileInputRef.current.click()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} />
                  Upload
                </span>
              </button>
              <button 
                className="add-btn" 
                style={{ backgroundColor: '#007bff', backgroundImage: 'none', marginRight: '10px' }}
                onClick={handleDownload}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} />
                  Download
                </span>
              </button>
            </>
          )}
          <button className="add-btn" onClick={handleAdd}>
            Add New Price
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="item-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Size</th>
              <th>Purchase Price</th>
              <th>Sale Price</th>
              <th>MRP</th>
              <th>Base Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && prices.length === 0 ? (
              <tr>
                <td colSpan="8" className="loading-cell" style={{ textAlign: 'center', padding: '20px' }}>
                  Loading...
                </td>
              </tr>
            ) : prices.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No prices found</td>
              </tr>
            ) : (
              prices.map((price) => (
                <tr key={price.id || `${price.itemCode}-${price.sizeCode}`}>
                  <td>{price.itemCode}</td>
                  <td>{price.itemName}</td>
                  <td>{price.sizeName}</td>
                  <td>{price.purchasePrice}</td>
                  <td>{price.salePrice}</td>
                  <td>{price.mrp}</td>
                  <td>{price.uom}</td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(price)}
                    >
                      Edit
                    </button>
                    <button
                      className="alt-unit-btn"
                      onClick={() => openAltUnitModal(price)}
                      type="button"
                    >
                      Alternate Unit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem', 
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}>
        <div className="pagination-info">
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} entries
        </div>
        
        <div className="pagination-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={pageSize} 
            onChange={handlePageSizeChange}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 0}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage === 0 ? '#f1f5f9' : 'white',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: '0 10px' }}>
            Page {currentPage + 1} of {Math.max(1, totalPages)}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage >= totalPages - 1}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage >= totalPages - 1 ? '#f1f5f9' : 'white',
              cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPrice ? 'Edit Price' : 'Add New Price'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item</label>
                {editingPrice ? (
                  <input type="text" value={`${formData.itemName} (${formData.itemCode})`} disabled className="form-control" />
                ) : (
                  <div className="search-container" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search Item..."
                      value={itemSearch}
                      onChange={handleItemSearch}
                      className="form-control"
                    />
                    {showItemSuggestions && items.length > 0 && (
                      <div className="search-suggestions" style={{ position: 'absolute', width: '100%', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, background: 'white', border: '1px solid #ddd' }}>
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="suggestion-item"
                            style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                            onClick={() => selectItem(item)}
                          >
                            {item.itemName} ({item.itemCode})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Size</label>
                {editingPrice ? (
                  <input type="text" value={formData.sizeName} disabled className="form-control" />
                ) : (
                  <select 
                    name="sizeCode" 
                    value={formData.sizeCode} 
                    onChange={handleSizeChange}
                    className="form-control"
                    required
                  >
                    <option value="">Select Size</option>
                    {sizes.map(size => (
                      <option key={size.id} value={size.code}>{size.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Base Unit</label>
                {uoms.length > 0 ? (
                  <select
                    name="uom"
                    value={formData.uom}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="">Select Base Unit</option>
                    {uoms
                      .filter(u => String(u?.code || '').trim() !== '')
                      .map(u => (
                        <option key={u.id || u.code} value={u.code}>{u.name ? `${u.name} (${u.code})` : u.code}</option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="uom"
                    value={formData.uom}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter Base Unit Code (e.g. PCS)"
                    maxLength={10}
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label>Purchase Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    const v = String(e.target.value || '').trim();
                    if (!v) return;
                    setFormData(prev => ({ ...prev, purchasePrice: formatFixedDecimals(v, 2) }));
                  }}
                  className="form-control numeric-input"
                />
              </div>

              <div className="form-group">
                <label>Sale Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    const v = String(e.target.value || '').trim();
                    if (!v) return;
                    setFormData(prev => ({ ...prev, salePrice: formatFixedDecimals(v, 2) }));
                  }}
                  className="form-control numeric-input"
                />
              </div>

              <div className="form-group">
                <label>MRP</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    const v = String(e.target.value || '').trim();
                    if (!v) return;
                    setFormData(prev => ({ ...prev, mrp: formatFixedDecimals(v, 2) }));
                  }}
                  className="form-control numeric-input"
                />
              </div>

              {modalError && <div className="error-message">{modalError}</div>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAltUnitModal && (
        <div className="modal-overlay alt-unit-modal">
          <div className="modal-content alt-unit-modal-content">
            <div className="modal-header">
              <h2>Alternate Unit</h2>
              <button className="close-btn" onClick={closeAltUnitModal}>&times;</button>
            </div>
            <div className="alt-unit-meta">
              <div className="alt-unit-meta-row">
                <div className="alt-unit-meta-item">
                  <span className="alt-unit-meta-label">Item</span>
                  <span className="alt-unit-meta-value">{altUnitEditingPrice?.itemName} ({altUnitEditingPrice?.itemCode})</span>
                </div>
                <div className="alt-unit-meta-item">
                  <span className="alt-unit-meta-label">Size</span>
                  <span className="alt-unit-meta-value">{altUnitEditingPrice?.sizeName}</span>
                </div>
                <div className="alt-unit-meta-item">
                  <span className="alt-unit-meta-label">Base Unit</span>
                  <span className="alt-unit-meta-value">{altUnitEditingPrice?.uom}</span>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submitAltUnit(); }}>
              <div className="alt-unit-grid-wrap">
                <table className="alt-unit-grid">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Factor</th>
                      <th>Purchase Price</th>
                      <th>Sale Price</th>
                      <th>MRP</th>
                      <th className="action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="alt-unit-input-row">
                      <td ref={altUnitSuggestWrapRef} className="alt-unit-unit-cell">
                        <input
                          ref={altUnitInputRef}
                          type="text"
                          value={altUnitSearch}
                          onChange={handleAltUnitSearchChange}
                          onFocus={() => {
                            setShowAltUnitSuggestions(true);
                            setFocusedAltUnitSuggestionIndex(0);
                          }}
                          onKeyDown={(e) => {
                            const baseUom = resolveUomInputToCode(altUnitEditingPrice?.uom || '');
                            const suggestions = filterAltUnitSuggestions(altUnitSearch, baseUom);
                            handleAltUnitKeyDown(e, suggestions);
                          }}
                          className="alt-unit-input"
                          placeholder="Unit..."
                        />
                        {showAltUnitSuggestions && (
                          (() => {
                            const baseUom = resolveUomInputToCode(altUnitEditingPrice?.uom || '');
                            const suggestions = filterAltUnitSuggestions(altUnitSearch, baseUom);
                            if (!suggestions.length) return null;
                            return (
                              <div className="alt-unit-suggestions">
                                {suggestions.map((u, idx) => (
                                  <div
                                    key={u.id || u.code || idx}
                                    className={`alt-unit-suggestion ${idx === focusedAltUnitSuggestionIndex ? 'active' : ''}`}
                                    onMouseDown={(ev) => {
                                      ev.preventDefault();
                                      selectAltUnit(u);
                                    }}
                                  >
                                    {getAltUnitSuggestionLabel(u)}
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </td>
                      <td>
                        <input
                          ref={altFactorRef}
                          type="text"
                          inputMode="decimal"
                          name="factor"
                          value={altUnitForm.factor}
                          onChange={handleAltUnitFormChange}
                          onBlur={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            setAltUnitForm(prev => ({ ...prev, factor: formatFixedDecimals(v, 4) }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            altPurchaseRef.current?.focus?.();
                          }}
                          className="alt-unit-input alt-unit-input-right"
                          placeholder="0.0000"
                        />
                      </td>
                      <td>
                        <input
                          ref={altPurchaseRef}
                          type="text"
                          inputMode="decimal"
                          name="purchasePrice"
                          value={altUnitForm.purchasePrice}
                          onChange={handleAltUnitFormChange}
                          onBlur={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            setAltUnitForm(prev => ({ ...prev, purchasePrice: formatFixedDecimals(v, 2) }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            altSaleRef.current?.focus?.();
                          }}
                          className="alt-unit-input alt-unit-input-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          ref={altSaleRef}
                          type="text"
                          inputMode="decimal"
                          name="salePrice"
                          value={altUnitForm.salePrice}
                          onChange={handleAltUnitFormChange}
                          onBlur={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            setAltUnitForm(prev => ({ ...prev, salePrice: formatFixedDecimals(v, 2) }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            altMrpRef.current?.focus?.();
                          }}
                          className="alt-unit-input alt-unit-input-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          ref={altMrpRef}
                          type="text"
                          inputMode="decimal"
                          name="mrp"
                          value={altUnitForm.mrp}
                          onChange={handleAltUnitFormChange}
                          onBlur={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            setAltUnitForm(prev => ({ ...prev, mrp: formatFixedDecimals(v, 2) }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            submitAltUnit();
                          }}
                          className="alt-unit-input alt-unit-input-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="alt-unit-action-cell">
                        <button type="submit" className="alt-unit-save-btn">
                          Add
                        </button>
                        <button type="button" className="alt-unit-clear-btn" onClick={startAddAltUnit}>
                          Clear
                        </button>
                      </td>
                    </tr>

                    {altUnitRows.length ? (
                      altUnitRows.map(r => (
                        <tr
                          key={r.id || `${r.altUom}-${r.factor}`}
                          className={`alt-unit-data-row ${altUnitEditingId && r.id === altUnitEditingId ? 'active' : ''}`}
                        >
                          <td>{r.altUom}</td>
                          <td className="numeric-cell">{r.factor}</td>
                          <td className="numeric-cell">{r.purchasePrice}</td>
                          <td className="numeric-cell">{r.salePrice}</td>
                          <td className="numeric-cell">{r.mrp}</td>
                          <td className="alt-unit-actions">
                            <button
                              type="button"
                              className="alt-unit-edit-btn"
                              onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                startEditAltUnitRow(r);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="alt-unit-del-btn"
                              onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                deleteAltUnitRow(r);
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="alt-unit-empty">No alternate units added.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {altUnitModalError && <div className="error-message">{altUnitModalError}</div>}

              <div className="modal-actions">
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceManagement;
