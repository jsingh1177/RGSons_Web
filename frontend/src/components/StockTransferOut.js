import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Calendar, Search, FileText, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';

const renderHotkeyLabel = (text, hotkey) => {
    const rawText = String(text ?? '');
    const hk = String(hotkey ?? '').slice(0, 1);
    if (!hk) return rawText;

    const idx = rawText.toLowerCase().indexOf(hk.toLowerCase());
    if (idx === -1) {
        return (
            <>
                {rawText} (<span className="underline underline-offset-2">{hk.toUpperCase()}</span>)
            </>
        );
    }

    return (
        <>
            {rawText.slice(0, idx)}
            <span className="underline underline-offset-2">{rawText.slice(idx, idx + 1)}</span>
            {rawText.slice(idx + 1)}
        </>
    );
};

const StockTransferOut = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditMode, setIsEditMode] = useState(false);

    const isEmbedded = useCallback(() => {
        try {
            return window.self !== window.top;
        } catch {
            return true;
        }
    }, []);

    const requestCloseParentModal = useCallback(() => {
        if (!isEmbedded()) return;
        try {
            window.parent.postMessage({ type: 'RG_CLOSE_VOUCHER_MODAL' }, window.location.origin);
        } catch {
            window.parent.postMessage({ type: 'RG_CLOSE_VOUCHER_MODAL' }, '*');
        }
    }, [isEmbedded]);

    useEffect(() => {
        if (!isEmbedded()) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            setTimeout(() => {
                if (e.defaultPrevented) return;
                requestCloseParentModal();
            }, 0);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isEmbedded, requestCloseParentModal]);

    // --- State ---
    const formatDateForInput = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
            if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const [dd, mm, yyyy] = date.split('-');
                return `${yyyy}-${mm}-${dd}`;
            }
            if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [dd, mm, yyyy] = date.split('/');
                return `${yyyy}-${mm}-${dd}`;
            }
        }
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const parseKeyboardDateToIso = (raw) => {
        const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        let dd = '';
        let mm = '';
        let yyyy = '';

        if (digits.length === 2) {
            dd = digits.slice(0, 2);
            mm = String(currentMonth).padStart(2, '0');
            yyyy = String(currentYear);
        } else if (digits.length === 4) {
            dd = digits.slice(0, 2);
            mm = digits.slice(2, 4);
            yyyy = String(currentYear);
        } else if (digits.length === 8) {
            dd = digits.slice(0, 2);
            mm = digits.slice(2, 4);
            yyyy = digits.slice(4, 8);
        } else {
            return null;
        }

        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
        if (year < 1900 || year > 9999) return null;
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;

        const d = new Date(year, month - 1, day);
        if (d.getFullYear() !== year || d.getMonth() !== (month - 1) || d.getDate() !== day) return null;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const formatDateForDisplay = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            if (date.match(/^\d{2}-\d{2}-\d{4}$/)) return date;
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [yyyy, mm, dd] = date.split('-');
                return `${dd}-${mm}-${yyyy}`;
            }
            if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [dd, mm, yyyy] = date.split('/');
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    // Header
    const [stores, setStores] = useState([]);
    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [showFromStoreModal, setShowFromStoreModal] = useState(false);
    const [fromStoreSearchQuery, setFromStoreSearchQuery] = useState('');
    const [focusedFromStoreIndex, setFocusedFromStoreIndex] = useState(-1);
    const lastVoucherDateGlobalKey = 'RG_lastVoucherDate:sto';
    const [stoDate, setStoDate] = useState(() => {
        try {
            const raw = localStorage.getItem(lastVoucherDateGlobalKey);
            if (raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return String(raw);
        } catch {}
        return formatDateForInput(new Date());
    });
    const [showDateEntryModal, setShowDateEntryModal] = useState(false);
    const [dateEntryInput, setDateEntryInput] = useState('');
    const dateEntryInputRef = useRef(null);
    const [stoNumber, setStoNumber] = useState('');
    const [narration, setNarration] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);
    const [isDateDisabled, setIsDateDisabled] = useState(false);
    const [isReceivedSto, setIsReceivedSto] = useState(false);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [gridRows, setGridRows] = useState([]);
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [showDrafts, setShowDrafts] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const handleSaveRef = useRef(null);
    const handleDeleteRef = useRef(null);
    const hotkeyBlockRef = useRef({ drafts: false, received: false });
    const fromStoreSearchInputRef = useRef(null);

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    const [scanSizeName, setScanSizeName] = useState('');
    
    const [scanRate, setScanRate] = useState(''); // Transfer Rate (Input)
    const [scanQuantity, setScanQuantity] = useState('');
    const [scanMrp, setScanMrp] = useState('');
    const [scanClosingStock, setScanClosingStock] = useState('');
    
    const [itemPrices, setItemPrices] = useState([]); 
    const [itemStock, setItemStock] = useState({}); // Store stock for all sizes of selected item
    const itemStockRef = useRef({});
    
    const scanInputRef = useRef(null);
    const scanSuggestWrapRef = useRef(null);
    const sizeInputRef = useRef(null);
    const sizeSuggestWrapRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    
    // Header Refs
    const fromStoreRef = useRef(null);
    const toStoreRef = useRef(null);
    const dateRef = useRef(null);
    const stoNumberRef = useRef(null);
    const voucherDateInitializedRef = useRef(false);

    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    const gridScrollContainerRef = useRef(null);
    const pendingGridScrollRef = useRef(false);
    const pendingGridScrollIndexRef = useRef(null);
    
    // Suggestions State (Item)
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

    // Suggestions State (Size)
    const [sizeSearchResults, setSizeSearchResults] = useState([]);
    const [showSizeSuggestions, setShowSizeSuggestions] = useState(false);
    const [focusedSizeSuggestionIndex, setFocusedSizeSuggestionIndex] = useState(-1);

    useEffect(() => {
        if (!pendingGridScrollRef.current) return;
        const index = pendingGridScrollIndexRef.current;
        pendingGridScrollRef.current = false;
        pendingGridScrollIndexRef.current = null;

        requestAnimationFrame(() => {
            const container = gridScrollContainerRef.current;
            if (!container) return;

            if (index === null || index === undefined) {
                container.scrollTop = container.scrollHeight;
                return;
            }

            const rowEl = container.querySelector(`[data-row-index="${index}"]`);
            if (rowEl && typeof rowEl.scrollIntoView === 'function') {
                rowEl.scrollIntoView({ block: 'nearest' });
                return;
            }
            container.scrollTop = container.scrollHeight;
        });
    }, [gridRows]);

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);

    const closingAsOnDate = formatDateForDisplay(stoDate);

    // --- Helpers ---
    const showMessage = (message, type = 'info') => {
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: type,
            confirmButtonText: 'OK'
        });
    };

    const getLastVoucherDateKeyForStore = useCallback((storeCode) => {
        const sc = String(storeCode || '').trim();
        return sc ? `RG_lastVoucherDate:sto:${sc}` : lastVoucherDateGlobalKey;
    }, []);

    const openStoDatePicker = () => {
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

    // --- Effects ---
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchStores();
        fetchActiveSizes();
        fetchVoucherConfig();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const stoNumberParam = params.get('stoNumber');
        const mode = params.get('mode');
        if (!stoNumberParam || mode !== 'edit') {
            setIsEditMode(false);
            setIsReceivedSto(false);
            setSelectedDraft(null);
            return;
        }
        setIsEditMode(true);
        handleDraftSelect({ stoNumber: stoNumberParam });
    }, [location.search]);

    const handleDeleteVoucher = async () => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode !== 'edit' || !stoNumber) return;
        if (isReceivedSto) {
            showMessage("Cannot delete STO. It is already received in Stock Transfer In.", 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'Delete Voucher?',
            text: `STO No: ${stoNumber}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/sto/${encodeURIComponent(stoNumber)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data?.success) {
                Swal.fire({ title: 'Deleted', text: response.data.message || 'Voucher deleted', icon: 'success', timer: 1200, showConfirmButton: false }).then(() => {
                    if (isEmbedded()) {
                        requestCloseParentModal();
                        return;
                    }
                    navigate('/stock-transfer-out');
                });
            } else {
                showMessage(response.data?.message || 'Failed to delete voucher', 'error');
            }
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error deleting voucher', 'error');
        }
    };

    useEffect(() => {
        const refresh = async () => {
            if (!fromStore || !stoDate) return;

            try {
                const token = localStorage.getItem('token');

                if (scanItemCode) {
                    const stockRes = await axios.get(
                        `/api/inventory/stock/item?storeCode=${fromStore}&itemCode=${scanItemCode}&tranDate=${encodeURIComponent(stoDate)}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (stockRes.data?.success) {
                        const stock = stockRes.data.stock || {};
                        setItemStock(stock);
                        itemStockRef.current = stock;
                    }
                }

                if (scanItemCode && scanSize) {
                    fetchStock(scanItemCode, scanSize);
                }

                if (gridRows.length > 0) {
                    const uniqueKeys = Array.from(new Set(gridRows.map(r => `${r.itemCode}|${r.sizeCode}`)));
                    const results = await Promise.all(uniqueKeys.map(async (key) => {
                        const [itemCode, sizeCode] = key.split('|');
                        const res = await axios.get(
                            `/api/inventory/stock?storeCode=${fromStore}&itemCode=${itemCode}&sizeCode=${sizeCode}&tranDate=${encodeURIComponent(stoDate)}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        return { key, closing: res.data?.success ? (res.data.closing || 0) : 0 };
                    }));
                    const map = {};
                    results.forEach(r => { map[r.key] = r.closing; });
                    setGridRows(prev => prev.map(r => ({
                        ...r,
                        closingStock: map[`${r.itemCode}|${r.sizeCode}`] !== undefined ? map[`${r.itemCode}|${r.sizeCode}`] : r.closingStock
                    })));
                }
            } catch (e) {
                console.error("Error refreshing stock for selected date", e);
            }
        };
        refresh();
    }, [stoDate, fromStore]);

    // Scroll focused suggestion into view
    useEffect(() => {
        if (focusedSuggestionIndex >= 0 && showSuggestions) {
            const element = document.getElementById(`suggestion-item-${focusedSuggestionIndex}`);
            if (element) element.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedSuggestionIndex, showSuggestions]);

    useEffect(() => {
        if (focusedSizeSuggestionIndex >= 0 && showSizeSuggestions) {
            const element = document.getElementById(`suggestion-size-${focusedSizeSuggestionIndex}`);
            if (element) element.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedSizeSuggestionIndex, showSizeSuggestions]);

    // --- API Calls ---
    const fetchDrafts = async () => {
        try {
            if (!fromStore) {
                showMessage("Please select From Location", 'warning');
                return;
            }
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sto/drafts?storeCode=${encodeURIComponent(fromStore)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && Array.isArray(response.data)) {
                setDrafts(response.data);
            }
        } catch (error) {
            console.error("Error fetching drafts", error);
        }
    };

    const fetchVoucherConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/voucher-config/STOCK_TRANSFER_OUT', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && response.data.success) {
                setVoucherConfig(response.data.config);
            }
        } catch (error) {
            console.error("Error fetching voucher config", error);
        }
    };

    const fetchStores = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/stores', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && response.data.success && response.data.stores) {
                setStores(response.data.stores);
                
                // Set default From Store if user has one
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // If user is restricted to a store, select it. 
                // Since we don't have easy access to user's assigned store code here without another call, 
                // we can rely on user selection or fetch user's store like in PurchaseEntry.
                // For now, I'll fetch user's store info to pre-select.
                fetchUserStore(user.userName);
            }
        } catch (error) {
            console.error("Error fetching stores", error);
        }
    };

    const fetchUserStore = async (userName) => {
        if (!userName) return;
        try {
            const response = await axios.get(`/api/stores/by-user/${userName}`);
            if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                const params = new URLSearchParams(location.search || '');
                const mode = params.get('mode');
                if (mode === 'edit') {
                    return;
                }
                const storeInfo = response.data.stores[0];
                const userStore = storeInfo.storeCode;
                setFromStore(userStore);
                if (mode !== 'edit') {
                    fetchNextStoNumber(userStore);
                }

                // Check role and set business date
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.role === 'STORE USER') {
                    if (!voucherDateInitializedRef.current) {
                        voucherDateInitializedRef.current = true;
                        let iso = '';
                        try {
                            const stored = localStorage.getItem(getLastVoucherDateKeyForStore(userStore));
                            if (stored && /^\d{4}-\d{2}-\d{2}$/.test(String(stored))) iso = String(stored);
                        } catch {}
                        if (!iso) {
                            try {
                                const globalStored = localStorage.getItem(lastVoucherDateGlobalKey);
                                if (globalStored && /^\d{4}-\d{2}-\d{2}$/.test(String(globalStored))) iso = String(globalStored);
                            } catch {}
                        }
                        if (!iso && storeInfo.businessDate) {
                            iso = formatDateForInput(storeInfo.businessDate);
                        }
                        if (iso) setStoDate(iso);
                    }
                    setIsDateDisabled(storeInfo.isDsrDisabled !== true);
                }
            }
        } catch (error) {
            console.error("Error fetching user store", error);
        }
    };

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            e.preventDefault();
            if (showDateEntryModal) return;
            if (showFromStoreModal || showDrafts) return;
            if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showDateEntryModal, showFromStoreModal, showDrafts]);

    useEffect(() => {
        if (!showDateEntryModal) return;
        requestAnimationFrame(() => dateEntryInputRef.current?.focus?.());
    }, [showDateEntryModal]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (showDateEntryModal || showFromStoreModal || showDrafts) return;
            if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;

            if (key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveRef.current === 'function') handleSaveRef.current(true);
                return;
            }
            if (key === 'k') {
                e.preventDefault();
                e.stopPropagation();
                setScanSearchInput('');
                setScanItemCode('');
                setScanItemName('');
                setSearchResults([]);
                setShowSuggestions(false);
                setFocusedSuggestionIndex(-1);
                setItemPrices([]);
                setItemStock({});
                itemStockRef.current = {};
                setScanSize('');
                setScanSizeName('');
                setSizeSearchInput('');
                setSizeSearchResults([]);
                setShowSizeSuggestions(false);
                setFocusedSizeSuggestionIndex(-1);
                setScanClosingStock('');
                setTimeout(() => scanInputRef.current?.focus?.(), 0);
                return;
            }
            if (key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveRef.current === 'function') handleSaveRef.current(false);
                return;
            }
            if (key === 'd') {
                if (!isEditMode) return;
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleDeleteRef.current === 'function') handleDeleteRef.current();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isEditMode]);

    const filteredFromStores = React.useMemo(() => {
        const list = Array.isArray(stores) ? stores : [];
        const q = String(fromStoreSearchQuery || '').trim().toLowerCase();
        if (!q) return list;
        return list.filter(s =>
            String(s?.storeCode || '').toLowerCase().includes(q) ||
            String(s?.storeName || '').toLowerCase().includes(q)
        );
    }, [stores, fromStoreSearchQuery]);

    const openFromStoreModal = useCallback(() => {
        if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
        const all = Array.isArray(stores) ? stores : [];
        if (all.length === 0) return;
        setFromStoreSearchQuery('');
        const idx = fromStore ? all.findIndex(s => String(s?.storeCode || '') === String(fromStore || '')) : -1;
        setFocusedFromStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowFromStoreModal(true);
        setTimeout(() => fromStoreSearchInputRef.current?.focus(), 100);
    }, [fromStore, stores]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
            e.preventDefault();
            e.stopPropagation();
            openFromStoreModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [openFromStoreModal]);

    useEffect(() => {
        if (!showFromStoreModal) return;
        setTimeout(() => fromStoreSearchInputRef.current?.focus(), 0);
    }, [showFromStoreModal]);

    useEffect(() => {
        if (!showFromStoreModal) return;
        if (focusedFromStoreIndex < 0) return;
        const el = document.getElementById(`sto-from-store-option-${focusedFromStoreIndex}`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [showFromStoreModal, focusedFromStoreIndex]);

    useEffect(() => {
        if (!showFromStoreModal) return;
        const onKeyDown = (e) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && String(e.key || '').toLowerCase() === 'd') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                setShowFromStoreModal(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showFromStoreModal]);

    const handleFromStoreSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = filteredFromStores.length - 1;
            setFocusedFromStoreIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const max = filteredFromStores.length - 1;
            setFocusedFromStoreIndex(prev => Math.max(0, Math.min(max, prev < 0 ? 0 : prev - 1)));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedFromStoreIndex >= 0 && filteredFromStores[focusedFromStoreIndex]) {
                const s = filteredFromStores[focusedFromStoreIndex];
                const val = String(s?.storeCode || '').trim();
                setFromStore(val);
                if (val) {
                    fetchNextStoNumber(val);
                }
                if (val && val === toStore) {
                    setToStore('');
                }
                setShowFromStoreModal(false);
                setTimeout(() => toStoreRef.current?.focus(), 0);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowFromStoreModal(false);
        }
    };

    const fetchActiveSizes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/sizes/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const sortedSizes = (response.data || []).sort((a, b) => {
                const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
            });

            setActiveSizes(sortedSizes);
        } catch (error) {
            console.error("Error fetching sizes", error);
        }
    };

    const fetchItemDetails = async (code) => {
        if (!code) return;
        try {
            const token = localStorage.getItem('token');
            
            // Parallel fetch: Prices + Stock (if fromStore is selected)
            const promises = [
                axios.get(`/api/prices/item/${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ];

            if (fromStore) {
                 promises.push(
                     axios.get(`/api/inventory/stock/item?storeCode=${fromStore}&itemCode=${code}&tranDate=${encodeURIComponent(stoDate)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                     })
                 );
            }

            const results = await Promise.all(promises);
            const response = results[0];
            const stockResponse = results.length > 1 ? results[1] : null;

            if (stockResponse && stockResponse.data.success) {
                const stock = stockResponse.data.stock || {};
                setItemStock(stock);
                itemStockRef.current = stock;
            } else {
                setItemStock({});
                itemStockRef.current = {};
            }

            if (response.data.success) {
                const prices = response.data.prices || [];
                setItemPrices(prices);
                
                let itemName = '';
                let itemCode = code;
                let mrp = '';

                if (prices.length > 0) {
                    itemName = prices[0].itemName;
                    mrp = prices[0].mrp;
                } else {
                    const itemResponse = await axios.get(`/api/items/search?query=${code}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (itemResponse.data.success && itemResponse.data.items.length > 0) {
                         const item = itemResponse.data.items.find(i => i.itemCode === code) || itemResponse.data.items[0];
                         itemName = item.itemName;
                         itemCode = item.itemCode;
                    }
                }

                setScanItemName(itemName || '');
                setScanItemCode(itemCode);
                setScanSearchInput(itemName || itemCode);
                setScanMrp(mrp || '');
                setShowSuggestions(false);

                setScanSize('');
                setScanSizeName('');
                setSizeSearchInput('');
                setScanRate('');

                if (sizeInputRef.current) sizeInputRef.current.focus();
            }
        } catch (error) {
            console.error("Error fetching item details", error);
        }
    };

    // --- Handlers ---
    const handleDraftSelect = async (draft) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sto/${draft.stoNumber}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data) {
                const head = response.data.head;
                const items = response.data.items;

                setSelectedDraft(head);
                const received = String(head?.receivedStatus || '').toUpperCase() === 'RECEIVED';
                setIsReceivedSto(received);
                setFromStore(head.fromStore);
                setToStore(head.toStore);
                setStoDate(formatDateForInput(head.date));
                setStoNumber(head.stoNumber);
                setNarration(head.narration || '');

                const newRows = items.map((item, index) => ({
                    id: Date.now() + index,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    sizeCode: item.sizeCode,
                    sizeName: item.sizeName,
                    quantity: item.quantity,
                    rate: item.price,
                    amount: item.amount,
                    closingStock: 0 // Will need separate fetch if stock display is critical, or just 0
                }));
                setGridRows(newRows);
                setEditingRowIndex(null);
                setShowDrafts(false);
                if (received) {
                    showMessage('This STO is RECEIVED. Edit/Delete is disabled.', 'warning');
                } else {
                    showMessage('Draft loaded successfully', 'success');
                }
            }
        } catch (error) {
            console.error("Error loading draft", error);
            showMessage('Error loading draft', 'error');
        }
    };

    const handleDeleteDraft = async (draft, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const result = await Swal.fire({
            title: 'Delete Draft?',
            text: `Draft STO No: ${draft?.stoNumber}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/sto/drafts/${encodeURIComponent(draft.stoNumber)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data?.success) {
                setDrafts(prev => prev.filter(d => d.stoNumber !== draft.stoNumber));
                if (selectedDraft?.stoNumber === draft.stoNumber) {
                    setSelectedDraft(null);
                    setGridRows([]);
                    setEditingRowIndex(null);
                    setStoNumber('');
                    setNarration('');
                }
                showMessage('Draft deleted', 'success');
            } else {
                showMessage(response.data?.message || 'Failed to delete draft', 'error');
            }
        } catch (error) {
            console.error("Error deleting draft", error);
            showMessage(error.response?.data?.message || 'Error deleting draft', 'error');
        }
    };

    const fetchStock = async (itemCode, sizeCode) => {
        if (!fromStore || !itemCode || !sizeCode) {
            setScanClosingStock('');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/inventory/stock?storeCode=${fromStore}&itemCode=${itemCode}&sizeCode=${sizeCode}&tranDate=${encodeURIComponent(stoDate)}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setScanClosingStock(response.data.closing || 0);
            } else {
                setScanClosingStock(0);
            }
        } catch (error) {
            console.error("Error fetching stock", error);
            setScanClosingStock(0);
        }
    };

    const fetchNextStoNumber = async (storeCode) => {
        if (!storeCode) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sto/next-number?storeCode=${storeCode}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setStoNumber(response.data.stoNumber);
            } else {
                setStoNumber('Error');
            }
        } catch (error) {
            console.error("Error fetching next STO number", error);
            setStoNumber('Error');
        }
    };

    // Header Navigation Handlers
    const handleFromStoreKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (toStoreRef.current) toStoreRef.current.focus();
        }
    };

    const handleToStoreKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (dateRef.current) dateRef.current.focus();
        }
    };

    const handleDateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (stoNumberRef.current) stoNumberRef.current.focus();
        }
    };

    const handleStoNumberKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    // Item Scan Handlers
    const handleScanInputChange = (e) => {
        const value = e.target.value;
        setScanSearchInput(value);
        setScanItemCode('');
        setScanItemName('');
        setFocusedSuggestionIndex(-1);
        setItemPrices([]);
        
        if (scanDebounceRef.current) {
            clearTimeout(scanDebounceRef.current);
        }

        if (scanAbortControllerRef.current) {
            scanAbortControllerRef.current.abort();
        }

        if (value.length > 1) {
            scanDebounceRef.current = setTimeout(async () => {
                scanAbortControllerRef.current = new AbortController();
                try {
                    const token = localStorage.getItem('token');
                    let url = `/api/items/search?query=${value}`;
                    
                    // If From Store is selected, search only available items in that store
                    if (fromStore && voucherConfig?.isNegativeInventoryAllowed !== true) {
                        url = `/api/inventory/search-available?storeCode=${fromStore}&query=${value}&tranDate=${encodeURIComponent(stoDate)}`;
                    }

                    const response = await axios.get(url, {
                         headers: { 'Authorization': `Bearer ${token}` },
                         signal: scanAbortControllerRef.current.signal
                    });
                    if (response.data.success) {
                        setSearchResults(response.data.items || []);
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    if (axios.isCancel(error)) return;
                    console.error("Search error", error);
                }
            }, 300);
        } else {
            setSearchResults([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (item) => {
        setScanItemCode(item.itemCode);
        setScanItemName(item.itemName);
        setScanSearchInput(item.itemName);
        setShowSuggestions(false);
        fetchItemDetails(item.itemCode);
    };

    const handleScanKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // Cancel any pending search debounce and request to prevent popup from reappearing
            if (scanDebounceRef.current) {
                clearTimeout(scanDebounceRef.current);
            }
            if (scanAbortControllerRef.current) {
                scanAbortControllerRef.current.abort();
            }

            if (showSuggestions && focusedSuggestionIndex >= 0) {
                handleSelectSuggestion(searchResults[focusedSuggestionIndex]);
            } else {
                fetchItemDetails(scanSearchInput);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSuggestionIndex(prev => prev < searchResults.length - 1 ? prev + 1 : prev);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        }
    };

    // Size Handlers
    const handleSizeInputChange = (e) => {
        const value = e.target.value;
        setSizeSearchInput(value);
        setScanSize('');
        setScanSizeName('');
        setFocusedSizeSuggestionIndex(-1);
        
        const availableSizes = voucherConfig?.isNegativeInventoryAllowed === true
            ? activeSizes
            : activeSizes.filter(s => (itemStockRef.current[s.code] || 0) > 0);

        if (value) {
            const filtered = availableSizes.filter(s => 
                s.name.toLowerCase().includes(value.toLowerCase()) || 
                s.code.toLowerCase().includes(value.toLowerCase())
            );
            setSizeSearchResults(filtered);
            setShowSizeSuggestions(true);
        } else {
            setSizeSearchResults(availableSizes);
            setShowSizeSuggestions(true);
        }
    };

    const handleSizeInputFocus = () => {
        const availableSizes = voucherConfig?.isNegativeInventoryAllowed === true
            ? activeSizes
            : activeSizes.filter(s => (itemStockRef.current[s.code] || 0) > 0);

        if (!sizeSearchInput) {
             setSizeSearchResults(availableSizes);
             setShowSizeSuggestions(true);
        } else {
             const value = sizeSearchInput;
             const filtered = availableSizes.filter(s => 
                s.name.toLowerCase().includes(value.toLowerCase()) || 
                s.code.toLowerCase().includes(value.toLowerCase())
            );
            setSizeSearchResults(filtered);
            setShowSizeSuggestions(true);
        }
    };

    const handleSelectSize = (size) => {
        if (!size) return;
        setScanSize(size.code);
        setScanSizeName(size.name);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
        if (priceInfo) {
            let rate = priceInfo.purchasePrice || '';
            if (voucherConfig) {
                if (voucherConfig.pricingMethod === 'MRP') {
                    rate = priceInfo.mrp || '';
                } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                    rate = priceInfo.salePrice || '';
                } else {
                    rate = priceInfo.purchasePrice || '';
                }
            }
            setScanRate(rate); 
            if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
        } else {
            setScanRate('');
        }
        
        fetchStock(scanItemCode, size.code);
        
        if (quantityRef.current) quantityRef.current.focus();
    };

    const handleSizeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0) {
                handleSelectSize(sizeSearchResults[focusedSizeSuggestionIndex]);
            } else {
                const exactMatch = activeSizes.find(s => s.code.toLowerCase() === sizeSearchInput.toLowerCase() || s.name.toLowerCase() === sizeSearchInput.toLowerCase());
                if (exactMatch && (voucherConfig?.isNegativeInventoryAllowed === true || (itemStockRef.current[exactMatch.code] || 0) > 0)) {
                    handleSelectSize(exactMatch);
                } else if (sizeSearchResults.length > 0) {
                    handleSelectSize(sizeSearchResults[0]);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSizeSuggestionIndex(prev => prev < sizeSearchResults.length - 1 ? prev + 1 : prev);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSizeSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        }
    };

    const handleRateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const handleQuantityKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!scanQuantity || parseFloat(scanQuantity) <= 0) {
                const currentSizeIndex = activeSizes.findIndex(s => s.code === scanSize);
                let nextSize = null;

                if (currentSizeIndex !== -1) {
                    for (let i = currentSizeIndex + 1; i < activeSizes.length; i++) {
                        const s = activeSizes[i];
                        if (voucherConfig?.isNegativeInventoryAllowed === true || (itemStockRef.current[s.code] || 0) > 0) {
                            nextSize = s;
                            break;
                        }
                    }
                }

                if (nextSize) {
                    setScanSize(nextSize.code);
                    setScanSizeName(nextSize.name);
                    setSizeSearchInput(nextSize.name);

                    const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
                    if (priceInfo) {
                        let rate = priceInfo.purchasePrice || '';
                        if (voucherConfig) {
                            if (voucherConfig.pricingMethod === 'MRP') {
                                rate = priceInfo.mrp || '';
                            } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                                rate = priceInfo.salePrice || '';
                            } else {
                                rate = priceInfo.purchasePrice || '';
                            }
                        }
                        setScanRate(rate);
                        if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
                    } else {
                        setScanRate('');
                        setScanMrp('');
                    }

                    setScanQuantity('');
                    fetchStock(scanItemCode, nextSize.code);
                    if (quantityRef.current) quantityRef.current.focus();
                } else {
                    setScanItemCode('');
                    setScanItemName('');
                    setScanSearchInput('');
                    setScanSize('');
                    setScanSizeName('');
                    setSizeSearchInput('');
                    setScanRate('');
                    setScanQuantity('');
                    setScanMrp('');
                    setScanClosingStock('');
                    setItemPrices([]);
                    setItemStock({});
                    itemStockRef.current = {};
                    if (scanInputRef.current) scanInputRef.current.focus();
                }
                return;
            }
            handleAddItem();
        }
    };

    const handleAddItem = () => {
        if (isReceivedSto) return;
        if (!scanItemCode) {
            showMessage("Please select an Item", 'warning');
            return;
        }
        if (!scanSize) {
            showMessage("Please select a Size", 'warning');
            return;
        }
        if (!scanQuantity || parseFloat(scanQuantity) <= 0) {
            showMessage("Please enter valid Quantity", 'warning');
            return;
        }

        const qty = parseFloat(scanQuantity) || 0;
        const availableStock = parseFloat(scanClosingStock) || 0;

        const existingQtyOtherRows = gridRows.reduce((sum, row, i) => {
            if (i === editingRowIndex) return sum;
            if (row.itemCode === scanItemCode && row.sizeCode === scanSize) {
                return sum + (parseFloat(row.quantity) || 0);
            }
            return sum;
        }, 0);

        if (voucherConfig?.isNegativeInventoryAllowed !== true && existingQtyOtherRows + qty > availableStock) {
            showMessage(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
            return;
        }

        const rate = parseFloat(scanRate) || 0;
        const mrp = parseFloat(scanMrp) || 0;
        if (rate <= 0 || rate * qty <= 0) {
            showMessage('Amount cannot be 0. Please enter Rate.', 'warning');
            return;
        }

        setGridRows(prev => {
            const makeRow = (base = {}) => ({
                ...base,
                itemCode: scanItemCode,
                itemName: scanItemName,
                sizeCode: scanSize,
                sizeName: scanSizeName,
                rate: rate,
                mrp: mrp,
                price: rate,
                quantity: qty,
                amount: qty * rate,
                closingStock: scanClosingStock
            });

            if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < prev.length) {
                const baseRow = prev[editingRowIndex] || {};
                const otherIndex = prev.findIndex((row, i) =>
                    i !== editingRowIndex && row.itemCode === scanItemCode && row.sizeCode === scanSize
                );

                let updatedRows = prev;
                let targetIndex = editingRowIndex;
                let mergedQty = qty;

                if (otherIndex >= 0) {
                    mergedQty += parseFloat(prev[otherIndex]?.quantity) || 0;
                    updatedRows = prev.filter((_, i) => i !== otherIndex);
                    if (otherIndex < targetIndex) targetIndex -= 1;
                } else {
                    updatedRows = [...prev];
                }

                const newRow = makeRow(baseRow);
                newRow.quantity = mergedQty;
                newRow.amount = mergedQty * rate;
                updatedRows[targetIndex] = newRow;
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = targetIndex;
                return updatedRows;
            }

            const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
            if (existingIndex >= 0) {
                const updatedRows = [...prev];
                const existingRow = updatedRows[existingIndex];
                const newQuantity = (parseFloat(existingRow.quantity) || 0) + qty;
                const newAmount = newQuantity * rate;

                updatedRows[existingIndex] = {
                    ...existingRow,
                    quantity: newQuantity,
                    amount: newAmount,
                    rate: rate,
                    price: rate,
                    closingStock: scanClosingStock
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = existingIndex;
                return updatedRows;
            }

            pendingGridScrollRef.current = true;
            pendingGridScrollIndexRef.current = prev.length;
            return [...prev, makeRow()];
        });
        setEditingRowIndex(null);

        // Determine next state (Auto-advance Size)
        const currentSizeIndex = activeSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1) {
            // Find next size with positive stock
            for (let i = currentSizeIndex + 1; i < activeSizes.length; i++) {
                const s = activeSizes[i];
                if (voucherConfig?.isNegativeInventoryAllowed === true || (itemStockRef.current[s.code] || 0) > 0) {
                    nextSize = s;
                    break;
                }
            }
        }

        if (nextSize) {
            // Keep Item, Advance to Next Size
            setScanSize(nextSize.code);
            setScanSizeName(nextSize.name);
            setSizeSearchInput(nextSize.name);
            
            // Update Rate/MRP for new size if available in loaded prices
            const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
            if (priceInfo) {
                let rate = priceInfo.purchasePrice || '';
                if (voucherConfig) {
                    if (voucherConfig.pricingMethod === 'MRP') {
                        rate = priceInfo.mrp || '';
                    } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                        rate = priceInfo.salePrice || '';
                    } else {
                        rate = priceInfo.purchasePrice || '';
                    }
                }
                setScanRate(rate);
                if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
            } else {
                setScanRate('');
                // Retain MRP if we want, or clear it. Usually MRP might differ per size.
                // For now, let's not aggressively clear MRP unless we have better info, 
                // but strictly speaking different sizes often have different MRPs.
                // Let's clear it to be safe if no price found.
                 setScanMrp(''); 
            }
            
            setScanQuantity(''); // Clear quantity for new entry
            fetchStock(scanItemCode, nextSize.code);
            
            // Focus on Quantity to allow rapid entry
            if (quantityRef.current) quantityRef.current.focus();

        } else {
            // No next size, Reset Scan Line Completely
            setEditingRowIndex(null);
            setScanItemCode('');
            setScanItemName('');
            setScanSearchInput('');
            setScanSize('');
            setScanSizeName('');
            setSizeSearchInput('');
            setScanRate('');
            setScanQuantity('');
            setScanMrp('');
            setScanClosingStock('');
            setItemPrices([]);
            setItemStock({});
            itemStockRef.current = {};
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleEditCurrentGridRow = async () => {
        if (isReceivedSto) return;
        if (!scanItemCode) {
            showMessage("Please select an Item", 'warning');
            return;
        }
        if (!scanSize) {
            showMessage("Please select a Size", 'warning');
            return;
        }

        const existingIndex = gridRows.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
        if (existingIndex < 0) {
            showMessage("No matching row found to edit", 'warning');
            return;
        }

        await handleEditRow(existingIndex);
    };

    const handleDeleteRow = (index) => {
        if (isReceivedSto) return;
        setGridRows(prev => prev.filter((_, i) => i !== index));
        if (editingRowIndex === index) {
            setEditingRowIndex(null);
        } else if (editingRowIndex !== null && index < editingRowIndex) {
            setEditingRowIndex(prev => (prev !== null ? prev - 1 : null));
        }
    };

    const handleEditRow = async (index) => {
        if (isReceivedSto) return;
        const row = gridRows[index];
        if (!row) return;
        setEditingRowIndex(index);

        setScanItemCode(row.itemCode || '');
        setScanItemName(row.itemName || '');
        setScanSearchInput(row.itemName || row.itemCode || '');
        setScanSize(row.sizeCode || '');
        setScanSizeName(row.sizeName || '');
        setSizeSearchInput(row.sizeName || row.sizeCode || '');
        setScanRate(row.rate !== undefined && row.rate !== null ? String(row.rate) : '');
        setScanMrp(row.mrp !== undefined && row.mrp !== null ? String(row.mrp) : '');
        setScanQuantity(row.quantity !== undefined && row.quantity !== null ? String(row.quantity) : '');

        if (row.itemCode && row.sizeCode) {
            await fetchStock(row.itemCode, row.sizeCode);
        } else if (row.closingStock !== undefined && row.closingStock !== null) {
            setScanClosingStock(String(row.closingStock));
        }

        if (rateRef.current) rateRef.current.focus();
    };

    const handleSave = async (isDraft = false) => {
        if (isReceivedSto) {
            showMessage("Cannot edit STO. It is already received in Stock Transfer In.", 'warning');
            return;
        }
        if (!fromStore) {
            showMessage("Please select From Location", 'warning');
            return;
        }
        if (!toStore) {
            showMessage("Please select To Location", 'warning');
            return;
        }
        if (fromStore === toStore) {
             showMessage("From and To locations cannot be the same", 'warning');
             return;
        }
        if (!stoDate) {
            showMessage("Please select a Date", 'warning');
            return;
        }
        if (!stoNumber) {
            showMessage("Please enter STO Number", 'warning');
            return;
        }
        if (gridRows.length === 0) {
            showMessage("Please add items", 'warning');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Construct Payload
        const head = {
            id: selectedDraft ? selectedDraft.id : null,
            stoNumber,
            date: stoDate.split('-').reverse().join('-'), // Convert YYYY-MM-DD to DD-MM-YYYY
            fromStore,
            toStore,
            userName: user.userName,
            narration,
            status: isDraft ? 'DRAFT' : 'SUBMITTED'
        };

        const items = gridRows.map(row => ({
            itemCode: row.itemCode,
            itemName: row.itemName,
            sizeCode: row.sizeCode,
            sizeName: row.sizeName,
            mrp: row.mrp,
            price: row.rate, // Send Rate as Price
            quantity: row.quantity,
            amount: row.amount
        }));

        try {
            const token = localStorage.getItem('token');
            const payload = { 
                isDraft, 
                head, 
                items 
            };

            const response = await axios.post('/api/sto/save', payload, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                try {
                    const key = getLastVoucherDateKeyForStore(fromStore);
                    localStorage.setItem(key, stoDate);
                    localStorage.setItem(lastVoucherDateGlobalKey, stoDate);
                } catch {}
                Swal.fire({
                    title: 'Success',
                    text: isDraft ? 'Draft Saved Successfully' : `Stock Transfer Saved Successfully. Voucher No: ${response.data.data.stoNumber}`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    // Reset Form
                    setGridRows([]);
                    setEditingRowIndex(null);
                    setStoNumber('');
                    setNarration('');
                    setScanItemCode('');
                    setScanItemName('');
                    setScanSearchInput('');
                    setScanSize('');
                    setScanSizeName('');
                    setSizeSearchInput('');
                    setScanQuantity('');
                    setScanRate('');
                    setScanMrp('');
                    setScanClosingStock('');
                    setItemPrices([]);
                    setItemStock({});
                    itemStockRef.current = {};
                    setSelectedDraft(null);
                    setIsReceivedSto(false);

                    if (fromStore) {
                        fetchNextStoNumber(fromStore);
                    }
                    setToStore('');
                    requestCloseParentModal();
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            const msg = error?.response?.data?.message || error?.response?.data || error?.message || 'Error saving stock transfer';
            showMessage(String(msg), 'error');
        }
    };

    handleSaveRef.current = handleSave;
    handleDeleteRef.current = handleDeleteVoucher;
    hotkeyBlockRef.current = { drafts: showDrafts, received: isReceivedSto };

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-2 flex flex-col items-center justify-center font-sans">
            <div className="w-full h-[100dvh] sm:h-[95vh] sm:max-w-[98%] lg:max-w-[95%] bg-white sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col border-b border-slate-200 bg-white">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">Stock Transfer</h2>
                        </div>
                        
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowDrafts(!showDrafts);
                                    if (!showDrafts) fetchDrafts();
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    showDrafts 
                                        ? 'bg-indigo-100 text-indigo-700' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>Drafts</span>
                                {drafts.length > 0 && (
                                    <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                        {drafts.length}
                                    </span>
                                )}
                            </button>

                            {showDrafts && (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                                    {drafts.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500 text-sm">No drafts found</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {drafts.map(draft => (
                                                <div 
                                                    key={draft.id} 
                                                    onClick={() => handleDraftSelect(draft)}
                                                    className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors group"
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                                                            {draft.stoNumber}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                {draft.date}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteDraft(draft, e)}
                                                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                                                                title="Delete Draft"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                                        <span className="font-medium">{draft.fromStore}</span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className="font-medium">{draft.toStore}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Party: {draft.toStore}
                                                    </div>
                                                    {draft.narration && (
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {draft.narration}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
                            {/* From Location */}
                            {currentUser?.role !== 'STORE USER' && (
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">From Location <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Store className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        ref={fromStoreRef}
                                        value={fromStore}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFromStore(val);
                                            if (val) {
                                                fetchNextStoNumber(val);
                                            }
                                            if (val === toStore) {
                                                setToStore('');
                                            }
                                        }}
                                        onKeyDown={handleFromStoreKeyDown}
                                        disabled={isReceivedSto}
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <option value="">Select From Store</option>
                                        {Array.isArray(stores) && stores.map(store => (
                                            <option key={store.id} value={store.storeCode}>
                                                {store.storeName} ({store.storeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            )}
                            
                            {/* To Location */}
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">To Location <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Store className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        ref={toStoreRef}
                                        value={toStore}
                                        onChange={(e) => setToStore(e.target.value)}
                                        onKeyDown={handleToStoreKeyDown}
                                        disabled={isReceivedSto}
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <option value="">Select To Store</option>
                                        {Array.isArray(stores) && stores
                                            .filter(store => store.storeCode !== fromStore)
                                            .map(store => (
                                            <option key={store.id} value={store.storeCode}>
                                                {store.storeName} ({store.storeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input 
                                        ref={dateRef}
                                        type="date" 
                                        value={stoDate}
                                        disabled={isDateDisabled || isReceivedSto}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            const selectedDate = e.target.value;
                                            const today = new Date().toISOString().split('T')[0];
                                            if (selectedDate > today) {
                                                showMessage("Date cannot be greater than today", 'warning');
                                                setStoDate(today);
                                            } else {
                                                setStoDate(selectedDate);
                                            }
                                        }}
                                        onKeyDown={handleDateKeyDown}
                                        className={`pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm ${isDateDisabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* STO Number */}
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">STO No <span className="text-red-500">*</span></label>
                                <input 
                                    ref={stoNumberRef}
                                    type="text" 
                                    value={stoNumber}
                                    readOnly
                                    placeholder="Enter No"
                                    className="w-48 pl-3 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed focus:outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-12 gap-0 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center select-none z-10">
                    <div className="col-span-1 py-2 border-r border-slate-200 pl-4">#</div>
                    <div className="col-span-4 py-2 border-r border-slate-200 text-left pl-4">Item Details</div>
                    <div className="col-span-1 py-2 border-r border-slate-200">Size</div>
                    <div className="col-span-1 py-2 border-r border-slate-200">Qty</div>
                    <div className="col-span-2 py-2 border-r border-slate-200">Rate</div>
                    <div className="col-span-2 py-2 border-r border-slate-200">Amount</div>
                    <div className="col-span-1 py-2 text-center pr-4">Action</div>
                </div>

                {/* Scan Line */}
                <div className="grid grid-cols-12 gap-0 border-b border-indigo-100 bg-indigo-50/30 z-20">
                    <div className="col-span-1 py-3 border-r border-indigo-100 text-center pl-4">
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                        </div>
                    </div>
                    <div ref={scanSuggestWrapRef} className="col-span-4 py-2 border-r border-indigo-100 px-2 relative">
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={scanSearchInput}
                                onChange={handleScanInputChange}
                                onKeyDown={handleScanKeyDown}
                                onBlur={() => {
                                    setTimeout(() => {
                                        const wrap = scanSuggestWrapRef.current;
                                        if (wrap && wrap.contains(document.activeElement)) return;
                                        setShowSuggestions(false);
                                        setFocusedSuggestionIndex(-1);
                                    }, 0);
                                }}
                                placeholder="Scan or Search Item..."
                                disabled={isReceivedSto}
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                                autoComplete="off"
                            />
                            {showSuggestions && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                    {searchResults.map((item, index) => (
                                        <div
                                            id={`suggestion-item-${index}`}
                                            key={item.itemCode}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSuggestion(item);
                                            }}
                                            className={`px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors ${
                                                index === focusedSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{item.itemName}</span>
                                                <span className="text-xs text-slate-400 font-mono group-hover:text-indigo-400">{item.itemCode}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-indigo-100 group-hover:text-indigo-500">{item.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div ref={sizeSuggestWrapRef} className="col-span-1 py-2 border-r border-indigo-100 px-2 relative">
                            <input
                            ref={sizeInputRef}
                            type="text"
                            value={sizeSearchInput}
                            onChange={handleSizeInputChange}
                            onFocus={handleSizeInputFocus}
                            onKeyDown={handleSizeKeyDown}
                            onBlur={() => {
                                setTimeout(() => {
                                    const wrap = sizeSuggestWrapRef.current;
                                    if (wrap && wrap.contains(document.activeElement)) return;
                                    setShowSizeSuggestions(false);
                                    setFocusedSizeSuggestionIndex(-1);
                                }, 0);
                            }}
                            placeholder="Size"
                            disabled={isReceivedSto}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                        {showSizeSuggestions && sizeSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                    {sizeSearchResults.map((size, index) => {
                                        const stock = itemStock[size.code] !== undefined ? itemStock[size.code] : 0;
                                        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
                                        
                                        let priceDisplay = 'N/A';
                                        if (priceInfo) {
                                            let rate = priceInfo.purchasePrice;
                                            if (voucherConfig) {
                                                if (voucherConfig.pricingMethod === 'MRP') {
                                                    rate = priceInfo.mrp;
                                                } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                                                    rate = priceInfo.salePrice;
                                                } else {
                                                    rate = priceInfo.purchasePrice;
                                                }
                                            }
                                            priceDisplay = rate || '0';
                                        }

                                        return (
                                        <div
                                            id={`suggestion-size-${index}`}
                                            key={size.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSize(size);
                                            }}
                                            className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group ${
                                                index === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{size.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    STK ({closingAsOnDate}): <span className={stock > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{stock}</span> 
                                                    {' | '} 
                                                    Price: {priceDisplay}
                                                </span>
                                            </div>
                                            {size.shortOrder > 0 && (
                                                <span className="text-[10px] text-slate-400 font-mono">#{size.shortOrder}</span>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                    </div>
                    <div className="col-span-1 py-2 border-r border-indigo-100 px-2 flex flex-col justify-center">
                            <input
                            ref={quantityRef}
                            type="number"
                            value={scanQuantity}
                            onChange={(e) => setScanQuantity(e.target.value)}
                            onKeyDown={handleQuantityKeyDown}
                            placeholder="Qty"
                            disabled={isReceivedSto}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-center text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                        {scanClosingStock !== '' && (
                            <div className="text-[9px] text-center text-slate-500 font-bold mt-0.5">
                                Stock ({closingAsOnDate}): <span className={scanClosingStock > 0 ? "text-emerald-600" : "text-rose-500"}>{scanClosingStock}</span>
                            </div>
                        )}
                    </div>
                    <div className="col-span-2 py-2 border-r border-indigo-100 px-2">
                            <input
                            ref={rateRef}
                            type="number"
                            value={scanRate}
                            onChange={(e) => setScanRate(e.target.value)}
                            onKeyDown={handleRateKeyDown}
                            placeholder="Rate"
                            disabled={voucherConfig?.isPriceEditable === false || isReceivedSto}
                            className={`w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm ${
                                voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                            }`}
                        />
                    </div>
                    <div className="col-span-2 py-2 border-r border-indigo-100 px-4 flex items-center justify-end">
                        <span className="text-sm font-bold font-mono text-slate-400">
                            {((parseFloat(scanQuantity) || 0) * (parseFloat(scanRate) || 0)).toFixed(2)}
                        </span>
                    </div>
                    <div className="col-span-1 py-2 px-2 flex items-center justify-center">
                        <button 
                            onClick={handleEditCurrentGridRow}
                            disabled={isReceivedSto}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-600 rounded-lg shadow-sm shadow-indigo-100 transition-all active:scale-95 mr-2"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handleAddItem}
                            disabled={isReceivedSto}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Grid Body */}
                <div ref={gridScrollContainerRef} className="flex-1 overflow-y-auto bg-white relative">
                    {gridRows.map((row, index) => (
                        <div key={index} data-row-index={index} className="grid grid-cols-12 gap-0 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm text-slate-700 group">
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center text-slate-400 font-mono text-xs pl-4 flex items-center justify-center">
                                {index + 1}
                            </div>
                            <div className="col-span-4 py-2 border-r border-slate-100 px-4 flex flex-col justify-center">
                                <span className="font-bold text-slate-800">{row.itemName}</span>
                                <span className="text-xs text-slate-400 font-mono">{row.itemCode}</span>
                            </div>
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center font-medium flex flex-col items-center justify-center bg-slate-50/50">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-200 text-slate-600">
                                    {row.sizeName}
                                </span>
                                {row.closingStock !== undefined && (
                                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                                        Stk ({closingAsOnDate}): {row.closingStock}
                                    </span>
                                )}
                            </div>
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center font-bold text-indigo-600 flex items-center justify-center">
                                {row.quantity}
                            </div>
                            <div className="col-span-2 py-2 border-r border-slate-100 text-right px-4 font-mono text-slate-600 flex items-center justify-end">
                                {row.rate.toFixed(2)}
                            </div>
                            <div className="col-span-2 py-2 border-r border-slate-100 text-right px-4 font-bold font-mono text-slate-800 bg-slate-50/30 flex items-center justify-end">
                                {row.amount.toFixed(2)}
                            </div>
                            <div className="col-span-1 py-2 text-center flex items-center justify-center pr-4">
                                <button 
                                    onClick={() => handleEditRow(index)}
                                    disabled={isReceivedSto}
                                    className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 mr-2"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteRow(index)}
                                    disabled={isReceivedSto}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                </div>

                {/* Footer Section */}
                <div className="bg-white border-t border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col w-[500px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Narration</span>
                                <input  
                                    type="text" 
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    disabled={isReceivedSto}
                                    className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 ${isReceivedSto ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    placeholder="Enter narration..."
                                />
                            </div>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Qty</span>
                                <span className="text-xl font-bold text-slate-700">
                                    {gridRows.reduce((sum, row) => sum + (parseFloat(row.quantity) || 0), 0)}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</span>
                                <span className="text-xl font-bold text-slate-700">
                                    {gridRows.length}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                                <span className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
                                    ₹ {totalAmount.toFixed(2)}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {isEditMode && (
                                    <button
                                        onClick={handleDeleteVoucher}
                                        disabled={isReceivedSto}
                                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-100 flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span>{renderHotkeyLabel('Delete', 'D')}</span>
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleSave(true)}
                                    disabled={isReceivedSto}
                                    className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <FileText className="w-5 h-5" />
                                    <span>{renderHotkeyLabel('Save Draft', 'F')}</span>
                                </button>
                                <button 
                                    onClick={() => handleSave(false)}
                                    disabled={isReceivedSto}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Save className="w-5 h-5" />
                                    <span>{renderHotkeyLabel('Submit', 'S')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showDateEntryModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Enter Date"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowDateEntryModal(false);
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Enter Date</h3>
                            <button
                                type="button"
                                onClick={() => setShowDateEntryModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <input
                                ref={dateEntryInputRef}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="DDMMYYYY"
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                value={dateEntryInput}
                                onChange={(e) => setDateEntryInput(String(e.target.value || '').replace(/\D/g, '').slice(0, 8))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setShowDateEntryModal(false);
                                        return;
                                    }
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    const iso = parseKeyboardDateToIso(dateEntryInput);
                                    if (!iso) return;
                                    setStoDate(iso);
                                    setShowDateEntryModal(false);
                                }}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showFromStoreModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Select From Store"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowFromStoreModal(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Store className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Select From Store</h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Choose a location to continue</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFromStoreModal(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label="Close"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={fromStoreSearchInputRef}
                                    type="text"
                                    placeholder="Search store code or name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={fromStoreSearchQuery}
                                    onChange={(e) => {
                                        setFromStoreSearchQuery(e.target.value);
                                        setFocusedFromStoreIndex(0);
                                    }}
                                    onKeyDown={handleFromStoreSearchKeyDown}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredFromStores.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredFromStores.map((s, idx) => (
                                        <button
                                            id={`sto-from-store-option-${idx}`}
                                            key={s.storeCode}
                                            type="button"
                                            onClick={() => {
                                                const val = String(s?.storeCode || '').trim();
                                                setFromStore(val);
                                                if (val) {
                                                    fetchNextStoNumber(val);
                                                }
                                                if (val && val === toStore) {
                                                    setToStore('');
                                                }
                                                setShowFromStoreModal(false);
                                                setTimeout(() => toStoreRef.current?.focus(), 0);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                                                idx === focusedFromStoreIndex
                                                    ? 'bg-indigo-50 border border-indigo-200 ring-2 ring-indigo-500/20'
                                                    : String(fromStore || '') === String(s.storeCode || '')
                                                        ? 'bg-indigo-50 border border-indigo-100'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`p-2 rounded-lg ${
                                                    idx === focusedFromStoreIndex || String(fromStore || '') === String(s.storeCode || '') ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                }`}>
                                                    <Store className={`w-4 h-4 ${
                                                        idx === focusedFromStoreIndex || String(fromStore || '') === String(s.storeCode || '') ? 'text-indigo-600' : 'text-slate-400'
                                                    }`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{s.storeName}</p>
                                                    <p className="text-xs text-slate-500 font-mono">Code: {s.storeCode}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 px-4">
                                    <p className="text-sm font-medium text-slate-500">No stores found matching "{fromStoreSearchQuery}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setShowFromStoreModal(false)}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-sm"
                            >
                                {renderHotkeyLabel('Done', 'D')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StockTransferOut;
