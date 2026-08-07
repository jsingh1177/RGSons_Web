import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Calendar, Download, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './ClosingStockReport.css';

const CLOSING_STOCK_REPORT_STATE_KEY = 'closingStockReportState:v1';

const loadClosingStockReportState = () => {
    try {
        const raw = sessionStorage.getItem(CLOSING_STOCK_REPORT_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const saveClosingStockReportState = (state) => {
    try {
        sessionStorage.setItem(CLOSING_STOCK_REPORT_STATE_KEY, JSON.stringify(state));
    } catch {}
};

const getDefaultFilters = () => ({
    district: '',
    storeType: '',
    storeCode: '',
    itemQuery: '',
    sizeCode: '',
    viewType: 'QtyValue',
    date: new Date().toISOString().slice(0, 10)
});

const ClosingStockReport = () => {
    const navigate = useNavigate();
    const tableContainerRef = useRef(null);
    const dateRef = useRef(null);
    const restoredStateRef = useRef(null);
    const autoRefreshDoneRef = useRef(false);
    const searchActionRef = useRef(null);
    const exportActionRef = useRef(null);
    const storeSearchWrapRef = useRef(null);
    const storeSuggestionsRef = useRef(null);
    const storeModalSearchRef = useRef(null);
    const itemSearchWrapRef = useRef(null);
    const itemSuggestionsRef = useRef(null);
    if (restoredStateRef.current === null) {
        restoredStateRef.current = loadClosingStockReportState();
    }
    const [stores, setStores] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [storeSearchInput, setStoreSearchInput] = useState(() => restoredStateRef.current?.storeSearchInput || '');
    const [itemSearchInput, setItemSearchInput] = useState(() => restoredStateRef.current?.itemSearchInput || '');
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [itemSearchResults, setItemSearchResults] = useState([]);
    const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
    const [showItemSuggestions, setShowItemSuggestions] = useState(false);
    const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
    const [focusedItemSuggestionIndex, setFocusedItemSuggestionIndex] = useState(-1);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeModalQuery, setStoreModalQuery] = useState('');
    const [focusedStoreModalIndex, setFocusedStoreModalIndex] = useState(-1);
    const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
    const [filters, setFilters] = useState(() => {
        const storedFilters = restoredStateRef.current?.filters;
        if (!storedFilters) return getDefaultFilters();
        return { ...getDefaultFilters(), ...storedFilters };
    });
    const filtersRef = useRef(filters);
    const [columns, setColumns] = useState(() => restoredStateRef.current?.columns || []);
    const [data, setData] = useState(() => restoredStateRef.current?.data || []);
    const [detailedData, setDetailedData] = useState(() => restoredStateRef.current?.detailedData || null);
    const [didSearch, setDidSearch] = useState(() => restoredStateRef.current?.didSearch || false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
    const [expandedDistricts, setExpandedDistricts] = useState(() => new Set(restoredStateRef.current?.expandedDistricts || []));
    const hiddenStorageKey = useMemo(() => {
        const parts = [
            String(filters?.date || '').trim(),
            String(filters?.district || '').trim(),
            String(filters?.storeType || '').trim(),
            String(filters?.storeCode || '').trim(),
            String(filters?.itemQuery || '').trim().toLowerCase(),
            String(filters?.sizeCode || '').trim(),
            detailedData ? 'detailed' : 'matrix'
        ];
        return `RG_hiddenRows_closingStockDistrictWise:${parts.join('|')}`;
    }, [filters?.date, filters?.district, filters?.storeType, filters?.storeCode, filters?.itemQuery, filters?.sizeCode, detailedData]);
    const hiddenOrderStorageKey = useMemo(() => `${hiddenStorageKey}:order`, [hiddenStorageKey]);
    const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());
    const [hiddenRowOrder, setHiddenRowOrder] = useState(() => []);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => {
        fetchStores();
        fetchSizes();
    }, []);

    useEffect(() => {
        saveClosingStockReportState({
            filters,
            columns,
            data,
            detailedData,
            didSearch,
            storeSearchInput,
            itemSearchInput,
            expandedDistricts: Array.from(expandedDistricts)
        });
    }, [filters, columns, data, detailedData, didSearch, storeSearchInput, itemSearchInput, expandedDistricts]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(hiddenStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            const hiddenList = Array.isArray(parsed) ? parsed.map(v => String(v || '')).filter(Boolean) : [];
            const hiddenSet = new Set(hiddenList);

            const rawOrder = localStorage.getItem(hiddenOrderStorageKey);
            const parsedOrder = rawOrder ? JSON.parse(rawOrder) : [];
            const orderListRaw = Array.isArray(parsedOrder) ? parsedOrder.map(v => String(v || '')).filter(Boolean) : [];
            const nextOrder = [];
            const seen = new Set();
            orderListRaw.forEach((k) => {
                if (!k || seen.has(k) || !hiddenSet.has(k)) return;
                seen.add(k);
                nextOrder.push(k);
            });
            hiddenList.forEach((k) => {
                if (!k || seen.has(k)) return;
                seen.add(k);
                nextOrder.push(k);
            });
            setHiddenRowKeys(hiddenSet);
            setHiddenRowOrder(nextOrder);
        } catch {
            setHiddenRowKeys(new Set());
            setHiddenRowOrder([]);
        }
    }, [hiddenOrderStorageKey, hiddenStorageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hiddenRowKeys)));
            localStorage.setItem(hiddenOrderStorageKey, JSON.stringify(Array.isArray(hiddenRowOrder) ? hiddenRowOrder : []));
        } catch {}
    }, [hiddenOrderStorageKey, hiddenRowKeys, hiddenRowOrder, hiddenStorageKey]);

    useEffect(() => {
        const selectedStore = stores.find(s => String(s?.storeCode || '').trim() === String(filters.storeCode || '').trim());
        if (selectedStore) {
            const display = `${selectedStore.storeName} (${selectedStore.storeCode})`;
            if (storeSearchInput !== display) setStoreSearchInput(display);
        } else if (!filters.storeCode && storeSearchInput && restoredStateRef.current?.storeSearchInput !== storeSearchInput) {
            // keep user typed text while searching; no-op here
        }
    }, [filters.storeCode, stores, storeSearchInput]);

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
        if (!showItemSuggestions) return;
        const idx = focusedItemSuggestionIndex;
        if (idx < 0) return;
        const container = itemSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showItemSuggestions, focusedItemSuggestionIndex]);

    useEffect(() => {
        if (!showStoreModal) return;
        window.setTimeout(() => {
            try {
                storeModalSearchRef.current?.focus?.();
                storeModalSearchRef.current?.select?.();
            } catch {}
        }, 50);
    }, [showStoreModal]);

    const fetchStores = async () => {
        try {
            const response = await axios.get('/api/stores');
            if (response.data && response.data.success) {
                setStores(response.data.stores);
            }
        } catch (err) {
            console.error("Error fetching stores", err);
        }
    };

    const fetchSizes = async () => {
        try {
            const response = await axios.get('/api/sizes');
            if (response.data && response.data.success) {
                setSizes(response.data.sizes || []);
            }
        } catch (err) {
            console.error("Error fetching sizes", err);
        }
    };

    const openStoreWiseReport = useCallback((storeCode) => {
        const normalizedStoreCode = String(storeCode || '').trim();
        if (!normalizedStoreCode) return;
        const params = new URLSearchParams({
            storeCode: normalizedStoreCode,
            lockedStore: 'true'
        });
        if (filters?.date) params.set('date', filters.date);
        navigate(`/closing-stock-store-wise?${params.toString()}`);
    }, [filters?.date, navigate]);

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

    const filterStoresForSearch = useCallback((value) => {
        const v = String(value || '').trim().toLowerCase();
        const all = Array.isArray(stores) ? stores : [];
        if (!v) return [...all].sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || ''))).slice(0, 50);
        return all
            .filter(s => {
                const name = String(s?.storeName || '').toLowerCase();
                const code = String(s?.storeCode || '').toLowerCase();
                return name.includes(v) || code.includes(v);
            })
            .sort((a, b) => String(a?.storeName || '').localeCompare(String(b?.storeName || '')))
            .slice(0, 50);
    }, [stores]);

    const applyStoreCode = useCallback((nextStoreCode) => {
        setFilters(prev => ({ ...prev, storeCode: nextStoreCode || '' }));
    }, []);

    const handleSelectStore = useCallback((store) => {
        if (!store?.storeCode) return;
        applyStoreCode(store.storeCode);
        setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
        setStoreSearchResults([]);
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
        setShowStoreModal(false);
    }, [applyStoreCode]);

    const handleStoreInputChange = useCallback((e) => {
        const value = e.target.value;
        setStoreSearchInput(value);
        if (filters.storeCode) {
            setFilters(prev => ({ ...prev, storeCode: '' }));
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
    }, [filterStoresForSearch, filters.storeCode]);

    const handleStoreKeyDown = useCallback((e) => {
        if (!showStoreSuggestions || storeSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
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
    }, [focusedStoreSuggestionIndex, handleSelectStore, showStoreSuggestions, storeSearchResults]);

    const searchItemsForInput = useCallback(async (value) => {
        const q = String(value || '').trim();
        if (!q) return [];
        try {
            const res = await axios.get(`/api/items/search?query=${encodeURIComponent(q)}`);
            if (res.data?.success && Array.isArray(res.data.items)) {
                return res.data.items.slice(0, 50);
            }
        } catch (err) {
            console.error('Error searching items', err);
        }
        return [];
    }, []);

    const handleSelectItem = useCallback((item) => {
        if (!item) return;
        const itemCode = String(item.itemCode || '').trim();
        const itemName = String(item.itemName || '').trim();
        const display = itemCode ? `${itemName || itemCode} (${itemCode})` : (itemName || '');
        setItemSearchInput(display);
        setFilters(prev => ({ ...prev, itemQuery: itemCode || itemName || '' }));
        setItemSearchResults([]);
        setShowItemSuggestions(false);
        setFocusedItemSuggestionIndex(-1);
    }, []);

    const handleItemInputChange = useCallback(async (e) => {
        const value = e.target.value;
        setItemSearchInput(value);
        setFilters(prev => ({ ...prev, itemQuery: value }));
        if (!value.trim()) {
            setItemSearchResults([]);
            setShowItemSuggestions(false);
            setFocusedItemSuggestionIndex(-1);
            return;
        }
        const results = await searchItemsForInput(value);
        setItemSearchResults(results);
        setShowItemSuggestions(true);
        setFocusedItemSuggestionIndex(results.length ? 0 : -1);
    }, [searchItemsForInput]);

    const handleItemKeyDown = useCallback((e) => {
        if (!showItemSuggestions || itemSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedItemSuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, itemSearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedItemSuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
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
    }, [focusedItemSuggestionIndex, handleSelectItem, itemSearchResults, showItemSuggestions]);

    const handleSearch = useCallback(async () => {
        setDidSearch(true);
        setLoading(true);
        setError('');
        setData([]);
        setDetailedData(null);
        
        try {
            const activeFilters = filtersRef.current;
            if (activeFilters.storeCode) {
                // Detailed Report
                const response = await axios.get('/api/reports/closing-stock/detailed', { 
                    params: { 
                        district: activeFilters.district,
                        storeType: activeFilters.storeType,
                        storeCode: activeFilters.storeCode,
                        itemQuery: activeFilters.itemQuery,
                        sizeCode: activeFilters.sizeCode,
                        date: activeFilters.date
                    } 
                });
                setDetailedData(response.data);
            } else {
                // Matrix Report
                const [colsRes, dataRes] = await Promise.all([
                    axios.get('/api/reports/closing-stock/columns', { params: activeFilters }),
                    axios.get('/api/reports/closing-stock', { params: activeFilters })
                ]);
                setColumns(colsRes.data);
                setData(dataRes.data);
                setExpandedDistricts(new Set());
            }
        } catch (err) {
            setError('Failed to fetch report data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);
    searchActionRef.current = handleSearch;

    useEffect(() => {
        if (autoRefreshDoneRef.current) return;
        if (!restoredStateRef.current?.didSearch) return;
        autoRefreshDoneRef.current = true;
        handleSearch();
    }, [handleSearch]);

    const handleExport = async () => {
        try {
            const exportParams = { ...filters };
            if (!filters.storeCode) {
                exportParams.expandedDistricts = Array.from(expandedDistricts).join('|');
            }
            const response = await axios.get('/api/reports/closing-stock/export', {
                params: exportParams,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ClosingStockReport_${new Date().toISOString().slice(0,10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export failed", err);
            alert("Export failed");
        }
    };
    exportActionRef.current = handleExport;

    const calculateGrandTotalQty = (col) => {
        return data.reduce((sum, row) => sum + (row.categoryQuantities[col] || 0), 0);
    };

    const calculateGrandTotalAmount = (col) => {
        return data.reduce((sum, row) => sum + (row.categoryAmounts[col] || 0), 0);
    };
    
    const calculateTotalQty = () => {
        return data.reduce((sum, row) => sum + row.totalQty, 0);
    }
    
    const calculateTotalAmount = () => {
        return data.reduce((sum, row) => sum + row.totalAmount, 0);
    }

    const formatQty = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return '';
        return num.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        });
    };

    const formatAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return '';
        return num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const toDdMmYyyy = (iso) => {
        if (!iso) return '';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return String(iso);
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const openDatePicker = () => {
        const el = dateRef.current;
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

    const districtGroups = useMemo(() => {
        const groups = new Map();
        (data || []).forEach((row, idx) => {
            const district = String(row?.district || '').trim() || 'Unknown';
            const store = String(row?.storeName || '').trim();
            const storeKey = `m:${district}:${store}:${idx}`;
            const existing = groups.get(district) || {
                district,
                key: `g:${district}`,
                stores: [],
                categoryQuantities: {},
                categoryAmounts: {},
                totalQty: 0,
                totalAmount: 0
            };
            columns.forEach((col) => {
                existing.categoryQuantities[col] = (existing.categoryQuantities[col] || 0) + Number(row?.categoryQuantities?.[col] || 0);
                existing.categoryAmounts[col] = (existing.categoryAmounts[col] || 0) + Number(row?.categoryAmounts?.[col] || 0);
            });
            existing.totalQty += Number(row?.totalQty || 0);
            existing.totalAmount += Number(row?.totalAmount || 0);
            existing.stores.push({
                ...row,
                __rowKey: storeKey,
                __district: district
            });
            groups.set(district, existing);
        });
        return Array.from(groups.values());
    }, [columns, data]);

    const displayedMatrixRows = useMemo(() => {
        const rows = [];
        districtGroups.forEach((group) => {
            if (expandedDistricts.has(group.district)) {
                group.stores.forEach((storeRow) => {
                    rows.push({
                        type: 'store',
                        key: storeRow.__rowKey,
                        district: storeRow.district,
                        storeCode: storeRow.storeCode,
                        storeName: storeRow.storeName,
                        categoryQuantities: storeRow.categoryQuantities,
                        categoryAmounts: storeRow.categoryAmounts,
                        totalQty: storeRow.totalQty,
                        totalAmount: storeRow.totalAmount
                    });
                });
            } else {
                rows.push({
                    type: 'district',
                    key: group.key,
                    district: group.district,
                    storeName: '',
                    categoryQuantities: group.categoryQuantities,
                    categoryAmounts: group.categoryAmounts,
                    totalQty: group.totalQty,
                    totalAmount: group.totalAmount
                });
            }
        });
        return rows.filter((row) => !hiddenRowKeys.has(row.key));
    }, [districtGroups, expandedDistricts, hiddenRowKeys]);

    const allDistrictsExpanded = useMemo(() => {
        if (!districtGroups.length) return false;
        return districtGroups.every((group) => expandedDistricts.has(group.district));
    }, [districtGroups, expandedDistricts]);

    const toggleDistrict = useCallback((district) => {
        if (!district) return;
        setExpandedDistricts((prev) => {
            const next = new Set(prev);
            if (next.has(district)) next.delete(district);
            else next.add(district);
            return next;
        });
    }, []);

    const toggleAllDistricts = useCallback(() => {
        setExpandedDistricts(() => {
            if (!districtGroups.length) return new Set();
            if (allDistrictsExpanded) return new Set();
            return new Set(districtGroups.map((group) => group.district));
        });
    }, [allDistrictsExpanded, districtGroups]);

    const matrixSelectableRowKeys = useMemo(() => displayedMatrixRows.map((row) => row.key), [displayedMatrixRows]);

    const detailedSelectableRowKeys = useMemo(() => {
        if (!detailedData?.categories) return [];
        const keys = [];
        detailedData.categories.forEach((cat, catIdx) => {
            (cat.items || []).forEach((item, itemIdx) => {
                const key = `d:${catIdx}:${itemIdx}`;
                if (!hiddenRowKeys.has(key)) keys.push(key);
            });
        });
        return keys;
    }, [detailedData, hiddenRowKeys]);

    const selectableRowKeys = detailedData ? detailedSelectableRowKeys : matrixSelectableRowKeys;

    const selectableRowIndexByKey = useMemo(() => {
        const map = new Map();
        selectableRowKeys.forEach((k, idx) => map.set(k, idx));
        return map;
    }, [selectableRowKeys]);

    const selectableRowSearch = useMemo(() => {
        if (detailedData) {
            const rows = [];
            detailedData.categories.forEach((cat, catIdx) => {
                (cat.items || []).forEach((item, itemIdx) => {
                    const key = `d:${catIdx}:${itemIdx}`;
                    const idx = selectableRowIndexByKey.get(key);
                    if (idx === undefined) return;
                    const normalized = String(item?.itemName || '').trim().toLowerCase();
                    rows.push({ idx, normalized });
                });
            });
            return rows;
        }
        return displayedMatrixRows.map((row) => {
            const visibleIdx = selectableRowIndexByKey.get(row.key);
            if (visibleIdx === undefined) return null;
            return {
                idx: visibleIdx,
                normalized: `${String(row?.district || '').trim().toLowerCase()} ${String(row?.storeName || '').trim().toLowerCase()}`
            };
        }).filter(Boolean);
    }, [detailedData, displayedMatrixRows, selectableRowIndexByKey]);

    const detailedColCount = useMemo(() => {
        const qtyCols = filters.viewType === 'Qty' || filters.viewType === 'QtyValue' ? 1 : 0;
        const valueCols = filters.viewType === 'Value' || filters.viewType === 'QtyValue' ? 2 : 0;
        return 2 + qtyCols + valueCols;
    }, [filters.viewType]);

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

    const hideSelectedOrFocusedRows = useCallback(() => {
        if (!selectableRowKeys || selectableRowKeys.length === 0) return;
        const selected = selectedRowKeys || new Set();
        const hasSelection = selected.size > 0;
        const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
        const focusedKey = selectableRowKeys[idx];
        const keysToHide = hasSelection
            ? selectableRowKeys.filter((k) => selected.has(k))
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
                if (!k || existing.has(k)) return;
                existing.add(k);
                next.push(k);
            });
            return next;
        });
        setSelectedRowKeys(new Set());
    }, [focusedRowIndex, selectableRowKeys, selectedRowKeys]);

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

    const handleQtyClick = useCallback((itemDetail) => {
        if (!itemDetail?.itemCode || !itemDetail?.sizeCode || !filters.storeCode) return;
        const params = new URLSearchParams({
            storeCode: filters.storeCode,
            itemCode: itemDetail.itemCode,
            sizeCode: itemDetail.sizeCode,
            asOnDate: filters.date
        });
        navigate(`/stock-ledger-report?${params.toString()}`);
    }, [filters.date, filters.storeCode, navigate]);

    useEffect(() => {
        const onKeyDown = (e) => {
            const k = String(e.key || '').toLowerCase();
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (e.key === 'F3') {
                if (showStoreModal || showChangePeriodModal) return;
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
                if (showChangePeriodModal || showStoreModal) return;
                e.preventDefault();
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
                setShowChangePeriodModal(true);
                return;
            }
            if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
            if (!e.altKey && !e.ctrlKey && !e.metaKey && e.shiftKey && k === 'u') {
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
            if (k === 'e' && !detailedData) {
                e.preventDefault();
                toggleAllDistricts();
                return;
            }
            if (k === 'h' || k === 'r') {
                e.preventDefault();
                hideSelectedOrFocusedRows();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [detailedData, filters?.storeCode, hideSelectedOrFocusedRows, showChangePeriodModal, showStoreModal, stores, toggleAllDistricts, unhideAllRows, unhideLastRow]);

    const handleReportTableKeyDown = (e) => {
        const el = tableContainerRef.current;
        if (!el) return;

        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

        if (!e.altKey && !e.ctrlKey && !e.metaKey && e.shiftKey && String(e.key || '').toLowerCase() === 'u') {
            e.preventDefault();
            unhideAllRows();
            return;
        }

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
            if (selectableRowKeys.length === 0) return;
            setFocusedRowIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectableRowKeys.length === 0) return;
            setFocusedRowIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1);
                return next;
            });
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
        <div className="report-container stock-ledger-container closing-stock-district-wise-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Closing Stock - District Wise</h1>
                <div className="stock-ledger-header-actions">
                    <div className="stock-ledger-header-date-inline">
                        <span className="stock-ledger-header-date-caption">As on Date</span>
                        <div className="date-picker-wrapper stock-ledger-header-date">
                            <Calendar className="date-picker-icon" size={18} />
                            <button
                                type="button"
                                className="date-picker-button"
                                onClick={openDatePicker}
                                disabled={loading}
                            >
                                {filters.date ? toDdMmYyyy(filters.date) : ''}
                            </button>
                            <input
                                ref={dateRef}
                                type="date"
                                className="date-picker-native"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <button
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleExport}
                        disabled={loading || (!data.length && !detailedData)}
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
                                const results = filterStoresForSearch(storeSearchInput);
                                setStoreSearchResults(results);
                                setShowStoreSuggestions(true);
                                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search store code or name..."
                            autoComplete="off"
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
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{st.storeName}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {st.storeCode}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Store Type:</label>
                    <select
                        value={filters.storeType}
                        onChange={(e) => setFilters({ ...filters, storeType: e.target.value })}
                    >
                        <option value="">All</option>
                        {Array.from(new Set((stores || []).map(s => String(s?.storeType || '').trim()).filter(Boolean)))
                            .sort((a, b) => a.localeCompare(b))
                            .map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Item:</label>
                    <div ref={itemSearchWrapRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={itemSearchInput}
                            onChange={handleItemInputChange}
                            onKeyDown={handleItemKeyDown}
                            onFocus={async () => {
                                if (!itemSearchInput.trim()) return;
                                const results = await searchItemsForInput(itemSearchInput);
                                setItemSearchResults(results);
                                setShowItemSuggestions(true);
                                setFocusedItemSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search item code or name..."
                            autoComplete="off"
                        />
                        {showItemSuggestions && itemSearchResults.length > 0 && (
                            <div
                                ref={itemSuggestionsRef}
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
                                        data-suggestion-index={idx}
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
                        value={filters.sizeCode}
                        onChange={(e) => setFilters({ ...filters, sizeCode: e.target.value })}
                    >
                        <option value="">All Sizes</option>
                        {sizes.map(sz => (
                            <option key={sz.code || sz.id} value={sz.code || ''}>
                                {sz.name || sz.code}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Select View:</label>
                    <select 
                        value={filters.viewType} 
                        onChange={(e) => setFilters({...filters, viewType: e.target.value})}
                    >
                        <option value="Qty">Quantity Only</option>
                        <option value="Value">Value Only</option>
                        <option value="QtyValue">Quantity With Value</option>
                    </select>
                </div>

                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div
                ref={tableContainerRef}
                className="table-container"
                tabIndex={0}
                onKeyDown={handleReportTableKeyDown}
                onClick={() => tableContainerRef.current?.focus()}
            >
                {detailedData ? (
                    <div className="detailed-report">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Size</th>
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="text-right">Qty</th>}
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="text-right">Rate</th>}
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="text-right">Amount</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {detailedData.categories.map((catGroup, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="category-header">
                                            <td colSpan={detailedColCount} className="font-bold">{catGroup.categoryName}</td>
                                        </tr>
                                        {catGroup.items.map((item, iIdx) => (
                                            <tr
                                                key={`${idx}-${iIdx}`}
                                                data-row-key={`d:${idx}:${iIdx}`}
                                                style={hiddenRowKeys.has(`d:${idx}:${iIdx}`) ? { display: 'none' } : undefined}
                                                className={[
                                                    selectedRowKeys.has(`d:${idx}:${iIdx}`) ? 'row-selected' : '',
                                                    focusedRowIndex === selectableRowIndexByKey.get(`d:${idx}:${iIdx}`) ? 'row-focused' : ''
                                                ].filter(Boolean).join(' ')}
                                                onMouseDown={() => {
                                                    const next = selectableRowIndexByKey.get(`d:${idx}:${iIdx}`);
                                                    if (next === undefined) return;
                                                    setFocusedRowIndex(next);
                                                }}
                                                onClick={() => toggleSelectedRow(`d:${idx}:${iIdx}`)}
                                            >
                                                <td>{item.itemName}</td>
                                                <td>{item.sizeName}</td>
                                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">
                                                        {filters.storeCode && item?.itemCode && item?.sizeCode ? (
                                                            <button
                                                                type="button"
                                                                className="qty-link"
                                                                onClick={() => handleQtyClick(item)}
                                                            >
                                                                {formatQty(item.qty)}
                                                            </button>
                                                        ) : formatQty(item.qty)}
                                                    </td>
                                                }
                                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">{formatAmount(item.rate)}</td>
                                                }
                                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">{formatAmount(item.amount)}</td>
                                                }
                                            </tr>
                                        ))}
                                        <tr className="category-subtotal">
                                            <td colSpan={2} className="text-right">Subtotal {catGroup.categoryName}:</td>
                                            {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">{formatQty(catGroup.totalQty)}</td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right"></td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">{formatAmount(catGroup.totalAmount)}</td>
                                            }
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="grand-total">
                                    <td colSpan={2} className="text-right">GRAND TOTAL</td>
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right">{formatQty(detailedData.grandTotalQty)}</td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right"></td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right">{formatAmount(detailedData.grandTotalAmount)}</td>
                                    }
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th rowSpan={2}>District</th>
                                <th rowSpan={2}>Store Name</th>
                                {columns.map(col => <th key={col} colSpan={filters.viewType === 'QtyValue' ? 2 : 1} className="text-center">{col}</th>)}
                                <th colSpan={filters.viewType === 'QtyValue' ? 2 : 1} className="text-center">Total</th>
                            </tr>
                            <tr>
                                {columns.map(col => (
                                    <React.Fragment key={col}>
                                        {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="sub-header">Qty</th>}
                                        {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="sub-header">Amt</th>}
                                    </React.Fragment>
                                ))}
                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="sub-header">Qty</th>}
                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="sub-header">Amt</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {displayedMatrixRows.map((row) => (
                                <tr
                                    key={row.key}
                                    data-row-key={row.key}
                                    className={[
                                        selectedRowKeys.has(row.key) ? 'row-selected' : '',
                                        focusedRowIndex === selectableRowIndexByKey.get(row.key) ? 'row-focused' : ''
                                    ].filter(Boolean).join(' ')}
                                    style={row.type === 'district' ? { background: '#f1f5f9', fontWeight: 700 } : undefined}
                                    onMouseDown={() => {
                                        const next = selectableRowIndexByKey.get(row.key);
                                        if (next === undefined) return;
                                        setFocusedRowIndex(next);
                                    }}
                                    onClick={() => {
                                        toggleSelectedRow(row.key);
                                        if (row.type === 'district') toggleDistrict(row.district);
                                    }}
                                >
                                    <td>{row.district}</td>
                                    <td>
                                        {row.type === 'district'
                                            ? ''
                                            : (
                                                <button
                                                    type="button"
                                                    className="qty-link"
                                                    style={{ paddingLeft: 18, display: 'inline-block' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openStoreWiseReport(row.storeCode);
                                                    }}
                                                    title={`Open closing stock store wise for ${row.storeName}`}
                                                >
                                                    {row.storeName}
                                                </button>
                                            )}
                                    </td>
                                    {columns.map(col => (
                                        <React.Fragment key={col}>
                                            {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">
                                                    {formatQty(row.categoryQuantities[col] || 0)}
                                                </td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">
                                                    {formatAmount(row.categoryAmounts[col] || 0)}
                                                </td>
                                            }
                                        </React.Fragment>
                                    ))}
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right font-bold">
                                            {formatQty(row.totalQty)}
                                        </td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right font-bold">
                                            {formatAmount(row.totalAmount)}
                                        </td>
                                    }
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="text-right font-bold">GRAND TOTAL</td>
                                {columns.map(col => (
                                    <React.Fragment key={col}>
                                        {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                            <td className="text-right font-bold">
                                                {formatQty(calculateGrandTotalQty(col))}
                                            </td>
                                        }
                                        {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                            <td className="text-right font-bold">
                                                {formatAmount(calculateGrandTotalAmount(col))}
                                            </td>
                                        }
                                    </React.Fragment>
                                ))}
                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                    <td className="text-right font-bold">
                                        {formatQty(calculateTotalQty())}
                                    </td>
                                }
                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                    <td className="text-right font-bold">
                                        {formatAmount(calculateTotalAmount())}
                                    </td>
                                }
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
            <footer style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                {!detailedData && (
                    <button type="button" className="search-btn search-btn-compact" onClick={toggleAllDistricts} disabled={districtGroups.length === 0}>
                        ALT+E {allDistrictsExpanded ? 'Collapse' : 'Expand'}
                    </button>
                )}
                <button type="button" className="search-btn search-btn-compact" onClick={hideSelectedOrFocusedRows} disabled={!selectableRowKeys || selectableRowKeys.length === 0}>
                    ALT+R Hide
                </button>
                <button type="button" className="search-btn search-btn-compact" onClick={unhideLastRow} disabled={hiddenRowOrder.length === 0}>
                    ALT+U Unhide
                </button>
                <button type="button" className="search-btn search-btn-compact" onClick={unhideAllRows} disabled={hiddenRowKeys.size === 0}>
                    SHIFT+U Unhide All
                </button>
            </footer>

            <ChangePeriodModal
                open={showChangePeriodModal}
                startDate={filters.date}
                endDate={filters.date}
                onClose={() => setShowChangePeriodModal(false)}
                onApply={({ startDate: sd, endDate: ed }) => {
                    const next = String(ed || sd || '').trim();
                    if (next) {
                        setFilters(prev => ({ ...prev, date: next }));
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
                                        setFocusedStoreModalIndex((prev) => Math.max(0, (prev < 0 ? 0 : prev - 1)));
                                        return;
                                    }
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (focusedStoreModalIndex >= 0 && focusedStoreModalIndex < storeModalOptions.length) {
                                            handleSelectStore(storeModalOptions[focusedStoreModalIndex]);
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Search store code or name..."
                                autoComplete="off"
                            />
                            <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-200">
                                {storeModalOptions.map((st, idx) => (
                                    <button
                                        key={st.storeCode || idx}
                                        type="button"
                                        className="w-full text-left px-3 py-2 border-b last:border-b-0 border-slate-100 hover:bg-slate-50"
                                        style={{ background: idx === focusedStoreModalIndex ? '#eff6ff' : '#fff' }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectStore(st);
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{st.storeName}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Code: {st.storeCode}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ClosingStockReport;
