import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';
import { formatDateDDMMYYYY } from './dateUtils';

const DSR_STATUS_REPORT_STATE_KEY = 'dsrStatusReportState:v1';

const loadDsrStatusReportState = () => {
  try {
    const raw = sessionStorage.getItem(DSR_STATUS_REPORT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDsrStatusReportState = (state) => {
  try {
    sessionStorage.setItem(DSR_STATUS_REPORT_STATE_KEY, JSON.stringify(state));
  } catch {}
};

const DsrStatusReport = ({ reportMode = 'count' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedReportMode = String(reportMode || '').toLowerCase();
  const isAmountReport = normalizedReportMode === 'amount';
  const isOtherSaleReport = normalizedReportMode === 'other_sale' || normalizedReportMode === 'othersale' || normalizedReportMode === 'other-sale';
  const isValueReport = isAmountReport || isOtherSaleReport;
  const reportTitle = isAmountReport ? 'Sales Report (Amount)' : isOtherSaleReport ? 'Other Sale' : 'DSR Status';
  const reportApiUrl = isAmountReport
    ? '/api/reports/sales/sales-report-amount'
    : isOtherSaleReport
      ? '/api/reports/sales/other-sale'
      : '/api/reports/sales/dsr-status';
  const exportApiUrl = isAmountReport
    ? '/api/reports/sales/sales-report-amount/export'
    : isOtherSaleReport
      ? '/api/reports/sales/other-sale/export'
      : '/api/reports/sales/dsr-status/export';
  const exportFilePrefix = isAmountReport ? 'sales_report_amount' : isOtherSaleReport ? 'other_sale' : 'dsr_status';
  const averageLabel = isOtherSaleReport ? 'Average Other Sale' : 'Average Sale';
  const restoredStateRef = useRef(loadDsrStatusReportState());
  const defaultBackPath = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'STORE USER' ? '/store-dashboard' : '/ho-reports';
    } catch {
      return '/ho-reports';
    }
  }, []);
  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const storeLocked = searchParams.get('lockedStore') === 'true';
  const lockedStoreCode = searchParams.get('storeCode') || '';

  const [startDate, setStartDate] = useState(() => restoredStateRef.current?.startDate || '');
  const [endDate, setEndDate] = useState(() => restoredStateRef.current?.endDate || '');
  const [districtQuery, setDistrictQuery] = useState(() => restoredStateRef.current?.districtQuery || '');
  const [storeSearchInput, setStoreSearchInput] = useState(() => restoredStateRef.current?.storeSearchInput || '');
  const [selectedStoreCode, setSelectedStoreCode] = useState(() => restoredStateRef.current?.selectedStoreCode || '');
  const [storeCategory, setStoreCategory] = useState(() => restoredStateRef.current?.storeCategory || '');
  const [partySearchInput, setPartySearchInput] = useState(() => restoredStateRef.current?.partySearchInput || '');
  const [selectedPartyName, setSelectedPartyName] = useState(() => restoredStateRef.current?.selectedPartyName || '');
  const [saleLedgerSearchInput, setSaleLedgerSearchInput] = useState(() => restoredStateRef.current?.saleLedgerSearchInput || '');
  const [selectedSaleLedger, setSelectedSaleLedger] = useState(() => restoredStateRef.current?.selectedSaleLedger || '');

  const [districtOptions, setDistrictOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [partyOptions, setPartyOptions] = useState([]);
  const [saleLedgerOptions, setSaleLedgerOptions] = useState([]);
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

  const [voucherListLoading, setVoucherListLoading] = useState(false);
  const [voucherListError, setVoucherListError] = useState('');
  const [voucherListStoreCode, setVoucherListStoreCode] = useState('');
  const [voucherListStoreName, setVoucherListStoreName] = useState('');
  const [voucherListDate, setVoucherListDate] = useState('');
  const [voucherNos, setVoucherNos] = useState([]);
  const [voucherListOpen, setVoucherListOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherModalHref, setVoucherModalHref] = useState('');
  const [voucherModalTitle, setVoucherModalTitle] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const districtInputRef = useRef(null);
  const storeInputRef = useRef(null);
  const partyInputRef = useRef(null);
  const saleLedgerInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(() => Number.isInteger(restoredStateRef.current?.focusedRowIndex) ? restoredStateRef.current.focusedRowIndex : -1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set(Array.isArray(restoredStateRef.current?.selectedRowKeys) ? restoredStateRef.current.selectedRowKeys : []));
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const autoSearchOnFilterChangeInitRef = useRef(false);


  const storeModalStores = useMemo(() => {
    const q = String(storeModalQuery || '').trim().toLowerCase();
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    const districtFiltered = districtQuery
      ? all.filter(s => String(s?.district || '').trim() === String(districtQuery || '').trim())
      : all;
    const categoryFiltered = isOtherSaleReport && storeCategory
      ? districtFiltered.filter(s => String(s?.category || s?.Category || '').trim() === String(storeCategory || '').trim())
      : districtFiltered;
    if (!q) return categoryFiltered.slice(0, 100);
    return categoryFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 100);
  }, [districtQuery, isOtherSaleReport, storeCategory, storeModalQuery, storeOptions]);

  const storeCategoryOptions = useMemo(() => {
    const all = Array.isArray(storeOptions) ? storeOptions : [];
    const out = new Set();
    for (const s of all) {
      const raw = String(s?.category || s?.Category || '').trim();
      if (raw) out.add(raw);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [storeOptions]);

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
        const active = Array.isArray(storeModalStores) ? storeModalStores : [];
        const idx = selectedStoreCode
          ? active.findIndex(s => String(s?.storeCode || '').trim() === String(selectedStoreCode || '').trim())
          : -1;
        setFocusedStoreModalIndex(idx >= 0 ? idx : (active.length ? 0 : -1));
        setShowStoreModal(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedStoreCode, showChangePeriodModal, showStoreModal, storeModalStores]);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(prev => prev || firstDay.toISOString().split('T')[0]);
    setEndDate(prev => prev || today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const [storeRes, partyRes, saleLedgerRes] = await Promise.all([
          axios.get('/api/stores', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/led-masters/by-group-names', {
            params: { names: 'Sundry Debtors,Sundry Creditors' },
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/led-masters', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const stores = Array.isArray(storeRes.data)
          ? storeRes.data
          : (storeRes.data?.stores || []);
        const parties = Array.isArray(partyRes.data)
          ? partyRes.data
          : (partyRes.data?.ledMasters || []);
        const saleLedgers = Array.isArray(saleLedgerRes.data)
          ? saleLedgerRes.data
          : (saleLedgerRes.data?.ledMasters || []);

        const districts = new Set();
        for (const s of stores) {
          const d = String(s?.district || '').trim();
          if (d) districts.add(d);
        }

        const full = Array.isArray(stores) ? stores : [];
        setDistrictOptions(Array.from(districts).sort((a, b) => a.localeCompare(b)));
        if (storeLocked && lockedStoreCode) {
          setStoreOptions(full.filter(s => String(s?.storeCode || '').trim() === String(lockedStoreCode || '').trim()));
        } else {
          setStoreOptions(full);
        }
        setPartyOptions(Array.isArray(parties) ? parties : []);
        setSaleLedgerOptions(Array.isArray(saleLedgers) ? saleLedgers : []);
      } catch {
        setDistrictOptions([]);
        setStoreOptions([]);
        setPartyOptions([]);
        setSaleLedgerOptions([]);
      }
    };
    fetchFilterOptions();
  }, [storeLocked, lockedStoreCode]);

  useEffect(() => {
    if (!storeLocked || !lockedStoreCode) return;
    if (!storeOptions || storeOptions.length === 0) return;
    const match = storeOptions.find(s => String(s?.storeCode || '').trim() === String(lockedStoreCode || '').trim());
    if (!match) return;
    setSelectedStoreCode(String(match?.storeCode || '').trim());
    setStoreSearchInput(`${String(match?.storeName || '').trim()} (${String(match?.storeCode || '').trim()})`.trim());
  }, [lockedStoreCode, storeLocked, storeOptions]);

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
    setSelectedStoreCode('');
    if (storeInputRef.current) storeInputRef.current.focus();
  };

  const selectStore = (store) => {
    if (!store) return;
    setSelectedStoreCode(String(store?.storeCode || '').trim());
    setStoreSearchInput(`${String(store?.storeName || '').trim()} (${String(store?.storeCode || '').trim()})`.trim());
    setShowStoreSuggestions(false);
    setFocusedStoreIndex(-1);
  };

  const filterLedgerOptionsForSearch = (options, value) => {
    const v = (value || '').trim().toLowerCase();
    const all = Array.isArray(options) ? options : [];
    if (!v) return all.slice(0, 50);
    return all.filter((l) => {
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
    const categoryFiltered = isOtherSaleReport && storeCategory
      ? districtFiltered.filter(s => String(s?.category || s?.Category || '').trim() === String(storeCategory || '').trim())
      : districtFiltered;
    if (!v) return categoryFiltered.slice(0, 50);
    const filtered = categoryFiltered.filter(s => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(v) || code.includes(v);
    });
    return filtered.slice(0, 50);
  };

  const handleStoreCategoryChange = (e) => {
    const value = String(e.target.value || '');
    setStoreCategory(value);
    setStoreSearchInput('');
    setSelectedStoreCode('');
    setStoreResults([]);
    setShowStoreSuggestions(false);
    setFocusedStoreIndex(-1);
    window.setTimeout(() => {
      try {
        storeInputRef.current?.focus?.();
      } catch {}
    }, 0);
  };

  const handleStoreInputChange = (e) => {
    const value = e.target.value;
    setStoreSearchInput(value);
    setSelectedStoreCode('');
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
    const results = filterLedgerOptionsForSearch(partyOptions, value);
    setPartyResults(results);
    setShowPartySuggestions(true);
    setFocusedPartyIndex(results.length ? 0 : -1);
  };

  const handlePartyInputFocus = () => {
    const results = filterLedgerOptionsForSearch(partyOptions, partySearchInput);
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
      setFocusedPartyIndex((prev) => prev < partyResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedPartyIndex((prev) => prev > 0 ? prev - 1 : -1);
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
    const results = filterLedgerOptionsForSearch(saleLedgerOptions, value);
    setSaleLedgerResults(results);
    setShowSaleLedgerSuggestions(true);
    setFocusedSaleLedgerIndex(results.length ? 0 : -1);
  };

  const handleSaleLedgerInputFocus = () => {
    const results = filterLedgerOptionsForSearch(saleLedgerOptions, saleLedgerSearchInput);
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
      setFocusedSaleLedgerIndex((prev) => prev < saleLedgerResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSaleLedgerIndex((prev) => prev > 0 ? prev - 1 : -1);
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

  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const parseIsoToUtcDate = (iso) => {
      const parts = String(iso || '').split('-').map(n => parseInt(n, 10));
      if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
      const [y, m, d] = parts;
      return new Date(Date.UTC(y, m - 1, d));
    };

    const start = parseIsoToUtcDate(startDate);
    const end = parseIsoToUtcDate(endDate);
    if (!start || !end) return [];

    const out = [];
    const cur = new Date(start.getTime());
    while (cur.getTime() <= end.getTime()) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }, [startDate, endDate]);

  const dateColumns = useMemo(() => {
    return dateRange.map((iso) => {
      const [year, month, day] = String(iso || '').split('-').map((value) => Number(value));
      const utcDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
      return {
        iso,
        dayNumber: day,
        dayShort: utcDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
      };
    });
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(reportApiUrl, {
        params: {
          startDate,
          endDate,
          district: districtQuery,
          storeName: selectedStoreCode || storeSearchInput || '',
          storeCategory: isOtherSaleReport ? (storeCategory || '') : undefined,
          partyName: isValueReport ? (selectedPartyName || partySearchInput || '') : undefined,
          saleLedger: isValueReport ? (selectedSaleLedger || saleLedgerSearchInput || '') : undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data || []);
    } catch {
      setError('Failed to load report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, districtQuery, isOtherSaleReport, isValueReport, partySearchInput, reportApiUrl, saleLedgerSearchInput, selectedPartyName, selectedSaleLedger, selectedStoreCode, storeCategory, storeSearchInput]);
  searchActionRef.current = fetchData;

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (!autoSearchOnFilterChangeInitRef.current) {
      autoSearchOnFilterChangeInitRef.current = true;
      return;
    }
    searchActionRef.current?.();
  }, [startDate, endDate, selectedStoreCode, selectedPartyName, selectedSaleLedger, storeCategory]);

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(exportApiUrl, {
        params: {
          startDate,
          endDate,
          district: districtQuery,
          storeName: selectedStoreCode || storeSearchInput || '',
          storeCategory: isOtherSaleReport ? (storeCategory || '') : undefined,
          partyName: isValueReport ? (selectedPartyName || partySearchInput || '') : undefined,
          saleLedger: isValueReport ? (selectedSaleLedger || saleLedgerSearchInput || '') : undefined
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportFilePrefix}_${startDate}_${endDate}.xlsx`);
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

  const grid = useMemo(() => {
    const map = new Map();
    for (const r of rows || []) {
      const districtName = String(r?.districtName || '');
      const category = String(r?.shopType || '');
      const storeStatus = String(r?.storeStatus || '');
      const owner = isValueReport ? '' : String(r?.owner || '');
      const storeCode = String(r?.storeCode || '');
      const storeName = String(r?.storeName || '');
      const date = String(r?.date || '');
      const value = isValueReport ? Number(r?.saleAmount || 0) : Number(r?.status || 0);
      if (!storeCode || !date) continue;

      const key = isValueReport
        ? `${districtName}||${category}||${storeStatus}||${storeCode}||${storeName}`
        : `${districtName}||${category}||${storeStatus}||${owner}||${storeCode}||${storeName}`;
      if (!map.has(key)) {
        map.set(key, { rowType: 'data', districtName, category, storeStatus, owner, storeCode, storeName, byDate: {} });
      }
      const row = map.get(key);
      row.byDate[date] = (row.byDate[date] || 0) + value;
    }
    const out = Array.from(map.values()).map((row) => {
      if (!isValueReport) return row;
      let totalSale = 0;
      let saleDays = 0;
      for (const d of dateRange) {
        const v = Number(row.byDate?.[d] || 0);
        totalSale += v;
        if (v !== 0) saleDays += 1;
      }
      return {
        ...row,
        totalSale,
        averageSale: saleDays > 0 ? (totalSale / saleDays) : 0
      };
    });
    out.sort((a, b) => {
      const d = a.districtName.localeCompare(b.districtName);
      if (d !== 0) return d;
      const t = String(a.category || '').localeCompare(String(b.category || ''));
      if (t !== 0) return t;
      const st = String(a.storeStatus || '').localeCompare(String(b.storeStatus || ''));
      if (st !== 0) return st;
      if (!isValueReport) {
        const o = String(a.owner || '').localeCompare(String(b.owner || ''));
        if (o !== 0) return o;
      }
      const s = a.storeCode.localeCompare(b.storeCode);
      if (s !== 0) return s;
      return a.storeName.localeCompare(b.storeName);
    });
    if (out.length === 0) return [];

    const buildSummaryRow = (label, districtName, sourceRows, rowType) => {
      const byDate = {};
      for (const d of dateRange) {
        byDate[d] = sourceRows.reduce((sum, row) => sum + Number(row.byDate?.[d] || 0), 0);
      }
      const summaryRow = {
        rowType,
        districtName,
        category: '',
        storeStatus: '',
        owner: '',
        storeCode: '',
        storeName: label,
        byDate
      };
      if (isValueReport) {
        const totalSale = dateRange.reduce((sum, d) => sum + Number(byDate[d] || 0), 0);
        const saleDays = dateRange.reduce((count, d) => count + (Number(byDate[d] || 0) !== 0 ? 1 : 0), 0);
        summaryRow.totalSale = totalSale;
        summaryRow.averageSale = saleDays > 0 ? (totalSale / saleDays) : 0;
      }
      return summaryRow;
    };

    const withTotals = [];
    let currentDistrict = null;
    let districtRows = [];
    for (const row of out) {
      if (currentDistrict !== null && row.districtName !== currentDistrict) {
        withTotals.push(buildSummaryRow('District Total', currentDistrict, districtRows, 'districtTotal'));
        districtRows = [];
      }
      currentDistrict = row.districtName;
      districtRows.push(row);
      withTotals.push(row);
    }
    if (districtRows.length > 0) {
      withTotals.push(buildSummaryRow('District Total', currentDistrict || '', districtRows, 'districtTotal'));
    }
    withTotals.push(buildSummaryRow('Grand Total', '', out, 'grandTotal'));
    return withTotals;
  }, [dateRange, isValueReport, isAmountReport, rows]);

  useEffect(() => {
    saveDsrStatusReportState({
      reportMode: normalizedReportMode || 'count',
      startDate,
      endDate,
      districtQuery,
      storeSearchInput,
      selectedStoreCode,
      storeCategory,
      partySearchInput,
      selectedPartyName,
      saleLedgerSearchInput,
      selectedSaleLedger,
      focusedRowIndex,
      selectedRowKeys: Array.from(selectedRowKeys || [])
    });
  }, [districtQuery, endDate, focusedRowIndex, normalizedReportMode, partySearchInput, saleLedgerSearchInput, selectedPartyName, selectedRowKeys, selectedSaleLedger, selectedStoreCode, startDate, storeCategory, storeSearchInput]);

  const selectableRowKeys = useMemo(() => {
    return (grid || []).map((r, idx) => {
      if (r?.rowType && r.rowType !== 'data') return null;
      const storeCode = String(r?.storeCode || '').trim();
      return `dsr:${storeCode}:${idx}`;
    }).filter(Boolean);
  }, [grid]);

  const selectableRowIndexByKey = useMemo(() => {
    const map = new Map();
    selectableRowKeys.forEach((k, idx) => map.set(k, idx));
    return map;
  }, [selectableRowKeys]);

  useEffect(() => {
    setSelectedRowKeys(new Set());
    setFocusedRowIndex(selectableRowKeys.length > 0 ? 0 : -1);
  }, [selectableRowKeys]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    if (focusedRowIndex < 0 || focusedRowIndex >= selectableRowKeys.length) return;
    const rowKey = selectableRowKeys[focusedRowIndex];
    const tr = el.querySelector(`tr[data-row-key="${rowKey}"]`);
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

  const formatDateDDMMYY = useCallback((value) => {
    const iso = String(value || '').trim();
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [yyyy, mm, dd] = parts;
    return `${dd}-${mm}-${String(yyyy || '').slice(-2)}`;
  }, []);

  const openVoucherModal = useCallback((href, title) => {
    if (!href) return;
    const sep = href.includes('?') ? '&' : '?';
    setVoucherModalHref(`${href}${sep}_ts=${Date.now()}`);
    setVoucherModalTitle(title || 'Voucher');
    setVoucherModalOpen(true);
  }, []);

  const closeVoucherModal = useCallback(() => {
    setVoucherModalOpen(false);
    setVoucherModalHref('');
    setVoucherModalTitle('');
  }, []);

  const openVouchersForCell = useCallback(async (row, isoDate) => {
    const storeCode = String(row?.storeCode || '').trim();
    const storeName = String(row?.storeName || '').trim();
    const d = String(isoDate || '').trim();
    if (!storeCode || !d) return;

    setVoucherListError('');
    setVoucherListLoading(true);
    setVoucherListStoreCode(storeCode);
    setVoucherListStoreName(storeName);
    setVoucherListDate(d);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/reports/sales/dsr-vouchers', {
        params: { storeCode, date: d },
        headers: { Authorization: `Bearer ${token}` }
      });

      const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.vouchers) ? res.data.vouchers : []);
      const list = raw
        .map(v => String(v || '').trim())
        .filter(Boolean);

      if (list.length === 1) {
        const invoiceNo = list[0];
        const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
        openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
        return;
      }

      setVoucherNos(list);
      setVoucherListOpen(true);
    } catch {
      setVoucherNos([]);
      setVoucherListError('Failed to load vouchers');
      setVoucherListOpen(true);
    } finally {
      setVoucherListLoading(false);
    }
  }, [openVoucherModal]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (voucherModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeVoucherModal();
        return;
      }
      if (voucherListOpen) {
        e.preventDefault();
        e.stopPropagation();
        setVoucherListOpen(false);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [closeVoucherModal, voucherListOpen, voucherModalOpen]);

  useEffect(() => {
    if (!voucherModalOpen) return;
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
      closeVoucherModal();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [closeVoucherModal, voucherModalOpen]);

  const fixedColumnCount = isValueReport ? 8 : 7;
  const totalColumnCount = fixedColumnCount + dateRange.length;

  const serialByIndex = useMemo(() => {
    let serial = 0;
    return (grid || []).map((row) => (row?.rowType === 'data' ? ++serial : ''));
  }, [grid]);

  const formatCountValue = (value) => {
    const numeric = Number(value || 0);
    return numeric > 0 ? String(numeric) : '';
  };

  const formatAmountValue = (value) => {
    const numeric = Number(value || 0);
    return numeric !== 0
      ? numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
  };

  return (
    <div className="report-container stock-ledger-container stock-ledger-report dsr-status-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>Back</button>
        <h1 className="stock-ledger-title">{reportTitle}</h1>
        <div className="stock-ledger-header-actions">
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
                    <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                      {String(s?.storeCode || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isOtherSaleReport ? (
          <div className="filter-group">
            <label>Store Category</label>
            <select value={storeCategory} onChange={handleStoreCategoryChange} disabled={loading}>
              <option value="">All</option>
              {storeCategoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : null}

        {isValueReport ? (
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
                placeholder="Search party..."
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
                      <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                        {String(p?.code || '')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {isValueReport ? (
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
                placeholder="Search sale ledger..."
                disabled={loading}
                autoComplete="off"
              />
              {showSaleLedgerSuggestions && saleLedgerResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                  {saleLedgerResults.map((ledger, idx) => (
                    <div
                      key={`${String(ledger?.code || idx)}-${idx}`}
                      id={`suggestion-sale-ledger-${idx}`}
                      onMouseDown={() => selectSaleLedger(ledger)}
                      style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedSaleLedgerIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                    >
                      <span>{String(ledger?.name || '')}</span>
                      <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                        {String(ledger?.code || '')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

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
              <th>S.No</th>
              <th>District Name</th>
              <th>Store Code</th>
              <th>Store Name</th>
              <th>Category</th>
              <th>Status</th>
              {!isValueReport ? <th>Owner</th> : null}
              {dateColumns.map((dateColumn) => (
                <th key={dateColumn.iso} style={{ textAlign: 'center' }}>
                  <div className="report-date-header">
                    <span>{formatDateDDMMYY(dateColumn.iso)}</span>
                  </div>
                </th>
              ))}
              {isValueReport ? <th style={{ textAlign: 'right' }}>Total</th> : null}
              {isValueReport ? <th style={{ textAlign: 'right' }}>{averageLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {grid.length === 0 ? (
              <tr>
                <td colSpan={totalColumnCount} style={{ textAlign: 'center', padding: '18px' }}>
                  {loading ? 'Loading...' : 'No data'}
                </td>
              </tr>
            ) : (
              grid.map((r, idx) => (
                <tr
                  key={`${r.rowType || 'data'}-${r.storeCode || 'summary'}-${r.districtName || 'all'}-${idx}`}
                  data-row-key={r.rowType === 'data' ? `dsr:${String(r?.storeCode || '').trim()}:${idx}` : undefined}
                  className={[
                    r.rowType === 'districtTotal' ? 'district-total-row' : '',
                    r.rowType === 'grandTotal' ? 'grand-total-row' : '',
                    r.rowType === 'data' && selectedRowKeys.has(`dsr:${String(r?.storeCode || '').trim()}:${idx}`) ? 'row-selected' : '',
                    r.rowType === 'data' && focusedRowIndex === selectableRowIndexByKey.get(`dsr:${String(r?.storeCode || '').trim()}:${idx}`) ? 'row-focused' : ''
                  ].filter(Boolean).join(' ')}
                  onMouseDown={() => {
                    if (r.rowType !== 'data') return;
                    const key = `dsr:${String(r?.storeCode || '').trim()}:${idx}`;
                    const next = selectableRowIndexByKey.get(key);
                    if (next === undefined) return;
                    setFocusedRowIndex(next);
                  }}
                  onClick={() => {
                    if (r.rowType !== 'data') return;
                    toggleSelectedRow(`dsr:${String(r?.storeCode || '').trim()}:${idx}`);
                  }}
                >
                  <td style={{ textAlign: 'center' }}>{serialByIndex[idx] || ''}</td>
                  <td>{r.rowType === 'grandTotal' ? '' : r.districtName}</td>
                  <td>{r.rowType === 'data' ? r.storeCode : ''}</td>
                  <td>{r.storeName}</td>
                  <td>{r.rowType === 'data' ? r.category : ''}</td>
                  <td>{r.rowType === 'data' ? r.storeStatus : ''}</td>
                  {!isValueReport ? <td>{r.rowType === 'data' ? r.owner : ''}</td> : null}
                  {dateRange.map((d) => (
                    (() => {
                      const raw = Number(r.byDate?.[d] || 0);
                      const display = isValueReport ? formatAmountValue(raw) : formatCountValue(raw);
                      const isBlank = !display;
                      const cellStyle = {
                        textAlign: 'center',
                        ...(isBlank ? { background: '#fee2e2' } : null)
                      };
                      return (
                        <td key={d} style={cellStyle}>
                          {r.rowType === 'data' && raw > 0 ? (
                        <button
                          type="button"
                          className="qty-link"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openVouchersForCell(r, d);
                          }}
                        >
                          {display}
                        </button>
                          ) : display}
                        </td>
                      );
                    })()
                  ))}
                  {isValueReport ? (
                    (() => {
                      const display = formatAmountValue(r.totalSale || 0);
                      const isBlank = !display;
                      const cellStyle = {
                        textAlign: 'right',
                        ...(isBlank ? { background: '#fee2e2' } : null)
                      };
                      return <td style={cellStyle}>{display}</td>;
                    })()
                  ) : null}
                  {isValueReport ? (
                    (() => {
                      const display = formatAmountValue(r.averageSale || 0);
                      const isBlank = !display;
                      const cellStyle = {
                        textAlign: 'right',
                        ...(isBlank ? { background: '#fee2e2' } : null)
                      };
                      return <td style={cellStyle}>{display}</td>;
                    })()
                  ) : null}
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
          setTimeout(() => searchActionRef.current?.(), 0);
        }}
      />

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

      {voucherListOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vouchers"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setVoucherListOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="text-base font-bold text-slate-800">
                {`Vouchers${voucherListStoreCode ? ` - ${voucherListStoreCode}` : ''}${voucherListDate ? ` (${voucherListDate})` : ''}`}
              </div>
              <button
                type="button"
                onClick={() => setVoucherListOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {voucherListStoreName ? (
                <div className="text-xs text-slate-600 mb-3">
                  {voucherListStoreName}
                </div>
              ) : null}
              {voucherListLoading ? (
                <div className="text-sm text-slate-600">Loading...</div>
              ) : voucherListError ? (
                <div className="text-sm text-red-600">{voucherListError}</div>
              ) : voucherNos.length === 0 ? (
                <div className="text-sm text-slate-600">No vouchers</div>
              ) : (
                <div className="max-h-[60vh] overflow-auto border border-slate-100 rounded">
                  {voucherNos.map((invoiceNo) => (
                    <button
                      key={invoiceNo}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between gap-3"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const href = `/sales-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                        setVoucherListOpen(false);
                        openVoucherModal(href, invoiceNo ? `SALE - ${invoiceNo}` : 'SALE');
                      }}
                    >
                      <span className="text-sm text-slate-800">{invoiceNo}</span>
                      <span className="text-xs text-slate-500">Open</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
};

export default DsrStatusReport;
