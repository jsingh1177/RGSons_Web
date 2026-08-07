import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const CLOSING_STOCK_STORE_WISE_STATE_KEY = 'closingStockStoreWiseState:v1';

const loadClosingStockStoreWiseState = () => {
    try {
        const raw = sessionStorage.getItem(CLOSING_STOCK_STORE_WISE_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const saveClosingStockStoreWiseState = (state) => {
    try {
        sessionStorage.setItem(CLOSING_STOCK_STORE_WISE_STATE_KEY, JSON.stringify(state));
    } catch {}
};

const getDefaultFilters = () => ({
    storeCode: '',
    sizeName: '',
    viewType: 'QtyValue',
    asOnDate: new Date().toISOString().split('T')[0]
});

const ClosingStockStoreWise = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
    const lockedStoreCode = searchParams.get('storeCode') || '';
    const requestedDate = searchParams.get('date') || '';
    const storeLocked = searchParams.get('lockedStore') === 'true' && !!lockedStoreCode;
    const reportTableContainerRef = useRef(null);
    const restoredStateRef = useRef(null);
    const asOnDateRef = useRef(null);
    if (restoredStateRef.current === null) {
        restoredStateRef.current = loadClosingStockStoreWiseState();
    }
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [storeSearchInput, setStoreSearchInput] = useState(() => restoredStateRef.current?.storeSearchInput || '');
    const [filters, setFilters] = useState(() => {
        const stored = restoredStateRef.current?.filters;
        const base = { ...getDefaultFilters(), ...(stored || {}) };
        if (storeLocked && lockedStoreCode) {
            base.storeCode = lockedStoreCode;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
            base.asOnDate = requestedDate;
        }
        return base;
    });
    const hiddenStorageKey = useMemo(() => {
        const sc = String(filters?.storeCode || '').trim();
        const d = String(filters?.asOnDate || '').trim();
        return `RG_hiddenRows_closingStockStoreWise:${sc}:${d}`;
    }, [filters?.storeCode, filters?.asOnDate]);
    const hiddenOrderStorageKey = useMemo(() => {
        const sc = String(filters?.storeCode || '').trim();
        const d = String(filters?.asOnDate || '').trim();
        return `RG_hiddenRowsOrder_closingStockStoreWise:${sc}:${d}`;
    }, [filters?.storeCode, filters?.asOnDate]);
    const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());
    const [hiddenRowOrder, setHiddenRowOrder] = useState(() => []);
    const [reportData, setReportData] = useState(null);
    const [dynamicSizes, setDynamicSizes] = useState([]);
    const [focusedGridRowIndex, setFocusedGridRowIndex] = useState(-1);
    const [selectedGridRowKeys, setSelectedGridRowKeys] = useState(() => new Set());
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
    const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
    const storeSearchWrapRef = useRef(null);
    const storeSuggestionsRef = useRef(null);
    const searchActionRef = useRef(null);
    const exportActionRef = useRef(null);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeModalQuery, setStoreModalQuery] = useState('');
    const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
    const storeModalSearchRef = useRef(null);
    const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);

    const toDdMmYyyy = (iso) => {
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
        const [y, m, d] = iso.split('-');
        return `${d}-${m}-${y}`;
    };

    const storeModalOptions = useMemo(() => {
        const all = Array.isArray(stores) ? stores : [];
        const q = String(storeModalQuery || '').trim().toLowerCase();
        const filtered = q ? all.filter(s => {
            const name = String(s?.storeName || '').trim().toLowerCase();
            const code = String(s?.storeCode || '').trim().toLowerCase();
            return name.includes(q) || code.includes(q);
        }) : all;
        const sorted = [...filtered].sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || '')));
        return sorted.slice(0, 200);
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
            if (e.key === 'F3') {
                if (storeLocked) return;
                if (showStoreModal) return;
                if (showChangePeriodModal) return;
                e.preventDefault();
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
                setStoreModalQuery('');
                const active = [...(Array.isArray(stores) ? stores : [])]
                    .sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || '')))
                    .slice(0, 200);
                const idx = filters?.storeCode
                    ? active.findIndex(s => String(s?.storeCode || '').trim() === String(filters.storeCode || '').trim())
                    : -1;
                setFocusedStoreModalIndex(idx >= 0 ? idx : (active.length ? 0 : -1));
                setShowStoreModal(true);
                return;
            }
            if (e.key === 'F2') {
                if (showChangePeriodModal) return;
                if (showStoreModal) return;
                e.preventDefault();
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
                setShowChangePeriodModal(true);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [filters?.storeCode, showChangePeriodModal, showStoreModal, storeLocked, stores]);

    useEffect(() => {
        console.log('ClosingStockStoreWise loaded - Version 2');
        fetchStores();
    }, []);

    useEffect(() => {
        if (!filters.storeCode) {
            setHiddenRowKeys(new Set());
            setHiddenRowOrder([]);
            return;
        }
        try {
            const raw = localStorage.getItem(hiddenStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            const hiddenList = Array.isArray(parsed) ? parsed.map(v => String(v || '')).filter(Boolean) : [];
            const hiddenSet = new Set(hiddenList);

            const rawOrder = localStorage.getItem(hiddenOrderStorageKey);
            const parsedOrder = rawOrder ? JSON.parse(rawOrder) : [];
            const orderListRaw = Array.isArray(parsedOrder) ? parsedOrder.map(v => String(v || '')).filter(Boolean) : [];

            const orderList = [];
            const seen = new Set();
            orderListRaw.forEach((k) => {
                if (!k) return;
                if (!hiddenSet.has(k)) return;
                if (seen.has(k)) return;
                seen.add(k);
                orderList.push(k);
            });
            hiddenList.forEach((k) => {
                if (!k) return;
                if (seen.has(k)) return;
                seen.add(k);
                orderList.push(k);
            });

            setHiddenRowKeys(hiddenSet);
            setHiddenRowOrder(orderList);
        } catch {
            setHiddenRowKeys(new Set());
            setHiddenRowOrder([]);
        }
    }, [hiddenOrderStorageKey, hiddenStorageKey, filters.storeCode]);

    useEffect(() => {
        if (!filters.storeCode) return;
        try {
            localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
            localStorage.setItem(hiddenOrderStorageKey, JSON.stringify(Array.isArray(hiddenRowOrder) ? hiddenRowOrder : []));
        } catch {}
    }, [filters.storeCode, hiddenOrderStorageKey, hiddenRowKeys, hiddenRowOrder, hiddenStorageKey]);

    useEffect(() => {
        if (storeLocked && lockedStoreCode && filters.storeCode !== lockedStoreCode) {
            setFilters(prev => ({ ...prev, storeCode: lockedStoreCode }));
        }
        if (filters.storeCode) {
            fetchReportData();
        } else {
            setReportData(null);
            setDynamicSizes([]);
            setFilters(prev => (prev.sizeName ? { ...prev, sizeName: '' } : prev));
        }
    }, [filters.storeCode, filters.asOnDate, storeLocked, lockedStoreCode]);

    useEffect(() => {
        if (!filters.sizeName) return;
        if (!dynamicSizes || dynamicSizes.length === 0) return;
        if (dynamicSizes.includes(filters.sizeName)) return;
        setFilters(prev => (prev.sizeName ? { ...prev, sizeName: '' } : prev));
    }, [dynamicSizes, filters.sizeName]);

    useEffect(() => {
        saveClosingStockStoreWiseState({
            filters,
            storeSearchInput
        });
    }, [filters, storeSearchInput]);

    useEffect(() => {
        if (!filters.storeCode) return;
        const store = stores.find(s => s.storeCode === filters.storeCode);
        if (store) {
            const display = `${store.storeName} (${store.storeCode})`;
            if (storeSearchInput !== display) setStoreSearchInput(display);
        }
    }, [filters.storeCode, stores]);

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

    const getItemRowKey = (catIndex, itemName) => `${catIndex}|${String(itemName || '')}`;

    const selectableItemRowKeys = useMemo(() => {
        const cats = Array.isArray(reportData?.categories) ? reportData.categories : [];
        const keys = [];
        cats.forEach((category, catIndex) => {
            const groups = {};
            (Array.isArray(category?.items) ? category.items : []).forEach((item) => {
                const nm = String(item?.itemName || '');
                if (!groups[nm]) groups[nm] = true;
            });
            Object.keys(groups).forEach((itemName) => {
                const k = getItemRowKey(catIndex, itemName);
                if (!hiddenRowKeys.has(k)) keys.push(k);
            });
        });
        return keys;
    }, [reportData, hiddenRowKeys]);

    const selectableItemRowIndexByKey = useMemo(() => {
        const map = new Map();
        selectableItemRowKeys.forEach((k, idx) => map.set(k, idx));
        return map;
    }, [selectableItemRowKeys]);

    const selectableItemRowSearch = useMemo(() => {
        return (selectableItemRowKeys || []).map((k, idx) => {
            const sep = String(k || '').indexOf('|');
            const name = sep >= 0 ? String(k).slice(sep + 1) : String(k || '');
            const normalized = String(name || '').trim().toLowerCase();
            return { idx, name, normalized };
        });
    }, [selectableItemRowKeys]);

    useEffect(() => {
        if (!selectableItemRowKeys || selectableItemRowKeys.length === 0) {
            setFocusedGridRowIndex(-1);
            setSelectedGridRowKeys(new Set());
            return;
        }
        setFocusedGridRowIndex((prev) => (prev >= 0 && prev < selectableItemRowKeys.length ? prev : 0));
        setSelectedGridRowKeys((prev) => {
            if (!prev || prev.size === 0) return prev;
            const allowed = new Set(selectableItemRowKeys);
            const next = new Set();
            prev.forEach((k) => {
                if (allowed.has(k)) next.add(k);
            });
            return next;
        });
    }, [selectableItemRowKeys]);

    useEffect(() => {
        if (loading) return;
        if (!filters.storeCode) return;
        if (!reportData?.categories) return;
        const el = reportTableContainerRef.current;
        if (!el) return;
        try {
            el.focus();
        } catch {}
    }, [loading, filters.storeCode, reportData]);

    useEffect(() => {
        if (focusedGridRowIndex < 0) return;
        const el = reportTableContainerRef.current?.querySelector(`[data-row-index="${focusedGridRowIndex}"]`);
        if (el && typeof el.scrollIntoView === 'function') {
            try {
                el.scrollIntoView({ block: 'nearest' });
            } catch {}
        }
    }, [focusedGridRowIndex]);

    const fetchStores = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/stores', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.success) {
                setStores(response.data.stores);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/closing-stock/detailed', {
                params: {
                    storeCode: filters.storeCode,
                    date: filters.asOnDate
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
            processReportData(data);
            setReportData(data);
        } catch (error) {
            console.error('Error fetching report:', error);
            Swal.fire('Error', 'Failed to fetch report data', 'error');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };
    searchActionRef.current = fetchReportData;

    const processReportData = (data) => {
        if (!data || !data.categories) {
            setDynamicSizes([]);
            return;
        }

        // Use sorted sizes from backend if available
        if (data.sortedSizes && data.sortedSizes.length > 0) {
            setDynamicSizes(data.sortedSizes);
            return;
        }

        // Extract all unique sizes from all items across all categories
        // Use Set to maintain insertion order if the API returns items in a consistent order (which it does: size order)
        const sizesSet = new Set();
        data.categories.forEach(cat => {
            cat.items.forEach(item => {
                if (item.sizeName) sizesSet.add(item.sizeName);
            });
        });

        const sizes = Array.from(sizesSet);
        setDynamicSizes(sizes);
    };

    const getSelectedStoreName = () => {
        const store = stores.find(s => s.storeCode === filters.storeCode);
        return store ? store.storeName : '';
    };

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

    const applyStoreCode = (next) => {
        setFilters(prev => ({ ...prev, storeCode: next }));
        setReportData(null);
        setDynamicSizes([]);
    };

    const handleStoreInputChange = (e) => {
        const value = e.target.value;
        setStoreSearchInput(value);
        if (filters.storeCode) {
            setFilters(prev => ({ ...prev, storeCode: '' }));
            setReportData(null);
            setDynamicSizes([]);
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

    // Helper to group items by name within a category
    const groupItemsByName = (items) => {
        const groups = {};
        items.forEach(item => {
            if (!groups[item.itemName]) {
                groups[item.itemName] = {};
            }
            groups[item.itemName][item.sizeName] = item;
        });
        return groups;
    };

    // Calculation helpers
    const showQty = filters.viewType === 'Qty' || filters.viewType === 'QtyValue';
    const showValue = filters.viewType === 'Value' || filters.viewType === 'QtyValue';
    const colSpanPerSize = (showQty ? 1 : 0) + (showValue ? 1 : 0);
    const visibleSizes = useMemo(() => {
        if (!filters.sizeName) return dynamicSizes || [];
        return [filters.sizeName];
    }, [dynamicSizes, filters.sizeName]);

    const getCategorySizeTotal = (items, sizeName) => {
        let totalQty = 0;
        let totalAmt = 0;
        items.forEach(item => {
            if (item.sizeName === sizeName) {
                totalQty += item.qty;
                totalAmt += item.amount;
            }
        });
        return { qty: totalQty, amount: totalAmt };
    };

    const getGrandSizeTotal = (categories, sizeName) => {
        let totalQty = 0;
        let totalAmt = 0;
        if (!categories) return { qty: 0, amount: 0 };
        categories.forEach(cat => {
             cat.items.forEach(item => {
                if (item.sizeName === sizeName) {
                    totalQty += item.qty;
                    totalAmt += item.amount;
                }
             });
        });
        return { qty: totalQty, amount: totalAmt };
    };

    const handleExport = async () => {
        if (!filters.storeCode) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/closing-stock/export', {
                params: {
                    storeCode: filters.storeCode,
                    date: filters.asOnDate
                },
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const storeName = getSelectedStoreName().replace(/[^a-zA-Z0-9]/g, '_');
            link.setAttribute('download', `ClosingStock_${storeName}_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            Swal.fire('Error', 'Failed to export report', 'error');
        }
    };
    exportActionRef.current = handleExport;

    const handleQtyClick = (itemDetail) => {
        if (!itemDetail?.itemCode || !itemDetail?.sizeCode || !filters.storeCode) return;
        const params = new URLSearchParams({
            storeCode: filters.storeCode,
            itemCode: itemDetail.itemCode,
            sizeCode: itemDetail.sizeCode,
            asOnDate: filters.asOnDate
        });
        navigate(`/stock-ledger-report?${params.toString()}`);
    };

    const toggleSelectedRow = (rowKey) => {
        if (!rowKey) return;
        setSelectedGridRowKeys((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const hideSelectedOrFocusedRows = useCallback(() => {
        if (!selectableItemRowKeys || selectableItemRowKeys.length === 0) return;
        const selected = selectedGridRowKeys || new Set();
        const hasSelection = selected.size > 0;
        const idx = focusedGridRowIndex >= 0 ? focusedGridRowIndex : 0;
        const focusedKey = selectableItemRowKeys[idx];
        const keysToHide = hasSelection
            ? selectableItemRowKeys.filter((k) => selected.has(k))
            : (focusedKey ? [focusedKey] : []);
        if (keysToHide.length === 0) return;

        setHiddenRowKeys((prev) => {
            const next = new Set(prev);
            keysToHide.forEach((k) => next.add(k));
            return next;
        });
        setHiddenRowOrder((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            const existing = new Set(current);
            const next = [...current];
            keysToHide.forEach((k) => {
                if (!k) return;
                if (hiddenRowKeys.has(k)) return;
                if (existing.has(k)) return;
                existing.add(k);
                next.push(k);
            });
            return next;
        });
        setSelectedGridRowKeys((prev) => {
            const next = new Set(prev);
            keysToHide.forEach((k) => next.delete(k));
            return next;
        });
    }, [focusedGridRowIndex, hiddenRowKeys, selectableItemRowKeys, selectedGridRowKeys]);

    const unhideLastRow = useCallback(() => {
        setHiddenRowOrder((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            if (current.length === 0) return current;
            const nextOrder = [...current];
            let keyToUnhide = '';
            while (nextOrder.length > 0) {
                const candidate = String(nextOrder[nextOrder.length - 1] || '');
                nextOrder.pop();
                if (!candidate) continue;
                keyToUnhide = candidate;
                break;
            }
            if (keyToUnhide) {
                setHiddenRowKeys((prevKeys) => {
                    const nextKeys = new Set(prevKeys);
                    nextKeys.delete(keyToUnhide);
                    return nextKeys;
                });
            }
            return nextOrder;
        });
    }, []);

    const unhideAllRows = useCallback(() => {
        setHiddenRowKeys(new Set());
        setHiddenRowOrder([]);
        try {
            localStorage.removeItem(hiddenStorageKey);
            localStorage.removeItem(hiddenOrderStorageKey);
        } catch {}
    }, [hiddenOrderStorageKey, hiddenStorageKey]);

    useEffect(() => {
        const onKeyDown = (e) => {
            const k = String(e.key || '').toLowerCase();
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
            if (k === 'u' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                unhideAllRows();
                return;
            }
            if (!e.altKey) return;
            if (e.ctrlKey || e.metaKey) return;
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
                unhideLastRow();
                return;
            }
            if (k !== 'h' && k !== 'r') return;
            e.preventDefault();
            hideSelectedOrFocusedRows();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [hideSelectedOrFocusedRows, unhideAllRows, unhideLastRow]);

    const handleReportTableKeyDown = (e) => {
        const el = reportTableContainerRef.current;
        if (!el) return;

        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

        if (!e.altKey && !e.ctrlKey && !e.metaKey && e.shiftKey && String(e.key || '').toLowerCase() === 'u') {
            e.preventDefault();
            unhideAllRows();
            return;
        }

        if (!e.altKey && !e.ctrlKey && !e.metaKey && typeof e.key === 'string' && /^[a-zA-Z]$/.test(e.key)) {
            if (!selectableItemRowSearch || selectableItemRowSearch.length === 0) return;
            e.preventDefault();
            const letter = String(e.key).toLowerCase();
            const startFrom = focusedGridRowIndex >= 0 ? focusedGridRowIndex + 1 : 0;
            let match = selectableItemRowSearch.find(r => r.idx >= startFrom && r.normalized.startsWith(letter));
            if (!match) match = selectableItemRowSearch.find(r => r.normalized.startsWith(letter));
            if (match) setFocusedGridRowIndex(match.idx);
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
            if (!selectableItemRowKeys || selectableItemRowKeys.length === 0) return;
            setFocusedGridRowIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!selectableItemRowKeys || selectableItemRowKeys.length === 0) return;
            setFocusedGridRowIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, selectableItemRowKeys.length - 1);
                return next;
            });
            return;
        }
        if (e.key === ' ') {
            e.preventDefault();
            if (!selectableItemRowKeys || selectableItemRowKeys.length === 0) return;
            const idx = focusedGridRowIndex;
            if (idx < 0 || idx >= selectableItemRowKeys.length) return;
            toggleSelectedRow(selectableItemRowKeys[idx]);
        }
    };

    return (
        <div className="closing-stock-store-wise-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Closing Stock Store Wise</h1>
                <div className="stock-ledger-header-actions">
                    <div className="stock-ledger-header-date-inline">
                        <span className="stock-ledger-header-date-caption">As On Date</span>
                        <div className="date-picker-wrapper stock-ledger-header-date">
                            <Calendar className="date-picker-icon" size={18} />
                            <button
                                type="button"
                                className="date-picker-button"
                                onClick={openAsOnDatePicker}
                                disabled={!filters.storeCode}
                            >
                                {toDdMmYyyy(filters.asOnDate)}
                            </button>
                            <input
                                ref={asOnDateRef}
                                type="date"
                                value={filters.asOnDate}
                                onChange={(e) => setFilters({ ...filters, asOnDate: e.target.value })}
                                disabled={!filters.storeCode}
                                className="date-picker-native"
                            />
                        </div>
                    </div>
                    <button
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleExport}
                        disabled={!filters.storeCode || loading}
                    >
                        <Download size={18} />
                        <span>Excel</span>
                    </button>
                </div>
            </header>

            <div className="filters-section">
                <div className="filter-group filter-group-store">
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
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{st.storeName}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {st.storeCode}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-group filter-group-size">
                    <label>Size:</label>
                    <select
                        value={filters.sizeName}
                        onChange={(e) => setFilters({ ...filters, sizeName: e.target.value })}
                        disabled={!filters.storeCode}
                    >
                        <option value="">All Sizes</option>
                        {(dynamicSizes || []).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group filter-group-view">
                    <label>View:</label>
                    <select 
                        value={filters.viewType} 
                        onChange={(e) => setFilters({...filters, viewType: e.target.value})}
                        disabled={!filters.storeCode}
                    >
                        <option value="Qty">Quantity Only</option>
                        <option value="Value">Value Only</option>
                        <option value="QtyValue">Quantity With Amount</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="report-loading-container-unique">Loading report data...</div>
            ) : !filters.storeCode ? (
                <div className="report-loading-container-unique">Select a store to view the report.</div>
            ) : reportData && reportData.categories ? (
                <div
                    ref={reportTableContainerRef}
                    className="table-container"
                    tabIndex={0}
                    onKeyDown={handleReportTableKeyDown}
                    onClick={() => reportTableContainerRef.current?.focus()}
                >
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="left-align">Item Name & Size</th>
                                {visibleSizes.map(size => (
                                    <th key={size} colSpan={colSpanPerSize}>{size}</th>
                                ))}
                                <th colSpan={colSpanPerSize}>Total</th>
                            </tr>
                            <tr>
                                {visibleSizes.map(size => (
                                    <React.Fragment key={size}>
                                        {showQty && <th>Qty</th>}
                                        {showValue && <th>Amount</th>}
                                    </React.Fragment>
                                ))}
                                {showQty && <th>Qty</th>}
                                {showValue && <th>Amount</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.categories.map((category, catIndex) => {
                                const itemGroups = groupItemsByName(category.items);
                                return (
                                    <React.Fragment key={catIndex}>
                                        {/* Category Header */}
                                        <tr className="category-header">
                                            <td colSpan={1 + (visibleSizes.length * colSpanPerSize) + colSpanPerSize}>
                                                {category.categoryName}
                                            </td>
                                        </tr>
                                        
                                        {/* Items */}
                                        {Object.entries(itemGroups).map(([itemName, sizeMap]) => {
                                            const rowKey = getItemRowKey(catIndex, itemName);
                                            if (hiddenRowKeys.has(rowKey)) return null;
                                            const rowIndex = selectableItemRowIndexByKey.get(rowKey);
                                            // Calculate row total
                                            let rowTotalQty = 0;
                                            let rowTotalAmt = 0;
                                            visibleSizes.forEach(size => {
                                                const item = sizeMap[size];
                                                if (item) {
                                                    rowTotalQty += item.qty;
                                                    rowTotalAmt += item.amount;
                                                }
                                            });

                                            return (
                                                <tr
                                                    key={itemName}
                                                    data-row-index={typeof rowIndex === 'number' ? rowIndex : undefined}
                                                    className={[
                                                        rowKey && selectedGridRowKeys.has(rowKey) ? 'row-selected' : '',
                                                        typeof rowIndex === 'number' && rowIndex === focusedGridRowIndex ? 'row-focused' : ''
                                                    ].filter(Boolean).join(' ')}
                                                    onMouseDown={() => {
                                                        if (typeof rowIndex === 'number') setFocusedGridRowIndex(rowIndex);
                                                    }}
                                                    onClick={(ev) => {
                                                        const target = ev?.target;
                                                        const isInteractive = target?.closest?.('button,a,input,select,textarea');
                                                        if (isInteractive) return;
                                                        if (!rowKey) return;
                                                        toggleSelectedRow(rowKey);
                                                    }}
                                                >
                                                    <td className="item-name">{itemName}</td>
                                                    {visibleSizes.map(size => {
                                                        const item = sizeMap[size];
                                                        return (
                                                            <React.Fragment key={size}>
                                                                {showQty && (
                                                                    <td>
                                                                        {item ? (
                                                                            <button
                                                                                type="button"
                                                                                className="qty-link"
                                                                                onClick={() => handleQtyClick(item)}
                                                                            >
                                                                                {item.qty}
                                                                            </button>
                                                                        ) : (
                                                                            ''
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {showValue && <td>{item ? item.amount.toFixed(2) : ''}</td>}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {showQty && <td>{rowTotalQty}</td>}
                                                    {showValue && <td>{rowTotalAmt.toFixed(2)}</td>}
                                                </tr>
                                            );
                                        })}

                                        {/* Category Subtotal */}
                                        <tr className="category-subtotal">
                                            <td className="left-align">{category.categoryName} Total</td>
                                            {visibleSizes.map(size => {
                                                const total = getCategorySizeTotal(category.items, size);
                                                return (
                                                    <React.Fragment key={size}>
                                                        {showQty && <td>{total.qty}</td>}
                                                        {showValue && <td>{total.amount.toFixed(2)}</td>}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {showQty && <td>{category.totalQty}</td>}
                                            {showValue && <td>{category.totalAmount.toFixed(2)}</td>}
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* Grand Total */}
                            <tr className="grand-total">
                                <td className="left-align">Grand Total</td>
                                {visibleSizes.map(size => {
                                    const total = getGrandSizeTotal(reportData.categories, size);
                                    return (
                                        <React.Fragment key={size}>
                                            {showQty && <td>{total.qty}</td>}
                                            {showValue && <td>{total.amount.toFixed(2)}</td>}
                                        </React.Fragment>
                                    );
                                })}
                                {showQty && <td>{reportData.grandTotalQty}</td>}
                                {showValue && <td>{reportData.grandTotalAmount.toFixed(2)}</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="report-loading-container-unique">No data found.</div>
            )}
            <footer style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="search-btn search-btn-compact" onClick={hideSelectedOrFocusedRows} disabled={!filters.storeCode || !selectableItemRowKeys || selectableItemRowKeys.length === 0}>
                    ALT+R Hide
                </button>
                <button type="button" className="search-btn search-btn-compact" onClick={unhideLastRow} disabled={!filters.storeCode || hiddenRowOrder.length === 0}>
                    ALT+U Unhide
                </button>
                <button type="button" className="search-btn search-btn-compact" onClick={unhideAllRows} disabled={!filters.storeCode || hiddenRowKeys.size === 0}>
                    SHIFT+U Unhide All
                </button>
            </footer>

            <ChangePeriodModal
                open={showChangePeriodModal}
                startDate={filters.asOnDate}
                endDate={filters.asOnDate}
                onClose={() => setShowChangePeriodModal(false)}
                onApply={({ startDate: sd, endDate: ed }) => {
                    const next = String(ed || sd || '').trim();
                    if (next) {
                        setFilters(prev => ({ ...prev, asOnDate: next }));
                    }
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
                                        setFocusedStoreModalIndex((prev) => Math.min((prev < 0 ? 0 : prev + 1), Math.max(0, storeModalOptions.length - 1)));
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
                                        const st = idx >= 0 ? storeModalOptions[idx] : null;
                                        if (!st) return;
                                        handleSelectStore(st);
                                        setShowStoreModal(false);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Search store code or name"
                                autoComplete="off"
                            />
                            <div className="mt-3 max-h-[60vh] overflow-auto border border-slate-100 rounded">
                                {storeModalOptions.length === 0 ? (
                                    <div className="p-3 text-sm text-slate-500">No stores</div>
                                ) : (
                                    storeModalOptions.map((st, idx) => {
                                        const name = String(st?.storeName || '').trim();
                                        const code = String(st?.storeCode || '').trim();
                                        const focused = idx === focusedStoreModalIndex;
                                        return (
                                            <button
                                                key={`${code || idx}:${idx}`}
                                                type="button"
                                                className={[
                                                    'w-full text-left px-3 py-2',
                                                    focused ? 'bg-indigo-50' : 'bg-white',
                                                    'hover:bg-indigo-50'
                                                ].join(' ')}
                                                onMouseEnter={() => setFocusedStoreModalIndex(idx)}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    handleSelectStore(st);
                                                    setShowStoreModal(false);
                                                }}
                                            >
                                                <div className="text-sm text-slate-800 font-semibold">{name || code}</div>
                                                <div className="text-xs text-slate-500 font-mono">{code}</div>
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

export default ClosingStockStoreWise;
