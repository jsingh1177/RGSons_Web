import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';
import './CollectionExpenseReport.css';

const CollectionExpenseReport = () => {
    const navigate = useNavigate();
    const filterStorageKey = 'RG_filters:collection-expense';
    const initialFilters = useMemo(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const defaults = {
            startDate: firstDay.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
            zone: '',
            district: '',
            storeCode: '',
            zoneSearchInput: '',
            storeSearchInput: ''
        };

        const params = new URLSearchParams(window.location.search || '');
        const fromUrl = {
            startDate: String(params.get('startDate') || '').trim(),
            endDate: String(params.get('endDate') || '').trim(),
            zone: String(params.get('zone') || '').trim(),
            district: String(params.get('district') || '').trim(),
            storeCode: String(params.get('storeCode') || '').trim(),
            zoneSearchInput: String(params.get('zoneInput') || '').trim(),
            storeSearchInput: String(params.get('storeInput') || '').trim()
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
        const zone = String(base.zone || '').trim();
        const district = String(base.district || '').trim();
        const storeCode = String(base.storeCode || '').trim();
        const zoneSearchInput = String(base.zoneSearchInput || zone || '').trim();
        const storeSearchInput = String(base.storeSearchInput || '').trim();

        return { startDate, endDate, zone, district, storeCode, zoneSearchInput, storeSearchInput };
    }, []);

    const [startDate, setStartDate] = useState(() => initialFilters.startDate);
    const [endDate, setEndDate] = useState(() => initialFilters.endDate);
    const [zone, setZone] = useState(() => initialFilters.zone);
    const [district, setDistrict] = useState(() => initialFilters.district);
    const [storeCode, setStoreCode] = useState(() => initialFilters.storeCode);
    const [reportData, setReportData] = useState([]);
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState({ tenders: [], expenses: [], sales: [] });
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const tableContainerRef = useRef(null);
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
    const [zoneSearchInput, setZoneSearchInput] = useState(() => initialFilters.zoneSearchInput);
    const [zoneSearchResults, setZoneSearchResults] = useState([]);
    const [showZoneSuggestions, setShowZoneSuggestions] = useState(false);
    const [focusedZoneSuggestionIndex, setFocusedZoneSuggestionIndex] = useState(-1);
    const [storeSearchInput, setStoreSearchInput] = useState(() => initialFilters.storeSearchInput);
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
    const zoneWrapRef = useRef(null);
    const storeWrapRef = useRef(null);
    const hiddenStorageKey = useMemo(() => {
        const sd = String(startDate || '').trim();
        const ed = String(endDate || '').trim();
        const z = String(zone || '').trim();
        const d = String(district || '').trim();
        const sc = String(storeCode || '').trim();
        return `RG_hiddenRows_collectionExpense:${sd}:${ed}:${z}:${d}:${sc}`;
    }, [district, endDate, startDate, storeCode, zone]);
    const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());

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
                setShowChangePeriodModal(true);
                return;
            }
            if (e.key === 'F3') {
                e.preventDefault();
                if (showStoreModal) return;
                if (showChangePeriodModal) return;
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
    }, [showChangePeriodModal, showStoreModal, storeCode, storeModalStores]);

    useEffect(() => {
        fetchZones();
        fetchDistricts(initialFilters.zone);
        fetchColumns();
        fetchStores();
    }, [initialFilters.zone]);

    useEffect(() => {
        const payload = { startDate, endDate, zone, district, storeCode, zoneSearchInput, storeSearchInput };
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
        setOrDelete('zone', zone);
        setOrDelete('district', district);
        setOrDelete('storeCode', storeCode);
        setOrDelete('zoneInput', zoneSearchInput);
        setOrDelete('storeInput', storeSearchInput);
        const next = params.toString();
        const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash || ''}`;
        window.history.replaceState(null, '', nextUrl);
    }, [district, endDate, filterStorageKey, startDate, storeCode, storeSearchInput, zone, zoneSearchInput]);

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
            setHiddenRowKeys(new Set(parsed.map((v) => String(v || '')).filter(Boolean)));
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
        if (!storeCode) return;
        if (storeSearchInput && storeSearchInput.trim()) return;
        const all = Array.isArray(stores) ? stores : [];
        const match = all.find(s => String(s?.storeCode || '').trim() === String(storeCode || '').trim());
        if (!match) {
            setStoreSearchInput(String(storeCode));
            return;
        }
        const name = String(match?.storeName || '').trim();
        const code = String(match?.storeCode || '').trim();
        setStoreSearchInput(`${name} (${code})`.trim());
    }, [storeCode, storeSearchInput, stores]);

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

    const fetchColumns = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/columns', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setColumns(response.data);
            }
        } catch (error) {
            console.error('Error fetching columns:', error);
        }
    };

    const fetchZones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/zones', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setZones(response.data);
            } else {
                setZones([]);
            }
        } catch (error) {
            console.error('Error fetching zones:', error);
            setZones([]);
        }
    };

    const fetchStores = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/stores', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = Array.isArray(res.data) ? res.data : (res.data?.stores || []);
            setStores(Array.isArray(list) ? list : []);
        } catch {
            setStores([]);
        }
    };

    const fetchDistricts = async (selectedZone = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/districts', {
                params: { zone: selectedZone },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setDistricts(response.data);
            } else {
                setDistricts([]);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
            setDistricts([]);
        }
    };

    useEffect(() => {
        setZoneSearchInput(zone || '');
    }, [zone]);

    const filterZonesForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(zones) ? zones : [];
        if (!v) return all.slice(0, 50);
        return all.filter(z => String(z || '').toLowerCase().includes(v)).slice(0, 50);
    };

    const handleZoneInputChange = (e) => {
        const value = e.target.value;
        setZoneSearchInput(value);
        if (zone) setZone('');
        if (district) setDistrict('');
        if (storeCode) setStoreCode('');
        if (storeSearchInput) setStoreSearchInput('');

        if (!value) {
            setZoneSearchResults([]);
            setShowZoneSuggestions(false);
            setFocusedZoneSuggestionIndex(-1);
            fetchDistricts('');
            return;
        }
        const results = filterZonesForSearch(value);
        setZoneSearchResults(results);
        setShowZoneSuggestions(true);
        setFocusedZoneSuggestionIndex(results.length ? 0 : -1);
    };

    const handleSelectZone = (value) => {
        const v = value || '';
        setZone(v);
        setZoneSearchInput(v);
        setDistrict('');
        fetchDistricts(v);
        setZoneSearchResults([]);
        setShowZoneSuggestions(false);
        setFocusedZoneSuggestionIndex(-1);
    };

    const handleZoneKeyDown = (e) => {
        if (!showZoneSuggestions || zoneSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedZoneSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, zoneSearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedZoneSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const idx = focusedZoneSuggestionIndex;
            if (idx >= 0 && idx < zoneSearchResults.length) handleSelectZone(zoneSearchResults[idx]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowZoneSuggestions(false);
            setFocusedZoneSuggestionIndex(-1);
        }
    };

    const filterStoresForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(stores) ? stores : [];
        const districtFiltered = district
            ? all.filter(s => String(s?.district || '').trim() === String(district || '').trim())
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
        if (!store?.storeCode) return;
        setStoreCode(store.storeCode);
        setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
        setStoreSearchResults([]);
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
    };

    const handleStoreKeyDown = (e) => {
        if (!showStoreSuggestions || storeSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
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
    };

    useEffect(() => {
        const onDocMouseDown = (e) => {
            const t = e.target;
            if (zoneWrapRef.current && !zoneWrapRef.current.contains(t)) {
                setShowZoneSuggestions(false);
                setFocusedZoneSuggestionIndex(-1);
            }
            if (storeWrapRef.current && !storeWrapRef.current.contains(t)) {
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    const fetchReportData = async () => {
        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Please select both start and end dates'
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense', {
                params: { startDate, endDate, zone, district, storeCode: storeCode || '' },
                headers: { Authorization: `Bearer ${token}` }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch report data'
            });
        } finally {
            setLoading(false);
        }
    };
    searchActionRef.current = fetchReportData;

    const handleDownload = async () => {
        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Please select both start and end dates'
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/export', {
                params: { startDate, endDate, zone, district, storeCode: storeCode || '' },
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Check if response is actually JSON (error)
            if (response.data.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorData.message || 'Failed to download report'
                        });
                    } catch (e) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to download report'
                        });
                    }
                };
                reader.readAsText(response.data);
                return;
            }

            // Create filename: CnEXpReport_<storecode>_<datetime>
            // Attempt to get store code from user details in localStorage, default to "HO"
            let fileStoreCode = 'HO';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user && user.storeCode) {
                        fileStoreCode = user.storeCode;
                    }
                }
            } catch (e) {
                console.warn('Could not parse user info for filename', e);
            }

            const now = new Date();
            // Format: YYYYMMDD_HHmmss
            const dateStr = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');
                
            const filename = `CnEXpReport_${fileStoreCode}_${dateStr}.xlsx`;

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Error downloading report:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to download report'
            });
        } finally {
            setLoading(false);
        }
    };
    exportActionRef.current = handleDownload;

    const formatCurrency = (val) => {
        return val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    };

    const getRowKey = useCallback((row) => {
        const districtName = String(row?.district || '').trim();
        const sc = String(row?.storeCode || '').trim();
        const date = String(row?.date || '').trim();
        return `ce:${districtName}:${sc}:${date}`;
    }, []);

    const visibleRows = useMemo(() => {
        const hidden = hiddenRowKeys || new Set();
        return (reportData || []).filter((r) => !hidden.has(getRowKey(r)));
    }, [getRowKey, hiddenRowKeys, reportData]);

    // Calculate totals dynamically
    const calculateTotal = (key, type) => {
        return visibleRows.reduce((sum, row) => {
            let map;
            if (type === 'tender') map = row.tenders;
            else if (type === 'expense') map = row.expenses;
            else if (type === 'sale') map = row.sales;
            else map = {};
            
            return sum + (map[key] || 0);
        }, 0);
    };

    const calculateRowTotal = (row, type) => {
        const cols = type === 'sale' ? columns.sales : (type === 'expense' ? columns.expenses : columns.tenders);
        if (!cols || !row) return 0;
        
        let map;
        if (type === 'sale') map = row.sales;
        else if (type === 'expense') map = row.expenses;
        else if (type === 'tender') map = row.tenders;
        
        if (!map) return 0;

        return cols.reduce((sum, col) => sum + (map[col] || 0), 0);
    };

    const calculateGroupTotal = (type) => {
        return visibleRows.reduce((sum, row) => sum + calculateRowTotal(row, type), 0);
    };

    const totalColumnsCount = 4 +
        (columns.sales && columns.sales.length > 0 ? columns.sales.length + 1 : 0) + 
        (columns.expenses.length > 0 ? columns.expenses.length + 1 : 0) + 
        (columns.tenders.length > 0 ? columns.tenders.length + 1 : 0);

    const selectableRowKeys = useMemo(() => {
        return (visibleRows || []).map((row) => getRowKey(row));
    }, [getRowKey, visibleRows]);

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

    const hideFocusedRow = useCallback(() => {
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
    }, [focusedRowIndex, selectableRowKeys]);

    const unhideAllRows = useCallback(() => {
        setHiddenRowKeys(new Set());
        try {
            localStorage.removeItem(hiddenStorageKey);
        } catch {}
    }, [hiddenStorageKey]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                searchActionRef.current?.();
                return;
            }
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
    }, [hideFocusedRow, unhideAllRows]);

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

    return (
        <div className="report-container stock-ledger-container stock-ledger-report collection-expense-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Collection & Expense Report</h1>
                <div className="stock-ledger-header-actions">
                    <button
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleDownload}
                        disabled={loading}
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <label>Start Date</label>
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
                <div className="filter-group">
                    <label>End Date</label>
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
                    <label>State</label>
                    <div ref={zoneWrapRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={zoneSearchInput}
                            onChange={handleZoneInputChange}
                            onKeyDown={handleZoneKeyDown}
                            onFocus={() => {
                                const results = filterZonesForSearch(zoneSearchInput);
                                setZoneSearchResults(results);
                                setShowZoneSuggestions(true);
                                setFocusedZoneSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search..."
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showZoneSuggestions && zoneSearchResults.length > 0 && (
                            <div
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
                                {zoneSearchResults.map((z, idx) => (
                                    <div
                                        key={`${z}-${idx}`}
                                        onMouseDown={() => handleSelectZone(z)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedZoneSuggestionIndex ? '#eff6ff' : '#fff'
                                        }}
                                    >
                                        {z}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="filter-group">
                    <label>District</label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Store</label>
                    <div ref={storeWrapRef} style={{ position: 'relative' }}>
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
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showStoreSuggestions && storeSearchResults.length > 0 && (
                            <div
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
                                        key={`${String(s?.storeCode || idx)}-${idx}`}
                                        onMouseDown={() => handleSelectStore(s)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
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
                <button 
                    className="search-btn" 
                    onClick={fetchReportData}
                    disabled={loading}
                >
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
                            <th rowSpan="2" style={{ width: '150px' }}>District</th>
                            <th rowSpan="2" style={{ width: '120px' }}>Store Code</th>
                            <th rowSpan="2" style={{ width: '200px' }}>Store Name</th>
                            <th rowSpan="2" style={{ width: '120px' }}>Date</th>
                            {columns.sales && columns.sales.length > 0 && (
                                <th colSpan={columns.sales.length + 1} className="header-group">SALE</th>
                            )}
                            {columns.expenses.length > 0 && (
                                <th colSpan={columns.expenses.length + 1} className="header-group">EXPENSES</th>
                            )}
                            {columns.tenders.length > 0 && (
                                <th colSpan={columns.tenders.length + 1} className="header-group">TENDER</th>
                            )}
                        </tr>
                        <tr>
                            {columns.sales && columns.sales.length > 0 && (
                                <>
                                    {columns.sales.map(col => (
                                        <th key={`head-sale-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                            {columns.expenses.length > 0 && (
                                <>
                                    {columns.expenses.map(col => (
                                        <th key={`head-expense-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                            {columns.tenders.length > 0 && (
                                <>
                                    {columns.tenders.map(col => (
                                        <th key={`head-tender-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.length > 0 ? (
                            <>
                                {visibleRows.map((row, index) => {
                                    const rowKey = getRowKey(row);
                                    return (
                                    <tr
                                        key={rowKey}
                                        data-row-key={rowKey}
                                        className={[
                                            selectedRowKeys.has(rowKey) ? 'row-selected' : '',
                                            focusedRowIndex === selectableRowIndexByKey.get(rowKey) ? 'row-focused' : ''
                                        ].filter(Boolean).join(' ')}
                                        onMouseDown={() => {
                                            const next = selectableRowIndexByKey.get(rowKey);
                                            if (next === undefined) return;
                                            setFocusedRowIndex(next);
                                        }}
                                        onClick={() => toggleSelectedRow(rowKey)}
                                    >
                                        <td>{row.district}</td>
                                        <td>{row.storeCode}</td>
                                        <td>{row.storeName}</td>
                                        <td>{row.date}</td>
                                        {columns.sales && columns.sales.length > 0 && (
                                            <>
                                                {columns.sales.map(col => (
                                                    <td key={`cell-sale-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.sales ? row.sales[col] : 0)}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'sale'))}
                                                </td>
                                            </>
                                        )}
                                        {columns.expenses.length > 0 && (
                                            <>
                                                {columns.expenses.map(col => (
                                                    <td key={`cell-expense-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.expenses[col])}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'expense'))}
                                                </td>
                                            </>
                                        )}
                                        {columns.tenders.length > 0 && (
                                            <>
                                                {columns.tenders.map(col => (
                                                    <td key={`cell-tender-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.tenders[col])}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'tender'))}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    );
                                })}
                                <tr className="total-row">
                                    <td colSpan="4" style={{ textAlign: 'right' }}>Total:</td>
                                    {columns.sales && columns.sales.length > 0 && (
                                        <>
                                            {columns.sales.map(col => (
                                                <td key={`total-sale-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'sale'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('sale'))}
                                            </td>
                                        </>
                                    )}
                                    {columns.expenses.length > 0 && (
                                        <>
                                            {columns.expenses.map(col => (
                                                <td key={`total-expense-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'expense'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('expense'))}
                                            </td>
                                        </>
                                    )}
                                    {columns.tenders.length > 0 && (
                                        <>
                                            {columns.tenders.map(col => (
                                                <td key={`total-tender-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'tender'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('tender'))}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <td colSpan={totalColumnsCount} className="no-data">
                                    {loading ? 'Loading report data...' : 'No data found for selected criteria'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="search-btn" onClick={hideFocusedRow} disabled={selectableRowKeys.length === 0}>
                    ALT+H Hide
                </button>
                <button type="button" className="search-btn" onClick={unhideAllRows} disabled={hiddenRowKeys.size === 0}>
                    ALT+U Unhide
                </button>
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
                                        handleSelectStore(s);
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
                                                    handleSelectStore(s);
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

export default CollectionExpenseReport;
