import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Calendar, Search, FileText, X } from 'lucide-react';

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

    const [stiDate, setStiDate] = useState(formatDateForInput(new Date()));
    const [showDateEntryModal, setShowDateEntryModal] = useState(false);
    const [dateEntryInput, setDateEntryInput] = useState('');
    const dateEntryInputRef = useRef(null);
    const [stiNumber, setStiNumber] = useState('New');
    
    const [selectedSto, setSelectedSto] = useState(''); // STO Number
    const [stoDate, setStoDate] = useState('');
    const [pendingStos, setPendingStos] = useState([]);
    
    const [narration, setNarration] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [gridRows, setGridRows] = useState([]);

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
    
    const [itemPrices, setItemPrices] = useState([]); 
    
    const scanInputRef = useRef(null);
    const scanSuggestWrapRef = useRef(null);
    const sizeInputRef = useRef(null);
    const sizeSuggestWrapRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
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

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);

    // --- Helpers ---
    const showMessage = (message, type = 'info') => {
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: type,
            confirmButtonText: 'OK'
        });
    };

    const openStiDatePicker = () => {
        const el = dateRef.current;
        if (!el || el.disabled) return;
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
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            e.preventDefault();
            if (showDateEntryModal) return;
            if (showStoreModal) return;
            if (hotkeyBlockRef.current.store) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showDateEntryModal, showStoreModal]);

    useEffect(() => {
        if (!showDateEntryModal) return;
        requestAnimationFrame(() => dateEntryInputRef.current?.focus?.());
    }, [showDateEntryModal]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (showDateEntryModal || showStoreModal) return;
            if (hotkeyBlockRef.current.store) return;

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
    }, [isEditMode]);

    // --- Effects ---
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchStores();
        fetchActiveSizes();
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
                setGridRows(items);
            }
        } catch (error) {
            console.error("Error fetching STO items", error);
        }
    };

    const fetchItemDetails = async (code) => {
        if (!code) return;
        try {
            const token = localStorage.getItem('token');
            // Fetch prices for this item
            const response = await axios.get(`/api/prices/item/${code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

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
                    const response = await axios.get(`/api/items/search?query=${value}`, {
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
        
        if (value) {
            const filtered = activeSizes.filter(s => 
                s.name.toLowerCase().includes(value.toLowerCase()) || 
                s.code.toLowerCase().includes(value.toLowerCase())
            );
            setSizeSearchResults(filtered);
            setShowSizeSuggestions(true);
        } else {
            setSizeSearchResults(activeSizes);
            setShowSizeSuggestions(true);
        }
    };

    const handleSizeInputFocus = () => {
        if (!sizeSearchInput) {
             setSizeSearchResults(activeSizes);
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
        
        if (quantityRef.current) quantityRef.current.focus();
    };

    const handleSizeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0) {
                handleSelectSize(sizeSearchResults[focusedSizeSuggestionIndex]);
            } else {
                const exactMatch = activeSizes.find(s => s.code.toLowerCase() === sizeSearchInput.toLowerCase() || s.name.toLowerCase() === sizeSearchInput.toLowerCase());
                if (exactMatch) {
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
        const qty = parseFloat(scanQuantity) || 0;
        const mrp = parseFloat(scanMrp) || 0;

        setGridRows(prev => {
            const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
            
            if (existingIndex >= 0) {
                // Update existing row
                const updatedRows = [...prev];
                const existingRow = updatedRows[existingIndex];
                const newQuantity = existingRow.quantity + qty;
                const newAmount = newQuantity * rate; 
                
                updatedRows[existingIndex] = {
                    ...existingRow,
                    quantity: newQuantity,
                    amount: newAmount,
                    rate: rate 
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = existingIndex;
                return updatedRows;
            } else {
                // Add new row
                const amount = rate * qty;
                const newRow = {
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    sizeCode: scanSize,
                    sizeName: scanSizeName,
                    rate: rate,
                    mrp: mrp,
                    price: rate,
                    quantity: qty,
                    amount: amount
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = prev.length;
                return [...prev, newRow];
            }
        });

        // Determine next state (Auto-advance Size)
        const currentSizeIndex = activeSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1 && currentSizeIndex < activeSizes.length - 1) {
            nextSize = activeSizes[currentSizeIndex + 1];
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

        try {
            const token = localStorage.getItem('token');
            const url = isEditMode ? '/api/sti/update' : '/api/sti/save';
            const response = await axios.post(url, { head, items }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
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
        }
    };

    // Store Modal Handlers
    const handleStoreSearchChange = (e) => {
        setStoreSearchQuery(e.target.value);
        setFocusedStoreIndex(0);
    };

    const handleStoreSelect = (store) => {
        setToStore(store.storeCode);
        if (store.businessDate) {
            const parts = store.businessDate.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 2 && parts[2].length === 4) {
                    setStiDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    setStiDate(store.businessDate);
                }
            }
        }
        if (!isEditMode) {
            fetchNextStiNumber(store.storeCode);
        }
        setShowStoreModal(false);
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
                handleStoreSelect(filteredUserStores[focusedStoreIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowStoreModal(false);
        }
    };

    const openStoreModal = useCallback(() => {
        if (isEditMode) return;
        setStoreSearchQuery('');
        const all = Array.isArray(userStores) ? userStores : [];
        const idx = toStore ? all.findIndex(s => s?.storeCode === toStore) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus(), 100);
    }, [isEditMode, toStore, userStores]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
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

    // Sync STI date with store business date
    useEffect(() => {
        if (currentStoreInfo?.businessDate) {
            const parts = currentStoreInfo.businessDate.split('-');
            if (parts.length === 3) {
                // If format is DD-MM-YYYY, convert to YYYY-MM-DD for input type="date"
                if (parts[0].length === 2 && parts[2].length === 4) {
                    setStiDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    setStiDate(currentStoreInfo.businessDate);
                }
            }
        }
    }, [currentStoreInfo]);

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
                                className={`flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm ml-4 transition-all ${
                                    isEditMode ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:shadow-md hover:border-indigo-300'
                                }`}
                                title={isEditMode ? "Cannot change store in edit mode" : "Click to change store"}
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
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input 
                                        ref={dateRef}
                                        type="date" 
                                        value={stiDate}
                                        onChange={(e) => setStiDate(e.target.value)}
                                        onKeyDown={handleDateKeyDown}
                                        disabled={currentStoreInfo?.isDsrDisabled !== true}
                                        className={`pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none transition-all shadow-sm ${
                                            currentStoreInfo?.isDsrDisabled === true ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                        }`}
                                    />
                                </div>
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
                        {showSizeSuggestions && sizeSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                {sizeSearchResults.map((size, index) => {
                                    const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
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
                    <div className="col-span-1 py-2 border-r border-indigo-100 px-2">
                            <input
                            ref={quantityRef}
                            type="number"
                            value={scanQuantity}
                            onChange={(e) => setScanQuantity(e.target.value)}
                            onKeyDown={handleQuantityKeyDown}
                            placeholder="Qty"
                            disabled={!scanSize}
                            className={`w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-center focus:outline-none shadow-sm ${
                                !scanSize ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700'
                            }`}
                        />
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
                            {((parseFloat(scanQuantity) || 0) * (parseFloat(scanRate) || 0)).toFixed(2)}
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
                    {gridRows.map((row, index) => (
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
                            <div className="col-span-1 py-2 border-r border-slate-100 text-center font-bold text-indigo-600 flex items-center justify-center">
                                {row.quantity}
                            </div>
                            <div className="col-span-2 py-2 border-r border-slate-100 text-right px-4 font-mono text-slate-600 flex items-center justify-end">
                                {row.rate ? row.rate.toFixed(2) : '0.00'}
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
                    ))}
                    
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
                                <span className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
                                    ₹ {totalAmount.toFixed(2)}
                                </span>
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
                                <button 
                                    onClick={handleSave}
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
                                            onClick={() => handleStoreSelect(s)}
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
        </div>
    );
};

export default StockTransferIn;
