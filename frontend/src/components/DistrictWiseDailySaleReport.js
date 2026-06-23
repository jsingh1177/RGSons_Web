import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import Swal from 'sweetalert2';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';
import DateInputButton from './DateInputButton';
import { formatDateDDMMYYYY } from './dateUtils';

const DistrictWiseDailySaleReport = () => {
  const navigate = useNavigate();
  const defaultBackPath = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'STORE USER' ? '/store-dashboard' : '/ho-reports';
    } catch {
      return '/ho-reports';
    }
  }, []);
  const canItemMerge = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'SUPPER' || u?.role === 'ADMIN';
    } catch {
      return false;
    }
  }, []);
  const filterStorageKey = 'RG_filters:district-wise-daily-sale';
  const initialFilters = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaults = {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };

    const params = new URLSearchParams(window.location.search || '');
    const fromUrl = {
      startDate: String(params.get('startDate') || '').trim(),
      endDate: String(params.get('endDate') || '').trim(),
      districtQuery: String(params.get('district') || '').trim(),
      selectedStoreName: String(params.get('storeName') || '').trim(),
      storeSearchInput: String(params.get('storeInput') || '').trim(),
      selectedPartyName: String(params.get('partyName') || '').trim(),
      partySearchInput: String(params.get('partyInput') || '').trim(),
      selectedSaleLedger: String(params.get('saleLedger') || '').trim(),
      saleLedgerSearchInput: String(params.get('saleLedgerInput') || '').trim()
    };

    const hasUrl = Object.values(fromUrl).some(v => v);
    let stored = null;
    if (!hasUrl) {
      try {
        const raw = localStorage.getItem(filterStorageKey);
        if (raw) stored = JSON.parse(raw);
      } catch {
        stored = null;
      }
    }

    const base = hasUrl ? fromUrl : (stored || {});
    const startDate = (base.startDate && /^\d{4}-\d{2}-\d{2}$/.test(String(base.startDate)))
      ? String(base.startDate)
      : defaults.startDate;
    const endDate = (base.endDate && /^\d{4}-\d{2}-\d{2}$/.test(String(base.endDate)))
      ? String(base.endDate)
      : defaults.endDate;
    const districtQuery = String(base.districtQuery || base.district || '').trim();
    const storeSearchInput = String(base.storeSearchInput || base.storeInput || '').trim();
    let selectedStoreName = String(base.selectedStoreName || base.storeName || '').trim();
    if (!selectedStoreName && storeSearchInput) {
      selectedStoreName = String(storeSearchInput.split('(')[0] || '').trim();
    }
    const partySearchInput = String(base.partySearchInput || base.partyInput || '').trim();
    let selectedPartyName = String(base.selectedPartyName || base.partyName || '').trim();
    if (!selectedPartyName && partySearchInput) {
      selectedPartyName = String(partySearchInput.split('(')[0] || '').trim();
    }
    const saleLedgerSearchInput = String(base.saleLedgerSearchInput || base.saleLedgerInput || '').trim();
    let selectedSaleLedger = String(base.selectedSaleLedger || base.saleLedger || '').trim();
    if (!selectedSaleLedger && saleLedgerSearchInput) {
      selectedSaleLedger = String(saleLedgerSearchInput.split('(')[0] || '').trim();
    }

    return { startDate, endDate, districtQuery, storeSearchInput, selectedStoreName, partySearchInput, selectedPartyName, saleLedgerSearchInput, selectedSaleLedger };
  }, []);

  const [startDate, setStartDate] = useState(() => initialFilters.startDate);
  const [endDate, setEndDate] = useState(() => initialFilters.endDate);
  const [districtQuery, setDistrictQuery] = useState(() => initialFilters.districtQuery);
  const [storeSearchInput, setStoreSearchInput] = useState(() => initialFilters.storeSearchInput);
  const [selectedStoreName, setSelectedStoreName] = useState(() => initialFilters.selectedStoreName);
  const [partySearchInput, setPartySearchInput] = useState(() => initialFilters.partySearchInput);
  const [selectedPartyName, setSelectedPartyName] = useState(() => initialFilters.selectedPartyName);
  const [saleLedgerSearchInput, setSaleLedgerSearchInput] = useState(() => initialFilters.saleLedgerSearchInput);
  const [selectedSaleLedger, setSelectedSaleLedger] = useState(() => initialFilters.selectedSaleLedger);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [ledMasterOptions, setLedMasterOptions] = useState([]);
  const [districtResults, setDistrictResults] = useState([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [focusedDistrictIndex, setFocusedDistrictIndex] = useState(-1);
  const [storeResults, setStoreResults] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
  const [partyResults, setPartyResults] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [focusedPartyIndex, setFocusedPartyIndex] = useState(-1);
  const [saleLedgerResults, setSaleLedgerResults] = useState([]);
  const [showSaleLedgerSuggestions, setShowSaleLedgerSuggestions] = useState(false);
  const [focusedSaleLedgerIndex, setFocusedSaleLedgerIndex] = useState(-1);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalQuery, setStoreModalQuery] = useState('');
  const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
  const storeModalSearchRef = useRef(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');
  const [itemMergeOpen, setItemMergeOpen] = useState(false);
  const [mergeFromDate, setMergeFromDate] = useState('');
  const [mergeToDate, setMergeToDate] = useState('');
  const [mergeSizes, setMergeSizes] = useState([]);
  const [sourceItemInput, setSourceItemInput] = useState('');
  const [sourceItemCode, setSourceItemCode] = useState('');
  const [sourceItemResults, setSourceItemResults] = useState([]);
  const [showSourceItemSuggestions, setShowSourceItemSuggestions] = useState(false);
  const [focusedSourceItemIndex, setFocusedSourceItemIndex] = useState(-1);
  const [targetItemInput, setTargetItemInput] = useState('');
  const [targetItemCode, setTargetItemCode] = useState('');
  const [targetItemResults, setTargetItemResults] = useState([]);
  const [showTargetItemSuggestions, setShowTargetItemSuggestions] = useState(false);
  const [focusedTargetItemIndex, setFocusedTargetItemIndex] = useState(-1);
  const [sourceSizeCode, setSourceSizeCode] = useState('');
  const [targetSizeCode, setTargetSizeCode] = useState('');
  const [mergeStoreSearchInput, setMergeStoreSearchInput] = useState('');
  const [mergeStoreCode, setMergeStoreCode] = useState('');
  const [mergeStoreResults, setMergeStoreResults] = useState([]);
  const [showMergeStoreSuggestions, setShowMergeStoreSuggestions] = useState(false);
  const [focusedMergeStoreIndex, setFocusedMergeStoreIndex] = useState(-1);
  const [includeOpening, setIncludeOpening] = useState(true);
  const [includePurchase, setIncludePurchase] = useState(true);
  const [includeReturn, setIncludeReturn] = useState(false);
  const [includeSale, setIncludeSale] = useState(true);
  const [includeTransfer, setIncludeTransfer] = useState(true);
  const [mergeSubmitting, setMergeSubmitting] = useState(false);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const districtInputRef = useRef(null);
  const storeInputRef = useRef(null);
  const partyInputRef = useRef(null);
  const saleLedgerInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const autoSearchDoneRef = useRef(false);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);
  const sourceItemDebounceRef = useRef(null);
  const targetItemDebounceRef = useRef(null);
  const sourceItemAbortRef = useRef(null);
  const targetItemAbortRef = useRef(null);
  const mergeStoreInputRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const [expandedDateKeys, setExpandedDateKeys] = useState(() => new Set());
  const hiddenStorageKey = useMemo(() => {
    const sd = String(startDate || '').trim();
    const ed = String(endDate || '').trim();
    const dist = String(districtQuery || '').trim();
    const st = String(selectedStoreName || '').trim();
    const pt = String(selectedPartyName || '').trim();
    const sl = String(selectedSaleLedger || '').trim();
    return `RG_hiddenRows_districtWiseDailySale:${sd}:${ed}:${dist}:${st}:${pt}:${sl}`;
  }, [districtQuery, endDate, selectedPartyName, selectedSaleLedger, selectedStoreName, startDate]);
  const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());

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
        if (voucherModalOpen) return;
        if (itemMergeOpen) return;
        setShowChangePeriodModal(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (showStoreModal) return;
        if (showChangePeriodModal) return;
        if (voucherModalOpen) return;
        if (itemMergeOpen) return;
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
  }, [itemMergeOpen, selectedStoreName, showChangePeriodModal, showStoreModal, storeModalStores, voucherModalOpen]);


  useEffect(() => {
    const payload = { startDate, endDate, districtQuery, storeSearchInput, selectedStoreName, partySearchInput, selectedPartyName, saleLedgerSearchInput, selectedSaleLedger };
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(payload));
    } catch {}

    const params = new URLSearchParams(window.location.search || '');
    const setOrDelete = (k, v) => {
      const value = String(v || '').trim();
      if (value) params.set(k, value);
      else params.delete(k);
    };
    setOrDelete('startDate', startDate);
    setOrDelete('endDate', endDate);
    setOrDelete('district', districtQuery);
    setOrDelete('storeName', selectedStoreName);
    setOrDelete('storeInput', storeSearchInput);
    setOrDelete('partyName', selectedPartyName);
    setOrDelete('partyInput', partySearchInput);
    setOrDelete('saleLedger', selectedSaleLedger);
    setOrDelete('saleLedgerInput', saleLedgerSearchInput);
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [districtQuery, endDate, filterStorageKey, partySearchInput, saleLedgerSearchInput, selectedPartyName, selectedSaleLedger, selectedStoreName, startDate, storeSearchInput]);

  useEffect(() => {
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

  useEffect(() => {
    if (focusedPartyIndex >= 0 && showPartySuggestions) {
      const el = document.getElementById(`suggestion-party-${focusedPartyIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedPartyIndex, showPartySuggestions]);

  useEffect(() => {
    if (focusedSaleLedgerIndex >= 0 && showSaleLedgerSuggestions) {
      const el = document.getElementById(`suggestion-sale-ledger-${focusedSaleLedgerIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedSaleLedgerIndex, showSaleLedgerSuggestions]);

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

  const filterLedMastersForSearch = (value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(ledMasterOptions) ? ledMasterOptions : [];
    if (!v) return all.slice(0, 50);
    return all.filter(l => {
      const name = String(l?.name || '').toLowerCase();
      const code = String(l?.code || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  };

  const selectParty = (ledger) => {
    if (!ledger) return;
    setSelectedPartyName(String(ledger?.name || '').trim());
    setPartySearchInput(`${String(ledger?.name || '').trim()} (${String(ledger?.code || '').trim()})`.trim());
    setShowPartySuggestions(false);
    setFocusedPartyIndex(-1);
  };

  const selectSaleLedger = (ledger) => {
    if (!ledger) return;
    setSelectedSaleLedger(String(ledger?.name || '').trim());
    setSaleLedgerSearchInput(`${String(ledger?.name || '').trim()} (${String(ledger?.code || '').trim()})`.trim());
    setShowSaleLedgerSuggestions(false);
    setFocusedSaleLedgerIndex(-1);
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

  const handlePartyInputChange = (e) => {
    const value = e.target.value;
    setPartySearchInput(value);
    setSelectedPartyName('');
    setFocusedPartyIndex(-1);
    if (!value) {
      setPartyResults([]);
      setShowPartySuggestions(false);
      return;
    }
    const results = filterLedMastersForSearch(value);
    setPartyResults(results);
    setShowPartySuggestions(true);
    setFocusedPartyIndex(results.length ? 0 : -1);
  };

  const handlePartyInputFocus = () => {
    const results = filterLedMastersForSearch(partySearchInput);
    setPartyResults(results);
    setShowPartySuggestions(true);
    setFocusedPartyIndex(results.length ? 0 : -1);
  };

  const handlePartyKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showPartySuggestions && focusedPartyIndex >= 0 && partyResults[focusedPartyIndex]) {
        selectParty(partyResults[focusedPartyIndex]);
      } else {
        setShowPartySuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedPartyIndex(prev => prev < partyResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedPartyIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPartySuggestions(false);
      setFocusedPartyIndex(-1);
    }
  };

  const handleSaleLedgerInputChange = (e) => {
    const value = e.target.value;
    setSaleLedgerSearchInput(value);
    setSelectedSaleLedger('');
    setFocusedSaleLedgerIndex(-1);
    if (!value) {
      setSaleLedgerResults([]);
      setShowSaleLedgerSuggestions(false);
      return;
    }
    const results = filterLedMastersForSearch(value);
    setSaleLedgerResults(results);
    setShowSaleLedgerSuggestions(true);
    setFocusedSaleLedgerIndex(results.length ? 0 : -1);
  };

  const handleSaleLedgerInputFocus = () => {
    const results = filterLedMastersForSearch(saleLedgerSearchInput);
    setSaleLedgerResults(results);
    setShowSaleLedgerSuggestions(true);
    setFocusedSaleLedgerIndex(results.length ? 0 : -1);
  };

  const handleSaleLedgerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSaleLedgerSuggestions && focusedSaleLedgerIndex >= 0 && saleLedgerResults[focusedSaleLedgerIndex]) {
        selectSaleLedger(saleLedgerResults[focusedSaleLedgerIndex]);
      } else {
        setShowSaleLedgerSuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSaleLedgerIndex(prev => prev < saleLedgerResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSaleLedgerIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSaleLedgerSuggestions(false);
      setFocusedSaleLedgerIndex(-1);
    }
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

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const [storeRes, ledMasterRes] = await Promise.all([
          axios.get('/api/stores', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/led-masters', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const stores = Array.isArray(storeRes.data)
          ? storeRes.data
          : (storeRes.data?.stores || []);

        const ledMasters = Array.isArray(ledMasterRes.data)
          ? ledMasterRes.data
          : (ledMasterRes.data?.ledMasters || []);

        const normalizedLedMasters = (Array.isArray(ledMasters) ? ledMasters : [])
          .map(l => ({
            code: String(l?.code || '').trim(),
            name: String(l?.name || '').trim()
          }))
          .filter(l => l.code || l.name)
          .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

        const districts = new Set();

        for (const s of stores) {
          const d = String(s?.district || '').trim();
          if (d) districts.add(d);
        }

        setDistrictOptions(Array.from(districts).sort((a, b) => a.localeCompare(b)));
        setStoreOptions(Array.isArray(stores) ? stores : []);
        setLedMasterOptions(normalizedLedMasters);
      } catch {
        setDistrictOptions([]);
        setStoreOptions([]);
        setLedMasterOptions([]);
      }
    };
    fetchFilterOptions();
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
    return formatDateDDMMYYYY(iso);
  };

  const formatAmount = (v) => {
    const n = Number(v || 0);
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const filteredRows = useMemo(() => {
    const dq = (districtQuery || '').trim().toLowerCase();
    const sq = (selectedStoreName || storeSearchInput || '').trim().toLowerCase();
    const pq = (selectedPartyName || partySearchInput || '').trim().toLowerCase();
    const slq = (selectedSaleLedger || saleLedgerSearchInput || '').trim().toLowerCase();
    if (!dq && !sq && !pq && !slq) return rows || [];
    return (rows || []).filter(r => {
      const districtName = String(r?.districtName || '').toLowerCase();
      const storeName = String(r?.storeName || '').toLowerCase();
      const storeCode = String(r?.storeCode || '').toLowerCase();
      const partyName = String(r?.partyName || '').toLowerCase();
      const saleLedger = String(r?.saleLedger || '').toLowerCase();
      const okDistrict = !dq || districtName.includes(dq);
      const okStore = !sq || storeName.includes(sq) || storeCode.includes(sq);
      const okParty = !pq || partyName.includes(pq);
      const okSaleLedger = !slq || saleLedger.includes(slq);
      return okDistrict && okStore && okParty && okSaleLedger;
    });
  }, [districtQuery, partySearchInput, rows, saleLedgerSearchInput, selectedPartyName, selectedSaleLedger, storeSearchInput, selectedStoreName]);

  const visibleDetails = useMemo(() => {
    const hidden = hiddenRowKeys || new Set();
    const hiddenDates = new Set();
    hidden.forEach((k) => {
      const s = String(k || '');
      if (s.startsWith('g|')) hiddenDates.add(s.slice(2));
    });
    return (filteredRows || []).map((r, idx) => {
      const bill = String(r?.billNumber || '').trim();
      const storeCode = String(r?.storeCode || '').trim();
      const date = String(r?.date || '').trim();
      const billKey = bill || `idx${idx}`;
      return { row: r, idx, rowKey: `dws:${storeCode}:${billKey}:${date}` };
    }).filter((r) => !hidden.has(r.rowKey) && !hiddenDates.has(String(r?.row?.date || '').trim()));
  }, [filteredRows, hiddenRowKeys]);

  const dateGroupedRows = useMemo(() => {
    const map = new Map();
    for (const r of visibleDetails || []) {
      const dateKey = String(r?.row?.date || '').trim();
      if (!dateKey) continue;
      if (!map.has(dateKey)) {
        map.set(dateKey, { dateKey, rows: [], totals: { qty: 0, sale: 0, other: 0, exp: 0, total: 0, tender: 0 } });
      }
      const g = map.get(dateKey);
      g.rows.push(r);
      g.totals.qty += Number(r?.row?.totalQty || 0);
      g.totals.sale += Number(r?.row?.saleAmount || 0);
      g.totals.other += Number(r?.row?.otherSale || 0);
      g.totals.exp += Number(r?.row?.expense || 0);
      g.totals.total += Number(r?.row?.totalSale || 0);
      g.totals.tender += Number(r?.row?.tenderAmount || 0);
    }
    const out = Array.from(map.values());
    out.sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));
    return out;
  }, [visibleDetails]);

  const flattenedRows = useMemo(() => {
    const out = [];
    const hidden = hiddenRowKeys || new Set();
    for (const g of dateGroupedRows) {
      const groupKey = `g|${g.dateKey}`;
      if (hidden.has(groupKey)) continue;
      out.push({ kind: 'group', key: groupKey, dateKey: g.dateKey, totals: g.totals });
      if (!expandedDateKeys.has(g.dateKey)) continue;
      for (const r of g.rows) {
        out.push({ kind: 'detail', key: r.rowKey, dateKey: g.dateKey, row: r.row, rowKey: r.rowKey });
      }
    }
    return out;
  }, [dateGroupedRows, expandedDateKeys, hiddenRowKeys]);

  const grandTotals = useMemo(() => {
    return (visibleDetails || []).reduce((acc, r) => {
      acc.qty += Number(r?.row?.totalQty || 0);
      acc.sale += Number(r?.row?.saleAmount || 0);
      acc.other += Number(r?.row?.otherSale || 0);
      acc.exp += Number(r?.row?.expense || 0);
      acc.total += Number(r?.row?.totalSale || 0);
      acc.tender += Number(r?.row?.tenderAmount || 0);
      return acc;
    }, { qty: 0, sale: 0, other: 0, exp: 0, total: 0, tender: 0 });
  }, [visibleDetails]);

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
    setSelectedRowKeys(new Set());
    setFocusedRowIndex(flattenedRows.length > 0 ? 0 : -1);
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
    if (!flattenedRows || flattenedRows.length === 0) return;
    const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
    const entry = flattenedRows[idx];
    if (!entry) return;
    const rowKey = entry.kind === 'group' ? `g|${entry.dateKey}` : entry.rowKey;
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
    try {
      localStorage.removeItem(hiddenStorageKey);
    } catch {}
  }, [hiddenStorageKey]);

  const toggleExpandCollapseAll = useCallback(() => {
    const hidden = hiddenRowKeys || new Set();
    const visibleDates = (dateGroupedRows || [])
      .map((g) => String(g?.dateKey || '').trim())
      .filter(Boolean)
      .filter((d) => !hidden.has(`g|${d}`));

    setExpandedDateKeys((prev) => {
      const current = prev || new Set();
      const allExpanded = visibleDates.length > 0 && visibleDates.every((d) => current.has(d));
      return allExpanded ? new Set() : new Set(visibleDates);
    });
  }, [dateGroupedRows, hiddenRowKeys]);

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

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/district-wise-daily', {
        params: {
          startDate,
          endDate,
          district: districtQuery,
          storeName: selectedStoreName || storeSearchInput || '',
          partyName: selectedPartyName || partySearchInput || '',
          saleLedger: selectedSaleLedger || saleLedgerSearchInput || ''
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch (e) {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [districtQuery, endDate, partySearchInput, saleLedgerSearchInput, selectedPartyName, selectedSaleLedger, startDate, storeSearchInput, selectedStoreName]);
  searchActionRef.current = fetchData;

  useEffect(() => {
    if (autoSearchDoneRef.current) return;
    if (!startDate || !endDate) return;
    autoSearchDoneRef.current = true;
    fetchData();
  }, [endDate, fetchData, startDate]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate, selectedStoreName, selectedPartyName, selectedSaleLedger]);

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
      invoices.map((no) => axios.delete(`/api/sales/${encodeURIComponent(no)}`, { headers }))
    );

    const failed = outcomes.filter((o) => o.status === 'rejected').length;
    const success = invoices.length - failed;

    if (failed === 0) {
      await Swal.fire({ title: 'Deleted', text: `${success} voucher(s) deleted.`, icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      await Swal.fire({ title: 'Completed', text: `${success} deleted, ${failed} failed.`, icon: failed === invoices.length ? 'error' : 'warning' });
    }

    setSelectedRowKeys(new Set());
    fetchData();
  }, [fetchData, flattenedRows, selectedRowKeys]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (voucherModalOpen || itemMergeOpen) return;
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
        const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=duplicate`;
        openVoucherModal(href, invoiceNo ? `SALE (DUP) - ${invoiceNo}` : 'SALE (DUP)');
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
  }, [deleteSelectedVouchers, flattenedRows, focusedRowIndex, hideFocusedRow, itemMergeOpen, toggleExpandCollapseAll, unhideAllRows, voucherModalOpen]);

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/sales/district-wise-daily/export', {
        params: {
          startDate,
          endDate,
          district: districtQuery,
          storeName: selectedStoreName || storeSearchInput || '',
          partyName: selectedPartyName || partySearchInput || '',
          saleLedger: selectedSaleLedger || saleLedgerSearchInput || ''
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `district_wise_daily_sale_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Failed to download excel');
    }
  };
  exportActionRef.current = handleDownload;

  const openVoucherModal = (href, title) => {
    if (!href) return;
    const sep = href.includes('?') ? '&' : '?';
    setVoucherModalHref(`${href}${sep}_ts=${Date.now()}`);
    setVoucherModalTitle(title || 'Sale Voucher');
    setVoucherModalOpen(true);
  };

  const closeVoucherModal = () => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
  };

  const openItemMergeModal = () => {
    if (!canItemMerge) return;
    setMergeFromDate(startDate || '');
    setMergeToDate(endDate || '');
    setMergeStoreSearchInput('');
    setMergeStoreCode('');
    setMergeStoreResults([]);
    setShowMergeStoreSuggestions(false);
    setFocusedMergeStoreIndex(-1);
    setSourceItemInput('');
    setSourceItemCode('');
    setSourceItemResults([]);
    setShowSourceItemSuggestions(false);
    setFocusedSourceItemIndex(-1);
    setTargetItemInput('');
    setTargetItemCode('');
    setTargetItemResults([]);
    setShowTargetItemSuggestions(false);
    setFocusedTargetItemIndex(-1);
    setSourceSizeCode('');
    setTargetSizeCode('');
    setIncludeOpening(true);
    setIncludePurchase(true);
    setIncludeReturn(false);
    setIncludeSale(true);
    setIncludeTransfer(true);
    setItemMergeOpen(true);
  };

  const closeItemMergeModal = () => {
    setItemMergeOpen(false);
  };

  const fetchMergeSizes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/sizes/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (res.data?.success) {
        const list = Array.isArray(res.data.sizes) ? res.data.sizes : [];
        setMergeSizes(list);
        return;
      }
      setMergeSizes([]);
    } catch {
      setMergeSizes([]);
    }
  }, []);

  useEffect(() => {
    if (!itemMergeOpen) return;
    fetchMergeSizes();
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeItemMergeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fetchMergeSizes, itemMergeOpen]);

  const filterMergeStoresForSearch = useCallback((value) => {
    const v = String(value || '').trim().toLowerCase();
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    if (!v) return all.slice(0, 50);
    return all.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    }).slice(0, 50);
  }, [storeOptions]);

  const applyMergeStore = (store) => {
    if (!store?.storeCode) return;
    setMergeStoreCode(String(store.storeCode || '').trim());
    setMergeStoreSearchInput(`${String(store?.storeName || '').trim()} (${String(store?.storeCode || '').trim()})`.trim());
    setShowMergeStoreSuggestions(false);
    setFocusedMergeStoreIndex(-1);
  };

  const handleMergeStoreInputChange = (e) => {
    const value = e.target.value;
    setMergeStoreSearchInput(value);
    setMergeStoreCode('');
    setFocusedMergeStoreIndex(-1);
    if (!value) {
      setMergeStoreResults([]);
      setShowMergeStoreSuggestions(false);
      return;
    }
    const results = filterMergeStoresForSearch(value);
    setMergeStoreResults(results);
    setShowMergeStoreSuggestions(true);
    setFocusedMergeStoreIndex(results.length ? 0 : -1);
  };

  const handleMergeStoreInputFocus = () => {
    const results = filterMergeStoresForSearch(mergeStoreSearchInput);
    setMergeStoreResults(results);
    setShowMergeStoreSuggestions(true);
    setFocusedMergeStoreIndex(results.length ? 0 : -1);
  };

  const handleMergeStoreKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showMergeStoreSuggestions && focusedMergeStoreIndex >= 0 && mergeStoreResults[focusedMergeStoreIndex]) {
        applyMergeStore(mergeStoreResults[focusedMergeStoreIndex]);
      } else {
        setShowMergeStoreSuggestions(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedMergeStoreIndex(prev => prev < mergeStoreResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedMergeStoreIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMergeStoreSuggestions(false);
      setFocusedMergeStoreIndex(-1);
    }
  };

  const runItemSearch = async (query, kind) => {
    const q = String(query || '').trim();
    if (q.length < 2) {
      if (kind === 'source') {
        setSourceItemResults([]);
        setShowSourceItemSuggestions(false);
        setFocusedSourceItemIndex(-1);
      } else {
        setTargetItemResults([]);
        setShowTargetItemSuggestions(false);
        setFocusedTargetItemIndex(-1);
      }
      return;
    }

    const token = localStorage.getItem('token');
    const abortRef = kind === 'source' ? sourceItemAbortRef : targetItemAbortRef;
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = new AbortController();

    try {
      const res = await axios.get(`/api/items/search?query=${encodeURIComponent(q)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: abortRef.current.signal
      });
      const items = res.data?.success && Array.isArray(res.data.items) ? res.data.items : [];
      if (kind === 'source') {
        setSourceItemResults(items.slice(0, 50));
        setShowSourceItemSuggestions(true);
        setFocusedSourceItemIndex(items.length ? 0 : -1);
      } else {
        setTargetItemResults(items.slice(0, 50));
        setShowTargetItemSuggestions(true);
        setFocusedTargetItemIndex(items.length ? 0 : -1);
      }
    } catch (e) {
      if (axios.isCancel?.(e)) return;
      if (String(e?.name || '') === 'CanceledError') return;
      if (kind === 'source') {
        setSourceItemResults([]);
        setShowSourceItemSuggestions(false);
        setFocusedSourceItemIndex(-1);
      } else {
        setTargetItemResults([]);
        setShowTargetItemSuggestions(false);
        setFocusedTargetItemIndex(-1);
      }
    }
  };

  const handleSourceItemChange = (e) => {
    const value = e.target.value;
    setSourceItemInput(value);
    setSourceItemCode('');
    if (sourceItemDebounceRef.current) window.clearTimeout(sourceItemDebounceRef.current);
    sourceItemDebounceRef.current = window.setTimeout(() => runItemSearch(value, 'source'), 250);
  };

  const handleTargetItemChange = (e) => {
    const value = e.target.value;
    setTargetItemInput(value);
    setTargetItemCode('');
    if (targetItemDebounceRef.current) window.clearTimeout(targetItemDebounceRef.current);
    targetItemDebounceRef.current = window.setTimeout(() => runItemSearch(value, 'target'), 250);
  };

  const selectSourceItem = (item) => {
    if (!item) return;
    setSourceItemCode(String(item.itemCode || '').trim());
    setSourceItemInput(String(item.itemName || item.itemCode || '').trim());
    setShowSourceItemSuggestions(false);
    setFocusedSourceItemIndex(-1);
  };

  const selectTargetItem = (item) => {
    if (!item) return;
    setTargetItemCode(String(item.itemCode || '').trim());
    setTargetItemInput(String(item.itemName || item.itemCode || '').trim());
    setShowTargetItemSuggestions(false);
    setFocusedTargetItemIndex(-1);
  };

  const handleSourceItemKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSourceItemIndex(prev => (prev < sourceItemResults.length - 1 ? prev + 1 : prev));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSourceItemIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSourceItemSuggestions && focusedSourceItemIndex >= 0 && sourceItemResults[focusedSourceItemIndex]) {
        selectSourceItem(sourceItemResults[focusedSourceItemIndex]);
      } else {
        setShowSourceItemSuggestions(false);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSourceItemSuggestions(false);
      setFocusedSourceItemIndex(-1);
    }
  };

  const handleTargetItemKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedTargetItemIndex(prev => (prev < targetItemResults.length - 1 ? prev + 1 : prev));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedTargetItemIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showTargetItemSuggestions && focusedTargetItemIndex >= 0 && targetItemResults[focusedTargetItemIndex]) {
        selectTargetItem(targetItemResults[focusedTargetItemIndex]);
      } else {
        setShowTargetItemSuggestions(false);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowTargetItemSuggestions(false);
      setFocusedTargetItemIndex(-1);
    }
  };

  const handleMergeSubmit = async () => {
    const fd = String(mergeFromDate || '').trim();
    const td = String(mergeToDate || '').trim();
    const srcItem = String(sourceItemCode || '').trim();
    const tgtItem = String(targetItemCode || '').trim();
    const srcSize = String(sourceSizeCode || '').trim();
    const tgtSize = String(targetSizeCode || '').trim();
    const sc = String(mergeStoreCode || '').trim();

    if (!fd || !td) {
      Swal.fire({ icon: 'warning', title: 'Missing Date', text: 'Please select From Date and To Date' });
      return;
    }
    if (!srcItem || !tgtItem) {
      Swal.fire({ icon: 'warning', title: 'Missing Item', text: 'Please select Source Item and Target Item' });
      return;
    }
    if (!srcSize || !tgtSize) {
      Swal.fire({ icon: 'warning', title: 'Missing Size', text: 'Please select Source Size and Target Size' });
      return;
    }
    if (!includeOpening && !includePurchase && !includeReturn && !includeSale && !includeTransfer) {
      Swal.fire({ icon: 'warning', title: 'Select Option', text: 'Please select at least one option' });
      return;
    }

    const selectedParts = [];
    if (includeOpening) selectedParts.push('Opening');
    if (includePurchase) selectedParts.push('Purchase');
    if (includeReturn) selectedParts.push('Return');
    if (includeSale) selectedParts.push('Sale');
    if (includeTransfer) selectedParts.push('Transfer');
    const selectedText = selectedParts.length ? selectedParts.join(', ') : '-';

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Confirm Item Merge',
      html: `
        <div style="text-align:left;font-size:13px;line-height:1.5">
          <div><b>Date:</b> ${fd} to ${td}</div>
          <div><b>Store:</b> ${sc ? sc : 'ALL'}</div>
          <hr style="margin:10px 0;border:none;border-top:1px solid #e5e7eb" />
          <div><b>Source:</b> ${srcItem} / ${srcSize}</div>
          <div><b>Target:</b> ${tgtItem} / ${tgtSize}</div>
          <hr style="margin:10px 0;border:none;border-top:1px solid #e5e7eb" />
          <div><b>Update:</b> ${selectedText}</div>
          ${includeReturn ? '<div style="margin-top:6px;color:#b45309"><b>Note:</b> Return is not applied (ignored).</div>' : ''}
          <div style="margin-top:10px;color:#b91c1c"><b>Warning:</b> This will update existing vouchers/transactions.</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Merge',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true
    });
    if (!confirm.isConfirmed) return;

    setMergeSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        fromDate: fd,
        toDate: td,
        storeCode: sc || undefined,
        sourceItemCode: srcItem,
        targetItemCode: tgtItem,
        sourceSizeCode: srcSize,
        targetSizeCode: tgtSize,
        includeOpening,
        includePurchase,
        includeReturn,
        includeSale,
        includeTransfer
      };

      const res = await axios.post('/api/items/merge', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (!res.data?.success) {
        Swal.fire({ icon: 'error', title: 'Failed', text: String(res.data?.message || 'Failed to merge') });
        return;
      }

      const d = res.data?.data || {};
      const totalUpdated = Number(d.totalUpdated || 0);
      Swal.fire({ icon: 'success', title: 'Done', text: `Updated Rows: ${totalUpdated}` });
      closeItemMergeModal();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(e?.response?.data?.message || e?.message || 'Error merging item') });
    } finally {
      setMergeSubmitting(false);
    }
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
    <div className="report-container stock-ledger-container stock-ledger-report district-wise-daily-sale-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>Back</button>
        <h1 className="stock-ledger-title">District Wise Daily Sale</h1>
        <div className="stock-ledger-header-actions">
          {canItemMerge && (
            <button
              className="export-btn stock-ledger-export-btn"
              type="button"
              onClick={openItemMergeModal}
              disabled={loading}
              style={{ backgroundColor: '#0ea5e9' }}
            >
              <span>Item Merge</span>
            </button>
          )}
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
          <label>Party Name</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={partyInputRef}
              value={partySearchInput}
              onChange={handlePartyInputChange}
              onFocus={handlePartyInputFocus}
              onKeyDown={handlePartyKeyDown}
              onBlur={() => {
                window.setTimeout(() => setShowPartySuggestions(false), 150);
              }}
              placeholder="Search party code or name"
              disabled={loading}
              autoComplete="off"
            />
            {showPartySuggestions && partyResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {partyResults.map((p, idx) => (
                  <div
                    key={`${String(p?.code || idx)}-${idx}`}
                    id={`suggestion-party-${idx}`}
                    onMouseDown={() => selectParty(p)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedPartyIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
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
          <label>Sale Ledger</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={saleLedgerInputRef}
              value={saleLedgerSearchInput}
              onChange={handleSaleLedgerInputChange}
              onFocus={handleSaleLedgerInputFocus}
              onKeyDown={handleSaleLedgerKeyDown}
              onBlur={() => {
                window.setTimeout(() => setShowSaleLedgerSuggestions(false), 150);
              }}
              placeholder="Search sale ledger code or name"
              disabled={loading}
              autoComplete="off"
            />
            {showSaleLedgerSuggestions && saleLedgerResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {saleLedgerResults.map((s, idx) => (
                  <div
                    key={`${String(s?.code || idx)}-${idx}`}
                    id={`suggestion-sale-ledger-${idx}`}
                    onMouseDown={() => selectSaleLedger(s)}
                    style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedSaleLedgerIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{String(s?.name || '')}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                      {String(s?.code || '')}
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
              {startDate ? formatDateDDMMYYYY(startDate) : 'Select Date'}
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
              {endDate ? formatDateDDMMYYYY(endDate) : 'Select Date'}
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
              <th>DISTRICT NAME</th>
              <th>STORE CODE</th>
              <th>STORE NAME</th>
              <th>PARTY NAME</th>
              <th>SALE LEDGER</th>
              <th>DATE</th>
              <th>BILL NUMBER</th>
              <th style={{ textAlign: 'right' }}>TOTAL QTY</th>
              <th style={{ textAlign: 'right' }}>SALE AMOUNT</th>
              <th style={{ textAlign: 'right' }}>OTHER SALE</th>
              <th style={{ textAlign: 'right' }}>EXPENSE</th>
              <th style={{ textAlign: 'right' }}>TOTAL SALE</th>
              <th style={{ textAlign: 'right' }}>TENDER AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {flattenedRows.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              flattenedRows.map((entry, idx) => {
                if (entry.kind === 'group') {
                  const expanded = expandedDateKeys.has(entry.dateKey);
                  return (
                    <tr
                      key={entry.key || `grp:${entry.dateKey}`}
                      data-date-group={entry.dateKey}
                      className={[idx === focusedRowIndex ? 'row-focused' : ''].filter(Boolean).join(' ')}
                      style={{ fontWeight: 700, background: '#f8fafc', cursor: 'pointer' }}
                      onMouseDown={() => setFocusedRowIndex(idx)}
                      onClick={() => toggleDateExpanded(entry.dateKey)}
                    >
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{formatDate(entry.dateKey)}</td>
                      <td>{expanded ? 'Totals (expanded)' : 'Totals'}</td>
                      <td style={{ textAlign: 'right' }}>{Number(entry.totals?.qty || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.sale || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.other || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.exp || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.total || 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.tender || 0)}</td>
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
                    <td>{r.storeCode}</td>
                    <td>{r.storeName}</td>
                    <td>{r.partyName}</td>
                    <td>{r.saleLedger}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      {r.billNumber ? (
                        <button
                          type="button"
                          className="qty-link"
                          title="Open Sale Voucher"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const invoiceNo = String(r.billNumber || '').trim();
                            const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                            openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
                          }}
                        >
                          {r.billNumber}
                        </button>
                      ) : (
                        ''
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{Number(r.totalQty || 0)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(r.saleAmount)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(r.otherSale)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(r.expense)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(r.totalSale)}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(r.tenderAmount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {visibleDetails.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="7" style={{ fontWeight: 700 }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{grandTotals.qty}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.sale)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.other)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.exp)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.total)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.tender)}</td>
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
              <iframe title="Sale Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
            </div>
          </div>
        </div>
      )}

      {canItemMerge && itemMergeOpen && (
        <div
          className="voucher-modal-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            closeItemMergeModal();
          }}
        >
          <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 12, boxShadow: '0 18px 60px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div className="voucher-modal-header">
              <div className="voucher-modal-title">Item Merge</div>
              <button type="button" className="voucher-modal-close" onClick={closeItemMergeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="filter-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label>Store (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={mergeStoreInputRef}
                      value={mergeStoreSearchInput}
                      onChange={handleMergeStoreInputChange}
                      onFocus={handleMergeStoreInputFocus}
                      onKeyDown={handleMergeStoreKeyDown}
                      onBlur={() => window.setTimeout(() => setShowMergeStoreSuggestions(false), 150)}
                      placeholder="Search store code or name (leave blank for all)"
                      disabled={mergeSubmitting}
                      autoComplete="off"
                    />
                    {showMergeStoreSuggestions && mergeStoreResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {mergeStoreResults.map((s, idx) => (
                          <div
                            key={`${String(s?.storeCode || idx)}-${idx}`}
                            id={`merge-store-${idx}`}
                            onMouseDown={() => applyMergeStore(s)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedMergeStoreIndex ? '#eef2ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
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

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>From Date</label>
                  <DateInputButton
                    value={mergeFromDate}
                    onChange={setMergeFromDate}
                    wrapperClassName="relative"
                    buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
                  />
                </div>
                <div className="filter-group" style={{ margin: 0 }}>
                  <label>To Date</label>
                  <DateInputButton
                    value={mergeToDate}
                    onChange={setMergeToDate}
                    wrapperClassName="relative"
                    buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
                  />
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Source Item</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={sourceItemInput}
                      onChange={handleSourceItemChange}
                      onKeyDown={handleSourceItemKeyDown}
                      onFocus={() => runItemSearch(sourceItemInput, 'source')}
                      onBlur={() => window.setTimeout(() => setShowSourceItemSuggestions(false), 150)}
                      placeholder="Item Search"
                      autoComplete="off"
                      disabled={mergeSubmitting}
                    />
                    {showSourceItemSuggestions && sourceItemResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {sourceItemResults.map((it, idx) => (
                          <div
                            key={`${String(it?.itemCode || idx)}-${idx}`}
                            id={`merge-source-item-${idx}`}
                            onMouseDown={() => selectSourceItem(it)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedSourceItemIndex ? '#eef2ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                          >
                            <span>{String(it?.itemName || '')}</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                              {String(it?.itemCode || '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Target Item</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={targetItemInput}
                      onChange={handleTargetItemChange}
                      onKeyDown={handleTargetItemKeyDown}
                      onFocus={() => runItemSearch(targetItemInput, 'target')}
                      onBlur={() => window.setTimeout(() => setShowTargetItemSuggestions(false), 150)}
                      placeholder="Item Search"
                      autoComplete="off"
                      disabled={mergeSubmitting}
                    />
                    {showTargetItemSuggestions && targetItemResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {targetItemResults.map((it, idx) => (
                          <div
                            key={`${String(it?.itemCode || idx)}-${idx}`}
                            id={`merge-target-item-${idx}`}
                            onMouseDown={() => selectTargetItem(it)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedTargetItemIndex ? '#eef2ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                          >
                            <span>{String(it?.itemName || '')}</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                              {String(it?.itemCode || '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Source Size</label>
                  <select value={sourceSizeCode} onChange={(e) => setSourceSizeCode(e.target.value)} disabled={mergeSubmitting}>
                    <option value="">Select Size</option>
                    {mergeSizes.map(s => (
                      <option key={String(s?.code || s?.id)} value={String(s?.code || '')}>
                        {String(s?.name || s?.code || '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group" style={{ margin: 0 }}>
                  <label>Target Size</label>
                  <select value={targetSizeCode} onChange={(e) => setTargetSizeCode(e.target.value)} disabled={mergeSubmitting}>
                    <option value="">Select Size</option>
                    {mergeSizes.map(s => (
                      <option key={String(s?.code || s?.id)} value={String(s?.code || '')}>
                        {String(s?.name || s?.code || '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={includeOpening} onChange={(e) => setIncludeOpening(e.target.checked)} disabled={mergeSubmitting} />
                  <span>Opening</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={includePurchase} onChange={(e) => setIncludePurchase(e.target.checked)} disabled={mergeSubmitting} />
                  <span>Purchase</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={includeReturn} onChange={(e) => setIncludeReturn(e.target.checked)} disabled={mergeSubmitting} />
                  <span>Return</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={includeSale} onChange={(e) => setIncludeSale(e.target.checked)} disabled={mergeSubmitting} />
                  <span>Sale</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={includeTransfer} onChange={(e) => setIncludeTransfer(e.target.checked)} disabled={mergeSubmitting} />
                  <span>Transfer</span>
                </label>
              </div>

              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="search-btn" type="button" onClick={handleMergeSubmit} disabled={mergeSubmitting}>
                  {mergeSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictWiseDailySaleReport;
