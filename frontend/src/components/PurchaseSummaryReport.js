import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Download, Search, Store, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';
import './PurchaseSummaryReport.css';

const PURCHASE_SUMMARY_REPORT_STATE_KEY = 'purchaseSummaryReportState:v1';

const loadPurchaseSummaryReportState = () => {
    try {
        const raw = sessionStorage.getItem(PURCHASE_SUMMARY_REPORT_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const savePurchaseSummaryReportState = (state) => {
    try {
        sessionStorage.setItem(PURCHASE_SUMMARY_REPORT_STATE_KEY, JSON.stringify(state));
    } catch {}
};

const PurchaseSummaryReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
    const lockedStoreCode = searchParams.get('storeCode') || '';
    const storeLocked = searchParams.get('lockedStore') === 'true' && !!lockedStoreCode;
    const restoredStateRef = useRef(null);
    if (restoredStateRef.current === null) {
        restoredStateRef.current = loadPurchaseSummaryReportState();
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
    const districtInputRef = useRef(null);
    const storeInputRef = useRef(null);
    const storeSearchInputRef = useRef(null);
    const partyInputRef = useRef(null);
    const searchBtnRef = useRef(null);
    const searchActionRef = useRef(null);
    const exportActionRef = useRef(null);
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
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
    const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
    const districtSearchWrapRef = useRef(null);
    const partySearchWrapRef = useRef(null);
    const storeSearchWrapRef = useRef(null);
    const districtSuggestionsRef = useRef(null);
    const storeSuggestionsRef = useRef(null);
    const partySuggestionsRef = useRef(null);
    const lastHiddenStorageKeyRef = useRef(null);

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

    const openStartDatePicker = () => {
        const el = startDateRef.current;
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

    const openEndDatePicker = () => {
        const el = endDateRef.current;
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

    useEffect(() => {
        savePurchaseSummaryReportState({
            startDate,
            endDate,
            district,
            storeCode,
            partyCode,
            districtSearchInput,
            storeSearchInput,
            partySearchInput,
            lastSearchRequested
        });
    }, [startDate, endDate, district, storeCode, partyCode, districtSearchInput, storeSearchInput, partySearchInput, lastSearchRequested]);

    useEffect(() => {
        if (!storeLocked || !lockedStoreCode) return;
        if (storeCode !== lockedStoreCode) setStoreCode(lockedStoreCode);
    }, [storeLocked, lockedStoreCode, storeCode]);

    useEffect(() => {
        if (!storeCode) return;
        const st = (stores || []).find(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim());
        if (!st) return;
        const display = `${st.storeName} (${st.storeCode})`;
        if (storeSearchInput !== display) setStoreSearchInput(display);
    }, [storeCode, stores, storeSearchInput]);

    useEffect(() => {
        if (!district) return;
        if (!districtSearchInput) setDistrictSearchInput(district);
    }, [district, districtSearchInput]);

    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/reports/purchase-summary/districts', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDistricts(res.data || []);
            } catch (e) {
                setDistricts([]);
            }
        };

        const fetchStores = async () => {
            try {
                const res = await axios.get('/api/stores');
                if (res.data && res.data.success) {
                    const sorted = (res.data.stores || []).slice().sort((a, b) => {
                        const nameA = `${a.storeCode || ''} ${a.storeName || ''}`.trim();
                        const nameB = `${b.storeCode || ''} ${b.storeName || ''}`.trim();
                        return nameA.localeCompare(nameB);
                    });
                    setStores(sorted);
                } else {
                    setStores([]);
                }
            } catch (e) {
                setStores([]);
            }
        };

        const fetchParties = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/parties', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.success) {
                    const all = Array.isArray(res.data.parties) ? res.data.parties : [];
                    const filtered = all.filter(p => {
                        const t = String(p?.type || '').toLowerCase();
                        return !t || t === 'supplier' || t === 'vendor';
                    });
                    setParties(filtered);
                } else if (Array.isArray(res.data)) {
                    setParties(res.data);
                } else {
                    setParties([]);
                }
            } catch (e) {
                setParties([]);
            }
        };

        fetchDistricts();
        fetchStores();
        fetchParties();
    }, []);

    const hiddenStorageKey = useMemo(() => {
        const sd = String(startDate || '').trim();
        const ed = String(endDate || '').trim();
        const dist = String(district || '').trim();
        const sc = String(storeCode || '').trim();
        const pc = String(partyCode || '').trim();
        return `RG_hiddenRows_purchaseSummary:${sd}|${ed}|${dist}|${sc}|${pc}`;
    }, [startDate, endDate, district, storeCode, partyCode]);

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
            setHiddenRowKeys(new Set(parsed.map(v => String(v || ''))));
        } catch {
            setHiddenRowKeys(new Set());
        }
    }, [hiddenStorageKey]);

    useEffect(() => {
        if (lastHiddenStorageKeyRef.current !== hiddenStorageKey) {
            lastHiddenStorageKeyRef.current = hiddenStorageKey;
            return;
        }
        try {
            localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
        } catch {}
    }, [hiddenRowKeys, hiddenStorageKey]);

    const filterDistrictsForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(districts) ? districts : [];
        if (!v) return all.slice(0, 50);
        return all.filter(d => String(d || '').toLowerCase().includes(v)).slice(0, 50);
    };

    const handleDistrictInputChange = (e) => {
        const value = e.target.value;
        setDistrictSearchInput(value);
        if (district) setDistrict('');
        if (storeCode) setStoreCode('');
        if (storeSearchInput) setStoreSearchInput('');
        if (!value) {
            setDistrictSearchResults([]);
            setShowDistrictSuggestions(false);
            setFocusedDistrictSuggestionIndex(-1);
            return;
        }
        const results = filterDistrictsForSearch(value);
        setDistrictSearchResults(results);
        setShowDistrictSuggestions(true);
        setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
    };

    const handleSelectDistrict = (value) => {
        setDistrict(value || '');
        setDistrictSearchInput(value || '');
        setDistrictSearchResults([]);
        setShowDistrictSuggestions(false);
        setFocusedDistrictSuggestionIndex(-1);
    };

    const handleDistrictKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            if (!showDistrictSuggestions || districtSearchResults.length === 0) return;
            e.preventDefault();
            setFocusedDistrictSuggestionIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, districtSearchResults.length - 1);
                return next;
            });
            return;
        }
        if (e.key === 'ArrowUp') {
            if (!showDistrictSuggestions || districtSearchResults.length === 0) return;
            e.preventDefault();
            setFocusedDistrictSuggestionIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showDistrictSuggestions && districtSearchResults.length > 0) {
                const idx = focusedDistrictSuggestionIndex;
                if (idx >= 0 && idx < districtSearchResults.length) {
                    handleSelectDistrict(districtSearchResults[idx]);
                }
            } else {
                setShowDistrictSuggestions(false);
                setFocusedDistrictSuggestionIndex(-1);
            }
            setTimeout(() => storeInputRef.current?.focus?.(), 0);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowDistrictSuggestions(false);
            setFocusedDistrictSuggestionIndex(-1);
        }
    };

    const filterStoresForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(stores) ? stores : [];
        const districtFiltered = district ? all.filter(s => String(s?.district || '').trim() === district) : all;
        if (!v) return districtFiltered.slice(0, 50);
        const filtered = districtFiltered.filter(s => {
            const name = String(s?.storeName || '').toLowerCase();
            const code = String(s?.storeCode || '').toLowerCase();
            return name.includes(v) || code.includes(v);
        });
        return filtered.slice(0, 50);
    };

    const filterPartiesForSearch = (value) => {
        const v = String(value || '').trim().toLowerCase();
        const all = Array.isArray(parties) ? parties : [];
        if (!v) return all.slice(0, 50);
        return all.filter(p => {
            const name = String(p?.name || '').toLowerCase();
            const code = String(p?.code || '').toLowerCase();
            return name.includes(v) || code.includes(v);
        }).slice(0, 50);
    };

    const handlePartyInputChange = (e) => {
        const value = e.target.value;
        setPartySearchInput(value);
        if (partyCode) setPartyCode('');
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
        setPartyCode(String(party.code));
        setPartySearchInput(`${party.name} (${party.code})`);
        setPartySearchResults([]);
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
    };

    const handlePartyKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            if (!showPartySuggestions || partySearchResults.length === 0) return;
            e.preventDefault();
            setFocusedPartySuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, partySearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            if (!showPartySuggestions || partySearchResults.length === 0) return;
            e.preventDefault();
            setFocusedPartySuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showPartySuggestions && partySearchResults.length > 0) {
                const idx = focusedPartySuggestionIndex;
                if (idx >= 0 && idx < partySearchResults.length) handleSelectParty(partySearchResults[idx]);
            } else {
                setShowPartySuggestions(false);
                setFocusedPartySuggestionIndex(-1);
            }
            setTimeout(() => searchBtnRef.current?.focus?.(), 0);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowPartySuggestions(false);
            setFocusedPartySuggestionIndex(-1);
        }
    };

    const handleStoreInputChange = (e) => {
        if (storeLocked) return;
        const value = e.target.value;
        setStoreSearchInput(value);
        if (storeCode) setStoreCode('');
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
        setStoreCode(store.storeCode);
        setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
        setStoreSearchResults([]);
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
    };

    const handleStoreKeyDown = (e) => {
        if (storeLocked) return;
        if (e.key === 'ArrowDown') {
            if (!showStoreSuggestions || storeSearchResults.length === 0) return;
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1);
                return next;
            });
            return;
        }
        if (e.key === 'ArrowUp') {
            if (!showStoreSuggestions || storeSearchResults.length === 0) return;
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showStoreSuggestions && storeSearchResults.length > 0) {
                const idx = focusedStoreSuggestionIndex;
                if (idx >= 0 && idx < storeSearchResults.length) {
                    handleSelectStore(storeSearchResults[idx]);
                }
            } else {
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
            }
            setTimeout(() => partyInputRef.current?.focus?.(), 0);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowStoreSuggestions(false);
            setFocusedStoreSuggestionIndex(-1);
        }
    };

    useEffect(() => {
        const onDocMouseDown = (e) => {
            const t = e.target;
            if (districtSearchWrapRef.current && !districtSearchWrapRef.current.contains(t)) {
                setShowDistrictSuggestions(false);
                setFocusedDistrictSuggestionIndex(-1);
            }
            if (partySearchWrapRef.current && !partySearchWrapRef.current.contains(t)) {
                setShowPartySuggestions(false);
                setFocusedPartySuggestionIndex(-1);
            }
            if (storeSearchWrapRef.current && !storeSearchWrapRef.current.contains(t)) {
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    useEffect(() => {
        if (!showDistrictSuggestions) return;
        const idx = focusedDistrictSuggestionIndex;
        if (idx < 0) return;
        const container = districtSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showDistrictSuggestions, focusedDistrictSuggestionIndex]);

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
        if (!showPartySuggestions) return;
        const idx = focusedPartySuggestionIndex;
        if (idx < 0) return;
        const container = partySuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showPartySuggestions, focusedPartySuggestionIndex]);

    const formatAmount = (value) => {
        const n = Number(value || 0);
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getRowKey = useCallback((row, idx) => {
        const sc = String(row?.storeCode || '').trim();
        const bill = String(row?.billNumber || row?.invoiceNo || '').trim();
        const dt = String(row?.date || '').trim();
        const billKey = bill || `idx${idx}`;
        return `ps:${sc}:${billKey}:${dt}`;
    }, []);

    const visibleDetails = useMemo(() => {
        const hidden = hiddenRowKeys || new Set();
        const hiddenDates = new Set();
        hidden.forEach((k) => {
            const s = String(k || '');
            if (s.startsWith('g|')) hiddenDates.add(s.slice(2));
        });
        return (data || [])
            .map((row, idx) => ({ row, idx, rowKey: getRowKey(row, idx) }))
            .filter(r => !hidden.has(r.rowKey) && !hiddenDates.has(String(r?.row?.date || '').trim()));
    }, [data, hiddenRowKeys, getRowKey]);

    const dateGroupedRows = useMemo(() => {
        const map = new Map();
        for (const r of visibleDetails || []) {
            const dateKey = String(r?.row?.date || '').trim();
            if (!dateKey) continue;
            if (!map.has(dateKey)) {
                map.set(dateKey, { dateKey, rows: [], totals: { qty: 0, amount: 0 } });
            }
            const g = map.get(dateKey);
            g.rows.push(r);
            g.totals.qty += Number(r?.row?.totalQuantity || 0);
            g.totals.amount += Number(r?.row?.amount || 0);
        }
        const parseDateKey = (k) => {
            const s = String(k || '').trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const d = new Date(s);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
            if (m) {
                const dd = Number(m[1]);
                const mm = Number(m[2]);
                const yyyy = Number(m[3]);
                const d = new Date(yyyy, mm - 1, dd);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            const d = new Date(s);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        const out = Array.from(map.values());
        out.sort((a, b) => parseDateKey(a.dateKey) - parseDateKey(b.dateKey));
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
        return (visibleDetails || []).reduce(
            (acc, r) => {
                acc.totalQuantity += Number(r?.row?.totalQuantity || 0);
                acc.amount += Number(r?.row?.amount || 0);
                return acc;
            },
            { totalQuantity: 0, amount: 0 }
        );
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

    const selectableRowSearch = useMemo(() => {
        return (flattenedRows || []).flatMap((e, idx) => {
            if (e?.kind !== 'detail') return [];
            const row = e?.row;
            const name = String(row?.supplierName || row?.storeName || '').trim();
            return [{ idx, normalized: name.toLowerCase(), name }];
        });
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
        lastHiddenStorageKeyRef.current = null;
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
            const params = {
                startDate,
                endDate,
                district: district || undefined,
                storeCode: storeCode || undefined,
                partyCode: partyCode || undefined
            };
            const res = await axios.get('/api/reports/purchase-summary', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data || []);
        } catch (e) {
            Swal.fire('Error', 'Failed to fetch Purchase Summary Report', 'error');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, district, storeCode, partyCode]);
    searchActionRef.current = handleSearch;

    useEffect(() => {
        if (autoSearchOnceRef.current) return;
        if (!lastSearchRequested) return;
        if (!startDate || !endDate) return;
        autoSearchOnceRef.current = true;
        handleSearch();
    }, [handleSearch, lastSearchRequested, startDate, endDate]);

    const autoSearchOnFilterChangeInitRef = useRef(false);
    useEffect(() => {
        if (!startDate || !endDate) return;
        if (!autoSearchOnFilterChangeInitRef.current) {
            autoSearchOnFilterChangeInitRef.current = true;
            return;
        }
        searchActionRef.current?.();
    }, [startDate, endDate, storeCode]);

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
                if (idx < 0 || idx >= (flattenedRows || []).length) return;
                const entry = flattenedRows[idx];
                if (!entry || entry.kind !== 'detail') return;
                const invoiceNo = String(entry?.row?.billNumber || '').trim();
                if (!invoiceNo) return;
                e.preventDefault();
                const href = `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=duplicate`;
                openVoucherModal(href, invoiceNo ? `PURCHASE (DUP) - ${invoiceNo}` : 'PURCHASE (DUP)');
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
            if (k === 'h') {
                e.preventDefault();
                hideFocusedRow();
                return;
            }
            if (k !== 'r') return;
            e.preventDefault();
            hideFocusedRow();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [deleteSelectedVouchers, flattenedRows, focusedRowIndex, hideFocusedRow, toggleExpandCollapseAll, unhideAllRows]);

    const handleReportTableKeyDown = (e) => {
        const el = tableContainerRef.current;
        if (!el) return;

        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

        if (!e.altKey && !e.ctrlKey && !e.metaKey && typeof e.key === 'string' && /^[a-zA-Z]$/.test(e.key)) {
            if (!selectableRowSearch || selectableRowSearch.length === 0) return;
            e.preventDefault();
            const letter = String(e.key).toLowerCase();
            const startFrom = focusedRowIndex >= 0 ? focusedRowIndex + 1 : 0;
            let match = selectableRowSearch.find(r => r.idx >= startFrom && r.normalized.startsWith(letter));
            if (!match) match = selectableRowSearch.find(r => r.normalized.startsWith(letter));
            if (match) setFocusedRowIndex(match.idx);
            return;
        }

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

    useEffect(() => {
        if (loading) return;
        if (!data || data.length === 0) return;
        const el = tableContainerRef.current;
        if (!el) return;
        try {
            el.focus();
        } catch {}
    }, [loading, data]);

    const filteredStoresForModal = useMemo(() => {
        const list = Array.isArray(stores) ? stores : [];
        const q = String(storeSearchQuery || '').trim().toLowerCase();
        const districtFiltered = district ? list.filter(s => String(s?.district || '').trim() === district) : list;
        return districtFiltered.filter(s => {
            const matchesSearch = !q
                || String(s?.storeCode || '').toLowerCase().includes(q)
                || String(s?.storeName || '').toLowerCase().includes(q);
            const isActive = s?.status == null
                ? true
                : (
                    s?.status === 1 ||
                    s?.status === true ||
                    String(s?.status || '').trim().toLowerCase() === '1' ||
                    String(s?.status || '').trim().toLowerCase() === 'true' ||
                    String(s?.status || '').trim().toLowerCase() === 'active' ||
                    String(s?.status || '').trim().toLowerCase() === 'y'
                );
            return isActive && matchesSearch;
        });
    }, [district, storeSearchQuery, stores]);

    const openStoreModal = useCallback(() => {
        if (storeLocked) return;
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
        setStoreSearchQuery('');
        const all = Array.isArray(stores) ? stores : [];
        const districtFiltered = district ? all.filter(s => String(s?.district || '').trim() === district) : all;
        const idx = storeCode ? districtFiltered.findIndex(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim()) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (districtFiltered.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus?.(), 100);
    }, [district, storeCode, storeLocked, stores]);

    const handleStoreSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = filteredStoresForModal.length - 1;
            setFocusedStoreIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const max = filteredStoresForModal.length - 1;
            setFocusedStoreIndex(prev => Math.max(0, Math.min(max, prev < 0 ? 0 : prev - 1)));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedStoreIndex >= 0 && filteredStoresForModal[focusedStoreIndex]) {
                handleSelectStore(filteredStoresForModal[focusedStoreIndex]);
                setShowStoreModal(false);
                setTimeout(() => storeInputRef.current?.focus?.(), 0);
            }
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowStoreModal(false);
            setTimeout(() => storeInputRef.current?.focus?.(), 0);
        }
    };

    useEffect(() => {
        if (!showStoreModal) return;
        if (focusedStoreIndex < 0) return;
        const el = document.getElementById(`ps-store-option-${focusedStoreIndex}`);
        if (el && typeof el.scrollIntoView === 'function') {
            try { el.scrollIntoView({ block: 'nearest' }); } catch {}
        }
    }, [focusedStoreIndex, showStoreModal, storeSearchQuery]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (storeLocked) return;
            if (voucherModalOpen) return;
            if (showStoreModal) return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [openStoreModal, showStoreModal, storeLocked, voucherModalOpen]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            if (voucherModalOpen) return;
            if (showStoreModal) return;
            if (showChangePeriodModal) return;
            e.preventDefault();
            e.stopPropagation();
            setShowStoreSuggestions(false);
            setFocusedStoreSuggestionIndex(-1);
            setShowDistrictSuggestions(false);
            setFocusedDistrictSuggestionIndex(-1);
            setShowPartySuggestions(false);
            setFocusedPartySuggestionIndex(-1);
            setShowChangePeriodModal(true);
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [showChangePeriodModal, showStoreModal, voucherModalOpen]);

    const handleExport = async () => {
        if (!startDate || !endDate) {
            Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const params = {
                startDate,
                endDate,
                district: district || undefined,
                storeCode: storeCode || undefined,
                partyCode: partyCode || undefined
            };

            const response = await axios.get('/api/reports/purchase-summary/export', {
                params,
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `PurchaseSummary_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            Swal.fire('Error', 'Failed to export report', 'error');
        }
    };
    exportActionRef.current = handleExport;

    return (
        <div className="report-container stock-ledger-container stock-ledger-report purchase-summary-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Purchase Summary</h1>
                <div className="stock-ledger-header-actions">
                    <button
                        type="button"
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleExport}
                        disabled={loading || !startDate || !endDate}
                    >
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
                        <button type="button" className="date-picker-button" onClick={openStartDatePicker} disabled={loading}>
                            {startDate ? toDdMmYyyy(startDate) : ''}
                        </button>
                        <input
                            ref={startDateRef}
                            type="date"
                            className="date-picker-native"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                setTimeout(() => endDateRef.current?.focus?.(), 0);
                            }}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="filter-group">
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
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                setTimeout(() => districtInputRef.current?.focus?.(), 0);
                            }}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>State</label>
                    <div ref={districtSearchWrapRef} style={{ position: 'relative' }}>
                        <input
                            ref={districtInputRef}
                            type="text"
                            value={districtSearchInput}
                            onChange={handleDistrictInputChange}
                            onKeyDown={handleDistrictKeyDown}
                            onFocus={() => {
                                const results = filterDistrictsForSearch(districtSearchInput);
                                setDistrictSearchResults(results);
                                setShowDistrictSuggestions(true);
                                setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search..."
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showDistrictSuggestions && districtSearchResults.length > 0 && (
                            <div
                                ref={districtSuggestionsRef}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {districtSearchResults.map((d, idx) => (
                                    <div
                                        key={`${d}-${idx}`}
                                        data-suggestion-index={idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectDistrict(d);
                                        }}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedDistrictSuggestionIndex ? '#eff6ff' : '#fff'
                                        }}
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
                            ref={storeInputRef}
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
                            disabled={loading || storeLocked}
                            autoComplete="off"
                        />
                        {showStoreSuggestions && storeSearchResults.length > 0 && !storeLocked && (
                            <div
                                ref={storeSuggestionsRef}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {storeSearchResults.map((s, idx) => (
                                    <div
                                        key={`${s.storeCode}-${idx}`}
                                        data-suggestion-index={idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectStore(s);
                                        }}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <span>{s.storeName}</span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                                            {s.storeCode}
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
                            ref={partyInputRef}
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
                            <div
                                ref={partySuggestionsRef}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {partySearchResults.map((p, idx) => (
                                    <div
                                        key={`${p.code}-${idx}`}
                                        data-suggestion-index={idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectParty(p);
                                        }}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedPartySuggestionIndex ? '#eff6ff' : '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <span>{p.name}</span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                                            {p.code}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button ref={searchBtnRef} className="search-btn" onClick={handleSearch} disabled={loading}>
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
                            <th>Store Code</th>
                            <th>Store Name</th>
                            <th>Date</th>
                            <th>Bill Number</th>
                            <th>Party Invoice#</th>
                            <th>Supplier Name</th>
                            <th style={{ textAlign: 'right' }}>Total Quantity</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flattenedRows.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '12px' }}>
                                    {loading ? 'Loading report data...' : 'No data found for selected criteria'}
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
                                            <td>{entry.dateKey}</td>
                                            <td>{expanded ? 'Totals (expanded)' : 'Totals'}</td>
                                            <td></td>
                                            <td></td>
                                            <td style={{ textAlign: 'right' }}>{Number(entry.totals?.qty || 0).toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right' }}>{formatAmount(entry.totals?.amount || 0)}</td>
                                        </tr>
                                    );
                                }

                                const row = entry.row;
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
                                        <td>{row.storeCode}</td>
                                        <td>{row.storeName}</td>
                                        <td>{row.date}</td>
                                        <td>
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
                                        <td>{row.partyInvoiceNo || ''}</td>
                                        <td>{row.supplierName}</td>
                                        <td style={{ textAlign: 'right' }}>{(row.totalQuantity || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>{formatAmount(row.amount)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {visibleDetails.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan="6" style={{ fontWeight: 700 }}>TOTAL</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{grandTotals.totalQuantity.toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(grandTotals.amount)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <footer style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="search-btn" onClick={hideFocusedRow} disabled={flattenedRows.length === 0}>
                    ALT+H Hide
                </button>
                <button type="button" className="search-btn" onClick={unhideAllRows} disabled={hiddenRowKeys.size === 0}>
                    ALT+U Unhide
                </button>
            </footer>

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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Store className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Select Store</h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Choose a location to continue</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStoreModal(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={storeSearchInputRef}
                                    type="text"
                                    placeholder="Search store code or name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={storeSearchQuery}
                                    onChange={(e) => {
                                        setStoreSearchQuery(e.target.value);
                                        setFocusedStoreIndex(0);
                                    }}
                                    onKeyDown={handleStoreSearchKeyDown}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredStoresForModal.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredStoresForModal.map((s, idx) => (
                                        <button
                                            id={`ps-store-option-${idx}`}
                                            key={`${String(s?.storeCode || idx)}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                handleSelectStore(s);
                                                setShowStoreModal(false);
                                                setTimeout(() => storeInputRef.current?.focus?.(), 0);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                                                idx === focusedStoreIndex
                                                    ? 'bg-indigo-50 border border-indigo-200 ring-2 ring-indigo-500/20'
                                                    : String(storeCode || '') === String(s?.storeCode || '')
                                                        ? 'bg-indigo-50 border border-indigo-100'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`p-2 rounded-lg ${
                                                    idx === focusedStoreIndex || String(storeCode || '') === String(s?.storeCode || '') ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                }`}>
                                                    <Store className={`w-4 h-4 ${
                                                        idx === focusedStoreIndex || String(storeCode || '') === String(s?.storeCode || '') ? 'text-indigo-600' : 'text-slate-400'
                                                    }`} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-indigo-600">{String(s?.storeCode || '')}</div>
                                                    <div className="text-sm font-bold text-slate-700">{String(s?.storeName || '')}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Search className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No stores found matching "{storeSearchQuery}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-[11px] text-slate-500 font-medium">
                                Showing {filteredStoresForModal.length} of {(Array.isArray(stores) ? stores.length : 0)} available stores
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ChangePeriodModal
                open={showChangePeriodModal}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setShowChangePeriodModal(false)}
                onApply={({ startDate: sd, endDate: ed }) => {
                    setStartDate(sd);
                    setEndDate(ed);
                    setShowChangePeriodModal(false);
                    setTimeout(() => {
                        searchActionRef.current?.();
                        searchBtnRef.current?.focus?.();
                    }, 0);
                }}
            />
        </div>
    );
};

export default PurchaseSummaryReport;
