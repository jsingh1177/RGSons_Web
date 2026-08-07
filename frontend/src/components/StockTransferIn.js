import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Search, FileText, X } from 'lucide-react';
import DateInputButton from './DateInputButton';
import { formatVoucherQty } from './uomDisplay';
import VoucherPrintButton from './VoucherPrintButton';
import { getLastVoucherDateAll, setLastVoucherDateAll } from './dateUtils';

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

const StockTransferIn = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditMode, setIsEditMode] = useState(false);
    const addModeRef = useRef(true);
    addModeRef.current = !isEditMode;

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

    const gridHasItemsRef = useRef(false);
    const exitConfirmOpenRef = useRef(false);

    useEffect(() => {
        if (!isEmbedded()) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            setTimeout(() => {
                if (e.defaultPrevented) return;
                const modalOpen = Boolean(
                    document.querySelector('[aria-modal="true"]') ||
                    document.querySelector('.modal-overlay') ||
                    document.querySelector('.swal2-container')
                );
                if (modalOpen) return;
                if (addModeRef.current && gridHasItemsRef.current) {
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
                            if (res.isConfirmed) requestCloseParentModal();
                        } finally {
                            exitConfirmOpenRef.current = false;
                        }
                    })();
                    return;
                }
                requestCloseParentModal();
            }, 0);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isEmbedded, requestCloseParentModal]);

    useEffect(() => {
        if (isEmbedded()) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            if (e.defaultPrevented) return;
            const modalOpen = Boolean(
                document.querySelector('[aria-modal="true"]') ||
                document.querySelector('.modal-overlay') ||
                document.querySelector('.swal2-container')
            );
            if (modalOpen) return;
            if (addModeRef.current && gridHasItemsRef.current) {
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
    }, [isEmbedded, navigate]);

    // --- State ---
    const formatDateForInput = (date) => {
        if (!date) return '';
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

    // Header
    const [stores, setStores] = useState([]);
    const [userStores, setUserStores] = useState([]); // Stores mapped to current user
    const [toStore, setToStore] = useState(''); // Current Logged in Store
    const [fromStore, setFromStore] = useState(''); // Received From
    
    // Store Modal State
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
    const storeSearchInputRef = useRef(null);
    const handleSaveRef = useRef(null);
    const handleDeleteRef = useRef(null);
    const hotkeyBlockRef = useRef({ store: false });
    const [isSubmitSaving, setIsSubmitSaving] = useState(false);
    const isSubmitSavingRef = useRef(false);
    const [showTotalAmountModal, setShowTotalAmountModal] = useState(false);
    const [showPriceListModal, setShowPriceListModal] = useState(false);
    const [priceListModalHref, setPriceListModalHref] = useState('');
    const [priceListModalTitle, setPriceListModalTitle] = useState('Price List');

    const [stiDate, setStiDate] = useState(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (String(user?.role || '').trim().toUpperCase() === 'STORE USER') {
                return formatDateForInput(new Date());
            }
        } catch {}
        const stored = getLastVoucherDateAll();
        if (stored) {
            setLastVoucherDateAll(stored);
            return stored;
        }
        return formatDateForInput(new Date());
    });
    const [showDateEntryModal, setShowDateEntryModal] = useState(false);
    const [dateEntryInput, setDateEntryInput] = useState('');
    const dateEntryInputRef = useRef(null);
    const stiDateInitializedRef = useRef(false);
    const [stiNumber, setStiNumber] = useState('New');
    
    const [selectedSto, setSelectedSto] = useState(''); // STO Number
    const [stoDate, setStoDate] = useState('');
    const [pendingStos, setPendingStos] = useState([]);
    
    const [narration, setNarration] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [gridRows, setGridRows] = useState([]);
    gridHasItemsRef.current = Array.isArray(gridRows) && gridRows.length > 0;

    // Scan Line State (Optional for STI? Usually just verification, but let's keep it if they want to add extra items or verify)
    // For now, I'll keep the scan logic but it might just be for verifying against STO items.
    // Or maybe they just load the STO items and save. 
    // The request implies "Copy Stock Transfer Out UI", so I'll keep the scan capabilities.
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    const [scanSizeName, setScanSizeName] = useState('');
    
    const [scanRate, setScanRate] = useState('');
    const [scanQuantity, setScanQuantity] = useState('');
    const [scanMrp, setScanMrp] = useState('');

    const [scanBaseUom, setScanBaseUom] = useState('');
    const [scanAltUom, setScanAltUom] = useState('');
    const [scanFactor, setScanFactor] = useState('');
    const [scanQtyUnitMode, setScanQtyUnitMode] = useState('BASE');
    
    const [itemPrices, setItemPrices] = useState([]); 
    const itemPricesCacheRef = useRef(new Map());
    const [, setItemStock] = useState({});
    const itemStockRef = useRef({});
    const [itemStockStatus, setItemStockStatus] = useState('idle');
    
    const scanInputRef = useRef(null);
    const scanSuggestWrapRef = useRef(null);
    const sizeInputRef = useRef(null);
    const sizeSuggestWrapRef = useRef(null);
    const sizeAutoShowAllRef = useRef(false);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    const gridRowsRef = useRef([]);
    const scanItemCodeRef = useRef('');
    const scanSearchInputRef = useRef('');
    const showPriceListModalRef = useRef(false);
    
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    const fetchItemDetailsRequestSeqRef = useRef(0);
    const gridScrollContainerRef = useRef(null);
    const pendingGridScrollRef = useRef(false);
    const pendingGridScrollIndexRef = useRef(null);

    // Header Refs
    const toStoreRef = useRef(null);
    const fromStoreRef = useRef(null);
    const stoSelectRef = useRef(null);
    const dateRef = useRef(null);
    const stiNumberRef = useRef(null);
    const narrationRef = useRef(null);
    
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

    useEffect(() => {
        gridRowsRef.current = gridRows;
    }, [gridRows]);

    useEffect(() => {
        scanItemCodeRef.current = scanItemCode;
    }, [scanItemCode]);

    useEffect(() => {
        scanSearchInputRef.current = scanSearchInput;
    }, [scanSearchInput]);

    useEffect(() => {
        showPriceListModalRef.current = showPriceListModal;
    }, [showPriceListModal]);

    const closePriceListModal = useCallback(() => {
        setShowPriceListModal(false);
        setTimeout(() => scanInputRef.current?.focus?.(), 0);
    }, []);

    const openPriceListModalForSelectedItem = useCallback(() => {
        const direct = String(scanItemCodeRef.current || '').trim() || String(scanSearchInputRef.current || '').trim();
        let itemCode = direct;
        if (!itemCode) {
            const rows = Array.isArray(gridRowsRef.current) ? gridRowsRef.current : [];
            if (rows.length > 0) {
                itemCode = String(rows[rows.length - 1]?.itemCode || '').trim();
            }
        }

        setPriceListModalTitle(itemCode ? `Price List - ${itemCode}` : 'Price List');
        setPriceListModalHref(itemCode
            ? `/price-management?q=${encodeURIComponent(itemCode)}`
            : '/price-management');
        setShowPriceListModal(true);
    }, []);

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);

    useEffect(() => {
        if (!showTotalAmountModal) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setShowTotalAmountModal(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showTotalAmountModal]);

    // --- Helpers ---
    const getUomLabel = useCallback((codeRaw) => {
        const code = String(codeRaw || '').trim();
        if (!code) return '';
        const match = (Array.isArray(uoms) ? uoms : []).find(u => String(u?.code || '').trim().toLowerCase() === code.toLowerCase());
        return String(match?.name || code).trim() || code;
    }, [uoms]);

    const showMessage = (message, type = 'info') => {
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: type,
            confirmButtonText: 'OK',
            timer: type === 'error' ? 2500 : 1800,
            timerProgressBar: true
        });
    };

    const handlePrintComingSoon = useCallback(() => {
        Swal.fire({
            title: 'Info',
            text: 'Comming Soon...',
            icon: 'info',
            confirmButtonText: 'OK',
            timer: 1800,
            timerProgressBar: true
        });
    }, []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            e.preventDefault();
            const storeInfo = (Array.isArray(stores) ? stores : []).find(s => s.storeCode === toStore);
            const user = (() => {
                try {
                    return JSON.parse(localStorage.getItem('user') || '{}');
                } catch {
                    return {};
                }
            })();
            const isLocked =
                String(user?.role || '').trim().toUpperCase() === 'STORE USER' &&
                storeInfo?.isDsrDisabled === false;
            if (isLocked) return;
            if (showDateEntryModal) return;
            if (showStoreModal) return;
            if (hotkeyBlockRef.current.store) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showDateEntryModal, showStoreModal, stores, toStore]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode === 'edit') return;
        if (!isStoreUserBusinessDateLocked) return;
        const iso = formatDateForInput(currentStoreInfo?.businessDate);
        if (!iso) return;
        if (stiDate !== iso) setStiDate(iso);
    }, [currentStoreInfo?.businessDate, isStoreUserBusinessDateLocked, location.search, stiDate]);

    useEffect(() => {
        if (!showDateEntryModal) return;
        requestAnimationFrame(() => dateEntryInputRef.current?.focus?.());
    }, [showDateEntryModal]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) return;
            const isAltOnly = e.altKey && !e.shiftKey;
            const isShiftOnly = e.shiftKey && !e.altKey;
            if (!isAltOnly && !isShiftOnly) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (showDateEntryModal || showStoreModal) return;
            if (hotkeyBlockRef.current.store) return;
            if (showPriceListModalRef.current) return;

            if (key === 'p') {
                if (isShiftOnly) {
                    e.preventDefault();
                    e.stopPropagation();
                    openPriceListModalForSelectedItem();
                    return;
                }
                if (!isAltOnly) return;
                e.preventDefault();
                e.stopPropagation();
                handlePrintComingSoon();
                return;
            }
            if (!isAltOnly) return;
            if (key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveRef.current === 'function') handleSaveRef.current();
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
                setScanSize('');
                setScanSizeName('');
                setSizeSearchInput('');
                setSizeSearchResults([]);
                setShowSizeSuggestions(false);
                setFocusedSizeSuggestionIndex(-1);
                setTimeout(() => scanInputRef.current?.focus?.(), 0);
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
    }, [handlePrintComingSoon, isEditMode, openPriceListModalForSelectedItem]);

    useEffect(() => {
        if (!showPriceListModal) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            closePriceListModal();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [closePriceListModal, showPriceListModal]);

    // --- Effects ---
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchStores();
        fetchActiveSizes();
        fetchUoms();
        fetchVoucherConfig();
        if (user.userName) {
            fetchUserStore(user.userName);
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const stiNumberParam = params.get('stiNumber');
        const mode = params.get('mode');
        if (!stiNumberParam || mode !== 'edit') {
            setIsEditMode(false);
            return;
        }

        const load = async () => {
            try {
                setIsEditMode(true);
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/sti/${encodeURIComponent(stiNumberParam)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.data?.success || !res.data?.data) return;
                const head = res.data.data.head;
                const items = res.data.data.items || [];

                setStiNumber(head.stiNumber);
                setStiDate(formatDateForInput(head.date));
                setSelectedSto(head.stoNumber || '');
                setStoDate(head.stoDate || '');
                setFromStore(head.fromStore || '');
                setToStore(head.toStore || '');
                setNarration(head.narration || '');

                const mapped = items.map((item, index) => ({
                    id: Date.now() + index,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    sizeCode: item.sizeCode,
                    sizeName: item.sizeName,
                    quantity: item.quantity,
                    mrp: item.price,
                    price: item.price,
                    rate: item.price,
                    amount: item.amount
                }));
                setGridRows(mapped);
            } catch (e) {
                console.error('Error loading STI', e);
            }
        };

        load();
    }, [location.search]);

    // Fetch Pending STOs when ToStore or Business Date changes
    useEffect(() => {
        if (toStore) {
            const store = stores.find(s => s.storeCode === toStore);
            const businessDate = store?.businessDate;
            fetchPendingStos(toStore, businessDate);
        }
    }, [toStore, stores]);

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

    useEffect(() => {
        if (!showStoreModal) return;
        if (focusedStoreIndex < 0) return;
        const el = document.getElementById(`store-option-${focusedStoreIndex}`);
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest' });
        }
    }, [showStoreModal, focusedStoreIndex]);

    useEffect(() => {
        if (!showStoreModal) return;
        const onKeyDown = (e) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && String(e.key || '').toLowerCase() === 'd') {
                e.preventDefault();
                e.stopPropagation();
                setShowStoreModal(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showStoreModal]);

    // --- API Calls ---
    const fetchVoucherConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/voucher-config/STOCK_TRANSFER_IN', {
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
            }
        } catch (error) {
            console.error("Error fetching stores", error);
        }
    };

    const fetchUserStore = async (userName) => {
        try {
            const params = new URLSearchParams(location.search || '');
            const mode = params.get('mode');
            if (mode === 'edit') {
                return;
            }
            const response = await axios.get(`/api/stores/by-user/${userName}`);
            if (response.data.success && response.data.stores) {
                setUserStores(response.data.stores);
                if (response.data.stores.length > 0) {
                    const userStore = response.data.stores[0].storeCode;
                    setToStore(userStore);
                    if (!isEditMode) {
                        fetchNextStiNumber(userStore);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching user store", error);
        }
    };

    const fetchPendingStos = async (storeCode, businessDate) => {
        try {
            const token = localStorage.getItem('token');
            let url = `/api/sti/pending-stos/${storeCode}`;
            if (businessDate) {
                url += `?businessDate=${businessDate}`;
            }
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setPendingStos(response.data.stos || []);
            }
        } catch (error) {
            console.error("Error fetching pending STOs", error);
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

    const fetchUoms = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/uoms', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const list = (res?.data && res.data.success) ? (res.data.uoms || []) : [];
            setUoms(Array.isArray(list) ? list : []);
        } catch {
            setUoms([]);
        }
    };

    const fetchNextStiNumber = async (storeCode) => {
        if (!storeCode) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sti/next-number?storeCode=${storeCode}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setStiNumber(response.data.stiNumber);
            } else {
                console.warn("Backend returned success=false for STI number");
            }
        } catch (error) {
            console.error("Error fetching next STI number", error);
            // Optional: showMessage("Error generating STI Number", "error");
            setStiNumber('Error');
        }
    };

    const fetchStoItems = async (stoNo) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sti/sto-items/${stoNo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                // Map price from STO Item to mrp and rate for STI
                const items = (response.data.items || []).map(item => ({
                    ...item,
                    rate: (item.amount !== undefined && item.amount !== null && item.quantity) ? (item.amount / item.quantity) : (item.price !== undefined ? item.price : (item.mrp || 0)),
                    mrp: item.price !== undefined ? item.price : (item.mrp || 0),
                    price: item.price !== undefined ? item.price : (item.mrp || 0)
                }));
                setGridRows(await enrichRowsWithUomInfo(items));
            }
        } catch (error) {
            console.error("Error fetching STO items", error);
        }
    };

    const fetchItemDetails = async (input) => {
        const raw = String(input || '').trim();
        if (!raw) return;
        const requestSeq = ++fetchItemDetailsRequestSeqRef.current;
        const isLatestRequest = () => fetchItemDetailsRequestSeqRef.current === requestSeq;
        try {
            const token = localStorage.getItem('token');

            setItemPrices([]);
            setItemStock({});
            itemStockRef.current = {};
            setItemStockStatus(fromStore ? 'loading' : 'idle');

            const loadPricesByItemCode = async (itemCode) => {
                const key = String(itemCode || '').trim();
                if (!key) return [];
                const cached = itemPricesCacheRef.current.get(key);
                if (cached) return cached;

                const res = await axios.get(`/api/prices/item/${encodeURIComponent(key)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const ok = Boolean(res?.data?.success);
                const prices = ok && Array.isArray(res.data.prices) ? res.data.prices : [];
                itemPricesCacheRef.current.set(key, prices);
                return prices;
            };

            let resolvedItemCode = raw;
            let resolvedItemName = '';
            let resolvedMrp = '';
            let prices = [];

            try {
                prices = await loadPricesByItemCode(resolvedItemCode);
            } catch {
                prices = [];
            }

            if (Array.isArray(prices) && prices.length > 0) {
                resolvedItemName = String(prices[0]?.itemName || '').trim();
                resolvedMrp = String(prices[0]?.mrp ?? '').trim();
            } else {
                const itemResponse = await axios.get('/api/items/search', {
                    params: { query: raw },
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const items = itemResponse?.data?.success ? (itemResponse.data.items || []) : [];
                const picked = Array.isArray(items) && items.length > 0
                    ? (items.find(i => String(i?.itemCode || '').trim().toLowerCase() === raw.toLowerCase()) || items[0])
                    : null;

                const nextCode = String(picked?.itemCode || '').trim();
                const nextName = String(picked?.itemName || '').trim();
                if (nextCode) resolvedItemCode = nextCode;
                if (nextName) resolvedItemName = nextName;

                if (resolvedItemCode) {
                    try {
                        prices = await loadPricesByItemCode(resolvedItemCode);
                    } catch {
                        prices = [];
                    }
                }
                if (!resolvedItemName && Array.isArray(prices) && prices.length > 0) {
                    resolvedItemName = String(prices[0]?.itemName || '').trim();
                }
                if (!resolvedMrp && Array.isArray(prices) && prices.length > 0) {
                    resolvedMrp = String(prices[0]?.mrp ?? '').trim();
                }
            }

            if (!isLatestRequest()) return;

            setItemPrices(Array.isArray(prices) ? prices : []);

            setScanItemName(resolvedItemName || '');
            setScanItemCode(resolvedItemCode);
            setScanSearchInput(resolvedItemName || resolvedItemCode);
            setScanMrp(resolvedMrp || '');
            setShowSuggestions(false);

            setScanSize('');
            setScanSizeName('');
            setSizeSearchInput('');
            setScanRate('');
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            setScanQtyUnitMode('BASE');
            sizeAutoShowAllRef.current = true;
            requestAnimationFrame(() => {
                if (!isLatestRequest()) return;
                const availableSizes = getAvailableSizesForScan();
                sizeAutoShowAllRef.current = true;
                setSizeSearchResults(availableSizes);
                setFocusedSizeSuggestionIndex(availableSizes.length > 0 ? 0 : -1);
                setShowSizeSuggestions(availableSizes.length > 0);
                sizeInputRef.current?.focus?.();
            });

            const stockRequest = fromStore && resolvedItemCode
                ? axios.get('/api/inventory/stock/item', {
                    params: { storeCode: fromStore, itemCode: resolvedItemCode, tranDate: stiDate },
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null)
                : Promise.resolve(null);

            stockRequest.then((stockResponse) => {
                if (!isLatestRequest()) return;
                if (stockResponse && stockResponse.data?.success) {
                    const stock = stockResponse.data.stock || {};
                    setItemStock(stock);
                    itemStockRef.current = stock;
                    setItemStockStatus('loaded');
                    return;
                }
                setItemStockStatus(fromStore ? 'error' : 'idle');
            }).catch(() => {
                if (!isLatestRequest()) return;
                setItemStockStatus(fromStore ? 'error' : 'idle');
            });
        } catch (error) {
            if (!isLatestRequest()) return;
            console.error("Error fetching item details", error);
            setItemStockStatus(fromStore ? 'error' : 'idle');
        }
    };

    const getScanFactorNumber = useCallback(() => {
        const f = parseFloat(scanFactor);
        return Number.isFinite(f) && f > 0 ? f : 0;
    }, [scanFactor]);

    const getScanBaseQtyFromScan = useCallback(() => {
        const q = parseFloat(scanQuantity);
        if (!Number.isFinite(q) || q <= 0) return 0;
        if (scanQtyUnitMode !== 'ALT') return q;
        const f = getScanFactorNumber();
        if (!f) return 0;
        return q * f;
    }, [scanQuantity, scanQtyUnitMode, getScanFactorNumber]);

    const deriveLoadedRowDisplayValues = useCallback((row, altUomRaw, factorRaw) => {
        const altUom = String(altUomRaw || '').trim();
        const factorNum = parseFloat(factorRaw);
        const hasAltConversion = Boolean(altUom) && Number.isFinite(factorNum) && factorNum > 0;
        const explicitQtyMode = String(row?.qtyUnitMode || '').trim().toUpperCase();
        const quantityNum = Number(row?.quantity);
        const rateNum = Number(row?.rate);
        const derivedAltQty = hasAltConversion && Number.isFinite(quantityNum) ? (quantityNum / factorNum) : NaN;
        const canUseAlt =
            hasAltConversion &&
            Number.isFinite(derivedAltQty) &&
            Math.abs(derivedAltQty - Math.round(derivedAltQty)) < 1e-9;

        let qtyUnitMode = explicitQtyMode === 'ALT' && hasAltConversion ? 'ALT' : 'BASE';
        if (!explicitQtyMode && canUseAlt) qtyUnitMode = 'ALT';

        let displayQuantity = row?.displayQuantity;
        if (displayQuantity === undefined || displayQuantity === null || displayQuantity === '') {
            if (qtyUnitMode === 'ALT' && canUseAlt) {
                displayQuantity = Number(derivedAltQty.toFixed(2));
            } else if (Number.isFinite(quantityNum)) {
                displayQuantity = quantityNum;
            }
        }

        let enteredRate = row?.enteredRate;
        if (enteredRate === undefined || enteredRate === null || enteredRate === '') {
            if (qtyUnitMode === 'ALT' && canUseAlt && Number.isFinite(rateNum)) {
                enteredRate = Number((rateNum * factorNum).toFixed(2));
            } else if (Number.isFinite(rateNum)) {
                enteredRate = rateNum;
            }
        }

        return {
            qtyUnitMode,
            displayQuantity,
            enteredRate
        };
    }, []);

    const enrichRowsWithUomInfo = useCallback(async (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        if (list.length === 0) return list;

        const uniqueItemCodes = Array.from(new Set(list.map(r => String(r?.itemCode || '').trim()).filter(Boolean)));
        if (uniqueItemCodes.length === 0) return list;

        const token = localStorage.getItem('token');
        const results = await Promise.all(
            uniqueItemCodes.map(code =>
                axios.get(`/api/prices/item/${encodeURIComponent(code)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => ({ code, res })).catch(() => ({ code, res: null }))
            )
        );

        const infoByKey = new Map();
        for (const r of results) {
            const prices = r?.res?.data?.success ? (r.res.data.prices || []) : [];
            for (const p of prices) {
                const itemCode = String(p?.itemCode || r.code || '').trim();
                const sizeCode = String(p?.sizeCode || '').trim();
                if (!itemCode || !sizeCode) continue;
                infoByKey.set(`${itemCode}|${sizeCode}`, {
                    uom: p?.uom || '',
                    altUom: p?.altUom || '',
                    factor: p?.factor !== undefined && p?.factor !== null ? String(p.factor) : ''
                });
            }
        }

        return list.map(row => {
            const key = `${String(row?.itemCode || '').trim()}|${String(row?.sizeCode || '').trim()}`;
            const info = infoByKey.get(key);
            if (!info) {
                const derivedFallback = deriveLoadedRowDisplayValues(row, row?.altUom, row?.factor);
                return {
                    ...row,
                    displayQuantity: derivedFallback.displayQuantity,
                    qtyUnitMode: derivedFallback.qtyUnitMode,
                    enteredRate: derivedFallback.enteredRate
                };
            }
            const derivedDisplay = deriveLoadedRowDisplayValues(row, info.altUom, info.factor);
            return {
                ...row,
                baseUom: info.uom,
                altUom: info.altUom,
                factor: info.factor,
                displayQuantity: derivedDisplay.displayQuantity,
                qtyUnitMode: derivedDisplay.qtyUnitMode,
                enteredRate: derivedDisplay.enteredRate
            };
        });
    }, [deriveLoadedRowDisplayValues]);

    // --- Handlers ---
    
    // Header Navigation Handlers
    const handleStoSelectKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (narrationRef.current) narrationRef.current.focus();
        }
    };

    const handleFromStoreKeyDown = (e) => {
        // Disabled
    };

    const handleDateKeyDown = (e) => {
        // Disabled
    };

    const handleStiNumberKeyDown = (e) => {
        // Disabled
    };

    const handleStoChange = (e) => {
        const val = e.target.value;
        setSelectedSto(val);
        
        if (val) {
            // setStiNumber(val); // REMOVED: STI Number should be generated independently
            const sto = pendingStos.find(s => s.stoNumber === val);
            if (sto) {
                setFromStore(sto.fromStore);
                setStoDate(sto.date);
                setNarration(sto.narration || '');
                fetchStoItems(val);
            }
        } else {
            // setStiNumber(''); // Keep current STI Number
            setGridRows([]);
            setStoDate('');
            setNarration('');
        }
    };

    const handleFromStoreChange = (e) => {
        const val = e.target.value;
        setFromStore(val);
        // Maybe filter STO dropdown?
        if (val && selectedSto) {
             const sto = pendingStos.find(s => s.stoNumber === selectedSto);
             if (sto && sto.fromStore !== val) {
                 setSelectedSto('');
                 setGridRows([]);
             }
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
                    const response = await axios.get('/api/items/search', {
                        params: { query: value },
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

            const rawQuery = String(scanSearchInput || '').trim();
            if (!rawQuery) {
                setShowSuggestions(false);
                setFocusedSuggestionIndex(-1);
                requestAnimationFrame(() => {
                    try {
                        scanInputRef.current?.focus?.();
                        scanInputRef.current?.select?.();
                    } catch {}
                });
                return;
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
    const getAvailableSizesForScan = useCallback(() => {
        const normalize = (v) => String(v || '').trim();

        const sizeMaster = Array.isArray(activeSizes) ? activeSizes : [];
        const orderIndexByCode = new Map();
        const nameByCode = new Map();
        for (let i = 0; i < sizeMaster.length; i++) {
            const c = normalize(sizeMaster[i]?.code);
            if (!c) continue;
            if (!orderIndexByCode.has(c)) orderIndexByCode.set(c, i);
            const n = normalize(sizeMaster[i]?.name);
            if (n && !nameByCode.has(c)) nameByCode.set(c, n);
        }

        const showAll = Number(voucherConfig?.showAllSize ?? 1) !== 0;
        let sizes;

        if (showAll) {
            sizes = sizeMaster;
        } else {
            const prices = Array.isArray(itemPrices) ? itemPrices : [];
            const byCode = new Map();
            for (const p of prices) {
                const code = normalize(p?.sizeCode);
                if (!code) continue;
                if (!byCode.has(code)) {
                    const fromMasterName = nameByCode.get(code);
                    const fromPriceName = normalize(p?.sizeName);
                    byCode.set(code, { code, name: fromMasterName || fromPriceName || code });
                }
            }
            sizes = Array.from(byCode.values());
            sizes.sort((a, b) => {
                const ai = orderIndexByCode.has(a.code) ? orderIndexByCode.get(a.code) : Number.POSITIVE_INFINITY;
                const bi = orderIndexByCode.has(b.code) ? orderIndexByCode.get(b.code) : Number.POSITIVE_INFINITY;
                if (ai !== bi) return ai - bi;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
        }

        const negativeAllowed = voucherConfig?.isNegativeInventoryAllowed === true;
        if (!negativeAllowed && itemStockStatus === 'loaded') {
            const stock = itemStockRef.current || {};
            sizes = (Array.isArray(sizes) ? sizes : []).filter(s => (stock[normalize(s?.code)] || 0) > 0);
        }

        return Array.isArray(sizes) ? sizes : [];
    }, [activeSizes, itemPrices, itemStockStatus, voucherConfig?.isNegativeInventoryAllowed, voucherConfig?.showAllSize]);

    useEffect(() => {
        if (!scanItemCode) return;
        if (scanSize) return;

        const availableSizes = getAvailableSizesForScan();
        if (!Array.isArray(availableSizes) || availableSizes.length === 0) return;

        const first = availableSizes[0];
        if (!first?.code) return;

        setScanSize(first.code);
        setScanSizeName(first.name || '');
        setSizeSearchInput(first.name || '');

        const el = sizeInputRef.current;
        if (el && document.activeElement === el) {
            sizeAutoShowAllRef.current = true;
            setSizeSearchResults(availableSizes);
            setShowSizeSuggestions(true);
        }
    }, [getAvailableSizesForScan, itemStockStatus, scanItemCode, scanSize, voucherConfig?.isNegativeInventoryAllowed]);

    const handleSizeInputChange = (e) => {
        const value = e.target.value;
        sizeAutoShowAllRef.current = false;
        setSizeSearchInput(value);
        setScanSize('');
        setScanSizeName('');
        setFocusedSizeSuggestionIndex(-1);
        
        const availableSizes = getAvailableSizesForScan();
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
        const availableSizes = getAvailableSizesForScan();
        if (sizeAutoShowAllRef.current || !sizeSearchInput) {
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

    useEffect(() => {
        const el = sizeInputRef.current;
        if (!el) return;
        if (document.activeElement !== el) return;

        const availableSizes = getAvailableSizesForScan();
        const value = String(sizeSearchInput || '').trim();
        const next = sizeAutoShowAllRef.current ? availableSizes : (value
            ? availableSizes.filter(s =>
                String(s?.name || '').toLowerCase().includes(value.toLowerCase()) ||
                String(s?.code || '').toLowerCase().includes(value.toLowerCase())
            )
            : availableSizes);

        setSizeSearchResults(next);
        setShowSizeSuggestions(true);
    }, [
        getAvailableSizesForScan,
        sizeSearchInput,
        voucherConfig?.showAllSize,
        voucherConfig?.isNegativeInventoryAllowed,
        itemPrices,
        itemStockStatus,
        activeSizes
    ]);

    const handleSelectSize = (size) => {
        if (!size) return;
        const normalize = (v) => String(v || '').trim();
        const targetSizeCode = normalize(size.code);
        sizeAutoShowAllRef.current = false;
        setScanSize(size.code);
        setScanSizeName(size.name);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        const prices = Array.isArray(itemPrices) ? itemPrices : [];
        const priceInfo = prices.find(p => normalize(p?.sizeCode) === targetSizeCode);
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
            setScanBaseUom(priceInfo.uom || '');
            setScanAltUom(priceInfo.altUom || '');
            setScanFactor(priceInfo.factor !== undefined && priceInfo.factor !== null ? String(priceInfo.factor) : '');
            setScanQtyUnitMode('BASE');
        } else {
            setScanRate('');
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            setScanQtyUnitMode('BASE');
        }
        
        if (quantityRef.current) quantityRef.current.focus();
    };

    const handleSizeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0) {
                handleSelectSize(sizeSearchResults[focusedSizeSuggestionIndex]);
            } else {
                const availableSizes = getAvailableSizesForScan();
                const exactMatch = availableSizes.find(s =>
                    s.code.toLowerCase() === sizeSearchInput.toLowerCase() ||
                    s.name.toLowerCase() === sizeSearchInput.toLowerCase()
                );
                if (exactMatch) {
                    handleSelectSize(exactMatch);
                } else if (sizeSearchResults.length > 0) {
                    handleSelectSize(sizeSearchResults[0]);
                }
            }
        } else if (e.key === 'Tab') {
            if (e.shiftKey) return;
            const normalize = (v) => String(v || '').trim();
            const input = normalize(sizeSearchInput);
            const currentCode = normalize(scanSize);
            if (!input && currentCode) return;

            const availableSizes = getAvailableSizesForScan();
            const lower = (v) => normalize(v).toLowerCase();
            let candidate = null;
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0 && sizeSearchResults[focusedSizeSuggestionIndex]) {
                candidate = sizeSearchResults[focusedSizeSuggestionIndex];
            } else {
                const exactMatch = availableSizes.find(s =>
                    lower(s?.code) === lower(input) || lower(s?.name) === lower(input)
                );
                if (exactMatch) candidate = exactMatch;
                else if (sizeSearchResults.length > 0) candidate = sizeSearchResults[0];
                else if (availableSizes.length > 0) candidate = availableSizes[0];
            }
            if (candidate) handleSelectSize(candidate);
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
            if (voucherConfig?.isPriceEditable === false) {
                if (scanQuantity && parseFloat(scanQuantity) > 0) {
                    handleAddItem();
                } else if (quantityRef.current) {
                    quantityRef.current.focus();
                }
                return;
            }
            if (rateRef.current) rateRef.current.focus();
        }
    };

    const handleAddItem = () => {
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

        const rate = parseFloat(scanRate) || 0;
        const qtyDisplay = parseFloat(scanQuantity) || 0;
        const qtyBase = getScanBaseQtyFromScan();
        if (!qtyBase) {
            if (scanQtyUnitMode === 'ALT') {
                showMessage("Alternate Unit is not configured properly (Factor required)", 'warning');
            } else {
                showMessage("Please enter valid Quantity", 'warning');
            }
            return;
        }
        const mrp = parseFloat(scanMrp) || 0;

        setGridRows(prev => {
            const rawClubbingAllowed =
                voucherConfig?.isClubbingAllowed ??
                voucherConfig?.IsClubbingAllowed ??
                voucherConfig?.Is_ClubbingAllowed ??
                voucherConfig?.is_clubbing_allowed;
            const clubbingAllowed = !(
                rawClubbingAllowed === 0 ||
                rawClubbingAllowed === '0' ||
                rawClubbingAllowed === false ||
                String(rawClubbingAllowed).trim().toLowerCase() === 'false'
            );
            if (clubbingAllowed) {
                const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
                if (existingIndex >= 0) {
                    const updatedRows = [...prev];
                    const existingRow = updatedRows[existingIndex];
                    const newQuantity = (parseFloat(existingRow.quantity) || 0) + qtyBase;
                    const newAmount = newQuantity * rate;
                    
                    updatedRows[existingIndex] = {
                        ...existingRow,
                        quantity: newQuantity,
                        displayQuantity: newQuantity,
                        qtyUnitMode: 'BASE',
                        amount: newAmount,
                        rate: rate
                    };
                    pendingGridScrollRef.current = true;
                    pendingGridScrollIndexRef.current = existingIndex;
                    return updatedRows;
                }
            }

            const amount = rate * qtyBase;
            const newRow = {
                itemCode: scanItemCode,
                itemName: scanItemName,
                sizeCode: scanSize,
                sizeName: scanSizeName,
                rate: rate,
                mrp: mrp,
                price: rate,
                quantity: qtyBase,
                displayQuantity: qtyDisplay,
                qtyUnitMode: scanQtyUnitMode,
                baseUom: scanBaseUom,
                altUom: scanAltUom,
                factor: scanFactor,
                amount: amount
            };
            pendingGridScrollRef.current = true;
            pendingGridScrollIndexRef.current = prev.length;
            return [...prev, newRow];
        });

        // Determine next state (Auto-advance Size)
        const availableSizes = getAvailableSizesForScan();
        const currentSizeIndex = availableSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1) {
            nextSize = availableSizes[currentSizeIndex + 1] || null;
        }

        if (nextSize) {
            setScanSize(nextSize.code);
            setScanSizeName(nextSize.name);
            setSizeSearchInput(nextSize.name);
            
            const normalize = (v) => String(v || '').trim();
            const prices = Array.isArray(itemPrices) ? itemPrices : [];
            const priceInfo = prices.find(p => normalize(p?.sizeCode) === normalize(nextSize.code));
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
                setScanBaseUom(priceInfo.uom || '');
                setScanAltUom(priceInfo.altUom || '');
                setScanFactor(priceInfo.factor !== undefined && priceInfo.factor !== null ? String(priceInfo.factor) : '');
                setScanQtyUnitMode('BASE');
            } else {
                setScanRate('');
                 setScanMrp(''); 
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                setScanQtyUnitMode('BASE');
            }
            
            setScanQuantity(''); 
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
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            setScanQtyUnitMode('BASE');
            setItemPrices([]);
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleDeleteRow = (index) => {
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteVoucher = async () => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode !== 'edit' || !stiNumber || stiNumber === 'New') return;

        const result = await Swal.fire({
            title: 'Delete Voucher?',
            text: `STI No: ${stiNumber}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/sti/${encodeURIComponent(stiNumber)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data?.success) {
                Swal.fire({ title: 'Deleted', text: response.data.message || 'Voucher deleted', icon: 'success', timer: 1200, showConfirmButton: false }).then(() => {
                    if (isEmbedded()) {
                        requestCloseParentModal();
                        return;
                    }
                    navigate('/stock-transfer-in');
                });
            } else {
                showMessage(response.data?.message || 'Failed to delete voucher', 'error');
            }
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error deleting voucher', 'error');
        }
    };

    const handleSave = async () => {
        if (isSubmitSavingRef.current) return;
        if (!toStore) {
            showMessage("Please select To Location (Logged in Store)", 'warning');
            return;
        }
        if (!fromStore) {
            showMessage("Please select Received From Location", 'warning');
            return;
        }
        if (!selectedSto) {
             showMessage("Please select STO Number", 'warning');
             return;
        }
        if (!stiDate) {
            showMessage("Please select a Date", 'warning');
            return;
        }
        if (!stiNumber) {
            showMessage("Please enter STI Number", 'warning');
            return;
        }
        if (gridRows.length === 0) {
            showMessage("Please add items", 'warning');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Construct Payload
        const head = {
            stiNumber,
            date: stiDate.split('-').reverse().join('-'), // DD-MM-YYYY
            stoNumber: selectedSto,
            stoDate,
            fromStore,
            toStore,
            userName: user.userName,
            narration
        };

        const items = gridRows.map(row => ({
            itemCode: row.itemCode,
            itemName: row.itemName,
            sizeCode: row.sizeCode,
            sizeName: row.sizeName,
            mrp: row.mrp,
            price: row.price || row.mrp,
            quantity: row.quantity,
            amount: row.amount
        }));

        isSubmitSavingRef.current = true;
        setIsSubmitSaving(true);

        try {
            const token = localStorage.getItem('token');
            const url = isEditMode ? '/api/sti/update' : '/api/sti/save';
            const response = await axios.post(url, { head, items }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (String(user?.role || '').trim().toUpperCase() !== 'STORE USER') {
                        setLastVoucherDateAll(stiDate);
                    }
                } catch {}
                Swal.fire({
                    title: 'Success',
                    text: isEditMode ? 'Stock Transfer In Updated Successfully' : 'Stock Transfer In Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    // Reset Form
                    setGridRows([]);
                    setStiNumber('New');
                    if (!isEditMode && toStore) fetchNextStiNumber(toStore);
                    setSelectedSto('');
                    setFromStore('');
                    setNarration('');
                    setPendingStos(prev => prev.filter(s => s.stoNumber !== selectedSto));
                    requestCloseParentModal();
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            showMessage('Error saving stock transfer', 'error');
        } finally {
            isSubmitSavingRef.current = false;
            setIsSubmitSaving(false);
        }
    };

    // Store Modal Handlers
    const handleStoreSearchChange = (e) => {
        setStoreSearchQuery(e.target.value);
        setFocusedStoreIndex(0);
    };

    const applyStoreSelection = async (store) => {
        if (!store?.storeCode) return;
        if (toStore === store.storeCode) {
            setShowStoreModal(false);
            return;
        }

        const hasUnsaved =
            (Array.isArray(gridRows) && gridRows.length > 0) ||
            !!selectedSto ||
            !!fromStore ||
            !!stoDate ||
            !!String(narration || '').trim();

        if (hasUnsaved) {
            const result = await Swal.fire({
                title: 'Change Store?',
                text: 'Current voucher will be cleared.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Change',
                cancelButtonText: 'Cancel',
                customClass: { container: 'z-[10001]' }
            });
            if (!result.isConfirmed) return;
        }

        setGridRows([]);
        setSelectedSto('');
        setStoDate('');
        setFromStore('');
        setNarration('');

        setScanSearchInput('');
        setScanItemCode('');
        setScanItemName('');
        setSearchResults([]);
        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
        setSizeSearchInput('');
        setScanSize('');
        setScanSizeName('');
        setSizeSearchResults([]);
        setShowSizeSuggestions(false);
        setFocusedSizeSuggestionIndex(-1);
        setScanRate('');
        setScanQuantity('');
        setScanMrp('');
        setItemPrices([]);

        const wasEditMode = isEditMode;
        if (wasEditMode) {
            setIsEditMode(false);
            navigate('/stock-transfer-in', { replace: true });
        }
        setToStore(store.storeCode);
        fetchNextStiNumber(store.storeCode);

        const iso =
            store.isDsrDisabled === false && store.businessDate
                ? formatDateForInput(store.businessDate)
                : formatDateForInput(new Date());
        if (iso) {
            setStiDate(iso);
            stiDateInitializedRef.current = true;
        }

        setShowStoreModal(false);
        setTimeout(() => scanInputRef.current?.focus?.(), 0);
    };

    const handleStoreSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = filteredUserStores.length - 1;
            setFocusedStoreIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const max = filteredUserStores.length - 1;
            setFocusedStoreIndex(prev => Math.max(0, Math.min(max, prev < 0 ? 0 : prev - 1)));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedStoreIndex >= 0 && filteredUserStores[focusedStoreIndex]) {
                applyStoreSelection(filteredUserStores[focusedStoreIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowStoreModal(false);
        }
    };

    const openStoreModal = useCallback(() => {
        const all = Array.isArray(userStores) ? userStores : [];
        if (all.length === 0) return;
        setStoreSearchQuery('');
        const idx = toStore ? all.findIndex(s => s?.storeCode === toStore) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus(), 100);
    }, [toStore, userStores]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [openStoreModal]);

    const filteredUserStores = React.useMemo(() => {
        const list = Array.isArray(userStores) ? userStores : [];
        const q = String(storeSearchQuery || '').trim().toLowerCase();
        return list.filter(s => {
            const matchesSearch = !q || 
                String(s?.storeCode || '').toLowerCase().includes(q) || 
                String(s?.storeName || '').toLowerCase().includes(q);
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
    }, [userStores, storeSearchQuery]);

    // Filter Pending STOs based on From Store
    const filteredStos = React.useMemo(() => {
        return Array.isArray(pendingStos) ? pendingStos : [];
    }, [pendingStos]);

    const currentStoreInfo = stores.find(s => s.storeCode === toStore);
    const isStoreUserBusinessDateLocked = (() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return (
                String(user?.role || '').trim().toUpperCase() === 'STORE USER' &&
                currentStoreInfo?.isDsrDisabled === false
            );
        } catch {
            return false;
        }
    })();

    // Sync STI date with store business date (only once on initial load)
    useEffect(() => {
        if (isEditMode) return;
        if (stiDateInitializedRef.current) return;
        let iso = '';
        if (isStoreUserBusinessDateLocked && currentStoreInfo?.businessDate) {
            const parts = currentStoreInfo.businessDate.split('-');
            if (parts.length === 3) {
                // If format is DD-MM-YYYY, convert to YYYY-MM-DD for input type="date"
                if (parts[0].length === 2 && parts[2].length === 4) {
                    iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else {
                    iso = currentStoreInfo.businessDate;
                }
            }
        } else {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (String(user?.role || '').trim().toUpperCase() === 'STORE USER') {
                iso = formatDateForInput(new Date());
            } else {
                iso = getLastVoucherDateAll() || formatDateForInput(new Date());
            }
        }
        if (!iso) return;
        setStiDate(iso);
        stiDateInitializedRef.current = true;
    }, [currentStoreInfo, isEditMode, isStoreUserBusinessDateLocked]);

    useEffect(() => {
        if (!addModeRef.current) return;
        if (!stiDate) return;
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (String(user?.role || '').trim().toUpperCase() === 'STORE USER') return;
        } catch {}
        setLastVoucherDateAll(stiDate);
    }, [stiDate]);

    handleSaveRef.current = handleSave;
    handleDeleteRef.current = handleDeleteVoucher;
    hotkeyBlockRef.current = { store: showStoreModal };

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
                            <h2 className="text-lg font-bold text-slate-800">Stock Transfer In</h2>
                        </div>
                        
                        {currentStoreInfo && (
                            <div 
                                onClick={openStoreModal}
                                className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm ml-4 transition-all cursor-pointer hover:shadow-md hover:border-indigo-300"
                                title="Click to change store"
                            >
                                <div className="bg-indigo-100 p-1 rounded-full">
                                    <Store className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                        {currentStoreInfo.storeCode}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 font-sans tracking-tight">
                                        {currentStoreInfo.storeName}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6 flex-wrap">
                            {/* STO Number (Dropdown) */}
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">STO No <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        ref={stoSelectRef}
                                        value={selectedSto}
                                        onChange={handleStoChange}
                                        onKeyDown={handleStoSelectKeyDown}
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <option value="">Select STO</option>
                                        {filteredStos.map(sto => (
                                            <option key={sto.id} value={sto.stoNumber}>
                                                {sto.stoNumber} ({sto.date})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Received From Location */}
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Recv From <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Store className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        ref={fromStoreRef}
                                        value={fromStore}
                                        onChange={handleFromStoreChange}
                                        onKeyDown={handleFromStoreKeyDown}
                                        disabled
                                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed focus:outline-none transition-all shadow-sm"
                                    >
                                        <option value="">All Stores</option>
                                        {Array.isArray(stores) && stores.map(store => (
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
                                <DateInputButton
                                    inputRef={dateRef}
                                    value={stiDate}
                                    onChange={setStiDate}
                                    onKeyDown={handleDateKeyDown}
                                    disabled={isStoreUserBusinessDateLocked}
                                    wrapperClassName="relative"
                                    buttonClassName={`pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none transition-all shadow-sm text-left min-w-[9rem] ${
                                        isStoreUserBusinessDateLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-700'
                                    }`}
                                />
                            </div>

                            {/* STI Number */}
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">STI No <span className="text-red-500">*</span></label>
                                <input 
                                    ref={stiNumberRef}
                                    type="text" 
                                    value={stiNumber}
                                    onChange={(e) => setStiNumber(e.target.value)}
                                    onKeyDown={handleStiNumberKeyDown}
                                    placeholder="Enter STI No"
                                    disabled
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
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        </div>
                    </div>
                    <div ref={scanSuggestWrapRef} className="col-span-4 py-2 border-r border-indigo-100 px-2 relative">
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
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
                                disabled
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-400 placeholder:text-slate-300 cursor-not-allowed focus:outline-none shadow-sm"
                                autoComplete="off"
                            />
                            {showSuggestions && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                    {searchResults.map((item, index) => (
                                        <div
                                            id={`suggestion-item-${index}`}
                                            key={item.id}
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
                            disabled
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-center text-slate-400 cursor-not-allowed focus:outline-none shadow-sm"
                        />
                        {showSizeSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                {sizeSearchResults.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-slate-400">No sizes available</div>
                                ) : (
                                    sizeSearchResults.map((size, index) => {
                                        const normalize = (v) => String(v || '').trim();
                                        const prices = Array.isArray(itemPrices) ? itemPrices : [];
                                        const priceInfo = prices.find(p => normalize(p?.sizeCode) === normalize(size.code));
                                        let priceDisplay = 'N/A';
                                        if (priceInfo) {
                                            let rate = priceInfo.purchasePrice;
                                            if (voucherConfig) {
                                                if (voucherConfig.pricingMethod === 'MRP') {
                                                    rate = priceInfo.mrp;
                                                } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                                                    rate = priceInfo.salePrice;
                                                } else if (voucherConfig.pricingMethod === 'PURCHASE_PRICE') {
                                                    rate = priceInfo.purchasePrice;
                                                }
                                            }
                                            priceDisplay = rate || '0';
                                        }

                                        return (
                                            <div
                                                id={`suggestion-size-${index}`}
                                                key={size.code || size.id || index}
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
                                                        Price: {priceDisplay}
                                                    </span>
                                                </div>
                                                {size.shortOrder > 0 && (
                                                    <span className="text-[10px] text-slate-400 font-mono">#{size.shortOrder}</span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                    <div className="col-span-1 py-2 border-r border-indigo-100 px-2">
                            <input
                            ref={quantityRef}
                            type="number"
                            value={scanQuantity}
                            onChange={(e) => setScanQuantity(e.target.value)}
                            onKeyDown={handleQuantityKeyDown}
                            placeholder={scanQtyUnitMode === 'ALT' && scanAltUom ? `Qty (${scanAltUom})` : (scanBaseUom ? `Qty (${scanBaseUom})` : 'Qty')}
                            disabled={!scanSize}
                            className={`w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-center focus:outline-none shadow-sm ${
                                !scanSize ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700'
                            }`}
                        />
                        {scanAltUom && getScanFactorNumber() ? (
                            <select
                                value={scanQtyUnitMode}
                                onChange={(e) => setScanQtyUnitMode(e.target.value === 'ALT' ? 'ALT' : 'BASE')}
                                disabled={!scanSize}
                                className={`w-full mt-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px] font-bold text-center focus:outline-none shadow-sm ${
                                    !scanSize ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-600'
                                }`}
                            >
                                <option value="BASE">{scanBaseUom || 'UOM'}</option>
                                <option value="ALT">{scanAltUom}</option>
                            </select>
                        ) : null}
                    </div>
                    <div className="col-span-2 py-2 border-r border-indigo-100 px-2">
                            <input
                            ref={rateRef}
                            type="number"
                            value={scanRate}
                            onChange={(e) => setScanRate(e.target.value)}
                            onKeyDown={handleRateKeyDown}
                            placeholder="Rate"
                            disabled={!scanSize || voucherConfig?.isPriceEditable === false}
                            className={`w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-right focus:outline-none shadow-sm ${
                                !scanSize || voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700'
                            }`}
                        />
                    </div>
                    <div className="col-span-2 py-2 border-r border-indigo-100 px-4 flex items-center justify-end">
                        <span className="text-sm font-bold font-mono text-slate-400">
                            {(getScanBaseQtyFromScan() * (parseFloat(scanRate) || 0)).toFixed(2)}
                        </span>
                    </div>
                    <div className="col-span-1 py-2 px-2 flex items-center justify-center">
                        <button 
                            onClick={handleAddItem}
                            disabled={!scanSize}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-sm transition-all ${
                                !scanSize ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-95'
                            }`}
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Grid Body */}
                <div ref={gridScrollContainerRef} className="flex-1 overflow-y-auto bg-white relative">
                    {gridRows.map((row, index) => {
                        const factorNum = row?.factor !== undefined && row?.factor !== null ? parseFloat(row.factor) : 0;
                        const hasAltName = Boolean(String(row?.altUom || '').trim());
                        const hasAltConversion = hasAltName && Number.isFinite(factorNum) && factorNum > 0;
                        const baseUomLabel = row.baseUom ? getUomLabel(row.baseUom) : '';
                        const altUomLabel = hasAltName ? getUomLabel(row.altUom) : '';
                        const primaryQtyIsAlt =
                            row?.qtyUnitMode === 'ALT' &&
                            hasAltConversion &&
                            row.displayQuantity !== undefined &&
                            row.displayQuantity !== null;
                        const primaryQtyValue = primaryQtyIsAlt ? row.displayQuantity : (row.quantity ?? row.displayQuantity);
                        const secondaryAltQty = hasAltConversion ? (Number(row.quantity || 0) / factorNum) : null;
                        const primaryQtyUom = primaryQtyIsAlt ? altUomLabel : baseUomLabel;
                        const primaryRateIsAlt =
                            row?.qtyUnitMode === 'ALT' &&
                            hasAltConversion &&
                            row.enteredRate !== undefined &&
                            row.enteredRate !== null;
                        const primaryRateValue = primaryRateIsAlt ? row.enteredRate : row.rate;
                        const secondaryAltRate = hasAltConversion ? (Number(row.rate || 0) * factorNum) : null;
                        const primaryRateUom = primaryRateIsAlt ? altUomLabel : baseUomLabel;
                        return (
                        <div key={index} data-row-index={index} className="grid grid-cols-12 gap-0 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm text-slate-700 group">
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center text-slate-400 font-mono text-xs pl-4 flex items-center justify-center">
                                {index + 1}
                            </div>
                            <div className="col-span-4 py-2 border-r border-slate-100 px-4 flex flex-col justify-center">
                                <span className="font-bold text-slate-800">{row.itemName}</span>
                                <span className="text-xs text-slate-400 font-mono">{row.itemCode}</span>
                            </div>
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center font-medium flex items-center justify-center bg-slate-50/50">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-200 text-slate-600">
                                    {row.sizeName}
                                </span>
                            </div>
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center font-bold text-indigo-600 flex flex-col items-center justify-center">
                                <span>{formatVoucherQty(primaryQtyValue !== undefined && primaryQtyValue !== null ? primaryQtyValue : 0)}</span>
                                {primaryQtyUom ? (
                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{primaryQtyUom}</span>
                                ) : null}
                                {primaryQtyIsAlt && baseUomLabel ? (
                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        {formatVoucherQty(row.quantity)} {baseUomLabel}
                                    </span>
                                ) : null}
                                {!primaryQtyIsAlt && hasAltConversion && secondaryAltQty !== null && secondaryAltQty !== undefined ? (
                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        {formatVoucherQty(secondaryAltQty)} {altUomLabel}
                                    </span>
                                ) : null}
                                {!hasAltConversion && hasAltName ? (
                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        {altUomLabel}
                                    </span>
                                ) : null}
                            </div>
                            <div className="col-span-2 py-2 border-r border-slate-100 text-right px-4 font-mono text-slate-600 flex items-center justify-end">
                                <div className="flex flex-col items-end">
                                    <span>{Number(primaryRateValue || 0).toFixed(2)}</span>
                                    {primaryRateUom ? (
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            / {primaryRateUom}
                                        </span>
                                    ) : null}
                                    {primaryRateIsAlt && baseUomLabel ? (
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            {Number(row.rate || 0).toFixed(2)} / {baseUomLabel}
                                        </span>
                                    ) : null}
                                    {!primaryRateIsAlt && hasAltConversion ? (
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            {Number(secondaryAltRate || 0).toFixed(2)} / {altUomLabel}
                                        </span>
                                    ) : null}
                                    {!hasAltConversion && hasAltName ? (
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            / {altUomLabel}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="col-span-2 py-2 border-r border-slate-100 text-right px-4 font-bold font-mono text-slate-800 bg-slate-50/30 flex items-center justify-end">
                                {row.amount ? row.amount.toFixed(2) : '0.00'}
                            </div>
                            <div className="col-span-1 py-2 text-center flex items-center justify-center pr-4">
                                <button 
                                    onClick={() => handleDeleteRow(index)}
                                    disabled
                                    className="p-1.5 text-slate-300 rounded-lg transition-all cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )})}
                    
                </div>

                {/* Footer Section */}
                <div className="bg-white border-t border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col w-[500px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Narration</span>
                                <input  
                                    ref={narrationRef}
                                    type="text" 
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
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
                                <button
                                    type="button"
                                    onClick={() => setShowTotalAmountModal(true)}
                                    className="text-2xl font-black text-indigo-600 font-mono tracking-tight hover:text-indigo-700"
                                >
                                    ₹ {totalAmount.toFixed(2)}
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {isEditMode && (
                                    <button
                                        onClick={handleDeleteVoucher}
                                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-100 flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span>{renderHotkeyLabel('Delete', 'D')}</span>
                                    </button>
                                )}
                                <VoucherPrintButton
                                    onClick={handlePrintComingSoon}
                                    className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    {renderHotkeyLabel('Print', 'P')}
                                </VoucherPrintButton>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSubmitSaving}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Save className="w-5 h-5" />
                                    <span>{renderHotkeyLabel('Save Transfer In', 'S')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPriceListModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[12000] flex items-stretch justify-stretch p-0"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Price List"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closePriceListModal();
                    }}
                >
                    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="text-sm font-bold text-slate-800 truncate">{priceListModalTitle}</div>
                            <button
                                type="button"
                                onClick={closePriceListModal}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <iframe title="Price List" src={priceListModalHref} className="w-full h-full border-0" />
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-[240px] overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Enter Date</h3>
                            <button
                                type="button"
                                onClick={() => setShowDateEntryModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
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
                                    setStiDate(iso);
                                    setShowDateEntryModal(false);
                                    setTimeout(() => {
                                        scanInputRef.current?.focus?.();
                                        scanInputRef.current?.select?.();
                                    }, 0);
                                }}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Store Search Modal */}
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
                                    onChange={handleStoreSearchChange}
                                    onKeyDown={handleStoreSearchKeyDown}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredUserStores.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredUserStores.map((s, idx) => (
                                        <button
                                            id={`store-option-${idx}`}
                                            key={s.storeCode}
                                            type="button"
                                            onClick={() => applyStoreSelection(s)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                                                idx === focusedStoreIndex
                                                    ? 'bg-indigo-50 border border-indigo-200 ring-2 ring-indigo-500/20'
                                                    : toStore === s.storeCode
                                                        ? 'bg-indigo-50 border border-indigo-100'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`p-2 rounded-lg ${
                                                    idx === focusedStoreIndex || toStore === s.storeCode ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                }`}>
                                                    <Store className={`w-4 h-4 ${
                                                        idx === focusedStoreIndex || toStore === s.storeCode ? 'text-indigo-600' : 'text-slate-400'
                                                    }`} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-indigo-600">{s.storeCode}</div>
                                                    <div className="text-sm font-bold text-slate-700">{s.storeName}</div>
                                                </div>
                                            </div>
                                            {toStore === s.storeCode && (
                                                <div className="bg-indigo-600 text-white p-1 rounded-full">
                                                    <Save className="w-3 h-3" />
                                                </div>
                                            )}
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

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-slate-500 font-medium">
                                Showing {filteredUserStores.length} of {userStores.length} available stores
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowStoreModal(false)}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-sm"
                            >
                                {renderHotkeyLabel('Done', 'D')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showTotalAmountModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Total Amount"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowTotalAmountModal(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800">Total Amount</h3>
                                <div className="text-xs text-slate-500">
                                    STI No: {stiNumber || '-'} | Date: {stiDate || '-'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTotalAmountModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <span className="text-2xl leading-none">×</span>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto">
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-12 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                                    <div className="col-span-5 px-4 py-2">Item</div>
                                    <div className="col-span-3 px-4 py-2 border-l border-slate-800">Size</div>
                                    <div className="col-span-1 px-4 py-2 border-l border-slate-800 text-right">Qty</div>
                                    <div className="col-span-1 px-4 py-2 border-l border-slate-800 text-right">Rate</div>
                                    <div className="col-span-2 px-4 py-2 border-l border-slate-800 text-right">Amount</div>
                                </div>
                                <div className="max-h-[55vh] overflow-y-auto">
                                    {gridRows.length === 0 ? (
                                        <div className="px-4 py-10 text-center text-slate-500 text-sm">No items</div>
                                    ) : (
                                        gridRows.map((row, idx) => (
                                            <div key={row.id || idx} className="grid grid-cols-12 border-b border-slate-100 text-sm">
                                                <div className="col-span-5 px-4 py-2 text-slate-800">
                                                    {row.itemName || row.itemCode}
                                                </div>
                                                <div className="col-span-3 px-4 py-2 border-l border-slate-100 text-slate-700">
                                                    {row.sizeName || row.sizeCode}
                                                </div>
                                                <div className="col-span-1 px-4 py-2 border-l border-slate-100 text-right font-mono text-slate-700">
                                                    {row.quantity ?? ''}
                                                </div>
                                                <div className="col-span-1 px-4 py-2 border-l border-slate-100 text-right font-mono text-slate-700">
                                                    {Number(row.rate || 0).toFixed(2)}
                                                </div>
                                                <div className="col-span-2 px-4 py-2 border-l border-slate-100 text-right font-mono font-bold text-slate-900 bg-slate-50/40">
                                                    {Number(row.amount || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-6">
                            <div className="text-sm text-slate-600">
                                Items: <span className="font-semibold text-slate-900">{gridRows.length}</span>
                            </div>
                            <div className="text-lg font-bold text-slate-800">
                                Total: <span className="text-indigo-700 font-mono">₹ {totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StockTransferIn;
