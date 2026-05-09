import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ScanBarcode, Trash2, Save, X, ArrowLeft, Plus, Store, Calendar, User, Search, FileText, Pencil } from 'lucide-react';

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

const PurchaseEntry = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
    const lockedStoreCode = String(searchParams.get('storeCode') || '').trim();
    const storeLocked = searchParams.get('lockedStore') === 'true' && !!lockedStoreCode;
    const isEditFromQuery = searchParams.get('mode') === 'edit' && !!String(searchParams.get('invoiceNo') || '').trim();
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
    // Helper to format date as YYYY-MM-DD for input
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
        if (isNaN(d.getTime())) return ''; // Invalid date
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
    const lastVoucherDateGlobalKey = 'RG_lastVoucherDate:purchase';
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [purchaseLedgers, setPurchaseLedgers] = useState([]);
    const [selectedPurchaseLedger, setSelectedPurchaseLedger] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [voucherStoreCode, setVoucherStoreCode] = useState('');
    const [partyInvoiceNo, setPartyInvoiceNo] = useState('');
    const [narration, setNarration] = useState('');
    const [storeInfo, setStoreInfo] = useState(null);
    const [userStores, setUserStores] = useState([]); // Stores mapped to current user
    const [voucherConfig, setVoucherConfig] = useState(null);
    const [priceListMethod, setPriceListMethod] = useState('');
    
    // Store Modal State
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const storeSearchInputRef = useRef(null);
    const invoiceDateRef = useRef(null);
    const [showDateEntryModal, setShowDateEntryModal] = useState(false);
    const [dateEntryInput, setDateEntryInput] = useState('');
    const dateEntryInputRef = useRef(null);
    const voucherDateInitializedRef = useRef(false);
    const handleSaveDraftRef = useRef(null);
    const handleSubmitRef = useRef(null);
    const handleDeleteRef = useRef(null);
    const footerModalStateRef = useRef({ store: false, invoice: false });

    // Draft State
    const [draftVouchers, setDraftVouchers] = useState([]);
    const [selectedDraftId, setSelectedDraftId] = useState(''); // Store Invoice No actually as per API

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [gridRows, setGridRows] = useState([]);

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    
    const [scanRate, setScanRate] = useState(''); // Purchase Rate
    const [scanQuantity, setScanQuantity] = useState(''); // Quantity
    const [scanMrp, setScanMrp] = useState(''); // MRP (Hidden but kept in state if needed)
    
    // To store prices fetched for the selected item
    const [itemPrices, setItemPrices] = useState([]); 
    
    const scanInputRef = useRef(null);
    const scanSuggestWrapRef = useRef(null);
    const sizeInputRef = useRef(null);
    const sizeSuggestWrapRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    const gridScrollContainerRef = useRef(null);
    const pendingGridScrollRef = useRef(false);
    const pendingGridScrollIndexRef = useRef(null);
    
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    
    // Suggestions State (Item)
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

    // Suggestions State (Size)
    const [sizeSearchResults, setSizeSearchResults] = useState([]);
    const [showSizeSuggestions, setShowSizeSuggestions] = useState(false);
    const [focusedSizeSuggestionIndex, setFocusedSizeSuggestionIndex] = useState(-1);

    // Invoice Value Allocation State
    const [invoiceValueLedgers, setInvoiceValueLedgers] = useState([]);
    const [invoiceValueRows, setInvoiceValueRows] = useState([]);
    const [showInvoiceValueModal, setShowInvoiceValueModal] = useState(false);

    const [invoiceScanLedgerInput, setInvoiceScanLedgerInput] = useState('');
    const [invoiceScanLedgerCode, setInvoiceScanLedgerCode] = useState('');
    const [invoiceScanPercInput, setInvoiceScanPercInput] = useState('');
    const [invoiceScanAmount, setInvoiceScanAmount] = useState('');
    const [showInvoiceLedgerSuggestions, setShowInvoiceLedgerSuggestions] = useState(false);
    const [focusedInvoiceLedgerIndex, setFocusedInvoiceLedgerIndex] = useState(-1);

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

    const invoiceScanLedgerRef = useRef(null);
    const invoiceScanPercRef = useRef(null);
    const invoiceScanAmountRef = useRef(null);
    const invoiceScanAmountTouchedRef = useRef(false);
    const invoiceScanPercTouchedRef = useRef(false);
    const invoiceScanLedgerWrapRef = useRef(null);
    const invoiceLedgerSuggestionsRef = useRef(null);

    // Footer
    const totalAmount = React.useMemo(
        () => gridRows.reduce((sum, row) => sum + (row.amount || 0), 0),
        [gridRows]
    );

    const totalQty = React.useMemo(
        () => gridRows.reduce((sum, row) => sum + (parseFloat(row.quantity) || 0), 0),
        [gridRows]
    );

    const grandTotal = totalAmount;

    const [invoiceValue, setInvoiceValue] = useState('');

    const invoiceValueTotal = React.useMemo(
        () => invoiceValueRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
        [invoiceValueRows]
    );
    
    const allocatedTotal = React.useMemo(
        () => grandTotal + invoiceValueTotal,
        [grandTotal, invoiceValueTotal]
    );

    const availableInvoiceLedgers = React.useMemo(
        () =>
            invoiceValueLedgers.filter(
                l => !invoiceValueRows.some(r => r.ledgerCode === l.code)
            ),
        [invoiceValueLedgers, invoiceValueRows]
    );

    const filteredInvoiceLedgers = React.useMemo(() => {
        const query = String(invoiceScanLedgerInput || '').toLowerCase();
        const list = Array.isArray(availableInvoiceLedgers) ? availableInvoiceLedgers : [];
        if (!query) return list;
        return list.filter(l => {
            const name = String(l?.name || '').toLowerCase();
            const code = String(l?.code || '').toLowerCase();
            return name.includes(query) || code.includes(query);
        });
    }, [availableInvoiceLedgers, invoiceScanLedgerInput]);

    const invoiceValueNumber = parseFloat(invoiceValue);
    const displayInvoiceValue =
        !invoiceValue || isNaN(invoiceValueNumber) ? grandTotal : invoiceValueNumber;

    const invoiceLedgerPercByCode = React.useMemo(() => {
        const map = new Map();
        (invoiceValueLedgers || []).forEach(l => {
            const key = String(l?.code || '').trim();
            if (!key) return;
            const perc = Number(l?.perc);
            map.set(key, Number.isFinite(perc) ? perc : 0);
        });
        return map;
    }, [invoiceValueLedgers]);

    const resolveInvoiceLedger = React.useCallback((code, inputName) => {
        const codeValue = String(code || '').trim();
        if (codeValue) {
            return (invoiceValueLedgers || []).find(l => String(l?.code || '').trim() === codeValue) || null;
        }
        const nameValue = String(inputName || '').trim();
        if (!nameValue) return null;
        const lower = nameValue.toLowerCase();
        return (invoiceValueLedgers || []).find(l => {
            const lc = String(l?.code || '').trim().toLowerCase();
            const ln = String(l?.name || '').trim().toLowerCase();
            return lc === lower || ln === lower;
        }) || null;
    }, [invoiceValueLedgers]);

    const selectedInvoiceScanLedger = React.useMemo(
        () => resolveInvoiceLedger(invoiceScanLedgerCode, invoiceScanLedgerInput),
        [invoiceScanLedgerCode, invoiceScanLedgerInput, resolveInvoiceLedger]
    );

    const selectedInvoiceScanPerc = React.useMemo(() => {
        if (!selectedInvoiceScanLedger) return null;
        const perc = Number(selectedInvoiceScanLedger.perc);
        return Number.isFinite(perc) ? perc : null;
    }, [selectedInvoiceScanLedger]);

    useEffect(() => {
        if (!selectedInvoiceScanLedger) {
            setInvoiceScanPercInput('');
            invoiceScanPercTouchedRef.current = false;
            return;
        }
        if (invoiceScanPercTouchedRef.current) return;
        setInvoiceScanPercInput(selectedInvoiceScanPerc === null ? '' : formatPerc(selectedInvoiceScanPerc));
    }, [selectedInvoiceScanLedger, selectedInvoiceScanPerc]);

    const formatPerc = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return '';
        return num.toFixed(2);
    };

    const computePercAmount = (base, perc) => {
        const baseNum = Number(base);
        const percNum = Number(perc);
        if (!Number.isFinite(baseNum) || !Number.isFinite(percNum)) return null;
        if (baseNum === 0 || percNum === 0) return 0;
        return (baseNum * percNum) / 100;
    };

    const isCloseNumber = (a, b, tolerance = 0.01) => {
        const x = Number(a);
        const y = Number(b);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
        return Math.abs(x - y) <= tolerance;
    };

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
        return sc ? `RG_lastVoucherDate:purchase:${sc}` : lastVoucherDateGlobalKey;
    }, []);

    const openInvoiceDatePicker = () => {
        const el = invoiceDateRef.current;
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

    const effectivePricingMethod = priceListMethod || voucherConfig?.pricingMethod || 'PURCHASE_PRICE';

    const getRateForMethod = (priceInfo, method) => {
        if (!priceInfo) return '';
        if (method === 'MRP') return priceInfo.mrp || '';
        if (method === 'SALE_PRICE') return priceInfo.salePrice || '';
        return priceInfo.purchasePrice || '';
    };

    const getEffectiveRate = (priceInfo) => getRateForMethod(priceInfo, effectivePricingMethod);

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchPurchaseLedgers();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchVoucherConfig();
        fetchInvoiceValueLedgers();
        fetchDraftVouchers();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const invoiceNoParam = params.get('invoiceNo');
        const mode = params.get('mode');
        if (!invoiceNoParam || mode !== 'edit') {
            setIsEditMode(false);
            return;
        }

        const load = async () => {
            try {
                setIsEditMode(true);
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/purchase/details/${encodeURIComponent(invoiceNoParam)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = res.data;
                if (!data) return;

                setInvoiceNo(data.invoiceNo);
                if (storeLocked && lockedStoreCode) {
                    setVoucherStoreCode(lockedStoreCode);
                } else if (data.storeCode) {
                    setVoucherStoreCode(data.storeCode);
                }
                setInvoiceDate(formatDateForInput(data.invoiceDate));
                setSelectedParty(data.partyCode);
                setPartyInvoiceNo(data.partyInvoiceNo || '');
                setSelectedPurchaseLedger(data.purLed);
                setNarration(data.narration);

                const newRows = (data.items || []).map((item, index) => ({
                    id: Date.now() + index,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    size: item.sizeCode,
                    sizeName: item.sizeName,
                    quantity: item.quantity,
                    rate: item.price,
                    amount: item.amount
                }));
                setGridRows(newRows);

                if (data.ledgerDetails) {
                    const newLedgerRows = data.ledgerDetails.map((l, index) => ({
                        id: Date.now() + index + 1000,
                        ledgerCode: l.ledgerCode,
                        ledgerName: l.ledgerName,
                        amount: l.amount,
                        type: l.type
                    }));
                    setInvoiceValueRows(newLedgerRows);
                } else {
                    setInvoiceValueRows([]);
                }
                setInvoiceValue('');
                if (data.id) setDraftId(data.id);
                setSelectedDraftId('');
            } catch (e) {
                console.error('Error loading purchase invoice', e);
                showMessage('Error loading purchase invoice', 'error');
            }
        };

        load();
    }, [location.search, lockedStoreCode, storeLocked]);

    // Scroll focused suggestion into view
    useEffect(() => {
        if (focusedSuggestionIndex >= 0 && showSuggestions) {
            const element = document.getElementById(`suggestion-item-${focusedSuggestionIndex}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedSuggestionIndex, showSuggestions]);

    useEffect(() => {
        if (focusedSizeSuggestionIndex >= 0 && showSizeSuggestions) {
            const element = document.getElementById(`suggestion-size-${focusedSizeSuggestionIndex}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedSizeSuggestionIndex, showSizeSuggestions]);

    // --- API Calls ---
    const fetchDraftVouchers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/purchase/drafts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDraftVouchers(response.data);
        } catch (error) {
            console.error("Error fetching drafts", error);
        }
    };
    
    const handleDraftSelect = async (e) => {
        const selectedId = e.target.value;
        setSelectedDraftId(selectedId);
        if (!selectedId) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/purchase/details-by-id/${selectedId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = res.data;

            // Populate form
            setInvoiceNo(data.invoiceNo);
            setInvoiceDate(formatDateForInput(data.invoiceDate));
            setSelectedParty(data.partyCode);
            setPartyInvoiceNo(data.partyInvoiceNo || '');
            setSelectedPurchaseLedger(data.purLed);
            setNarration(data.narration);
            
            // Set Store if available
            // Note: Store is usually set from local storage or context, but if draft has different store?
            // Usually user is logged in to a store. If draft is from another store, might be issue.
            // Assuming draft is for current store or we just display what's in draft.

            // Populate Grid
            const newRows = data.items.map((item, index) => ({
                id: Date.now() + index,
                itemCode: item.itemCode,
                itemName: item.itemName,
                size: item.sizeCode,
                sizeName: item.sizeName,
                quantity: item.quantity,
                rate: item.price,
                amount: item.amount
            }));
            setGridRows(newRows);

            // Populate Ledgers
            if (data.ledgerDetails) {
                const newLedgerRows = data.ledgerDetails.map((l, index) => ({
                    id: Date.now() + index + 1000,
                    ledgerCode: l.ledgerCode,
                    ledgerName: l.ledgerName,
                    amount: l.amount,
                    type: l.type
                }));
                setInvoiceValueRows(newLedgerRows);
            } else {
                setInvoiceValueRows([]);
            }

            setInvoiceValue('');
            
            if (data.id) {
                setDraftId(data.id);
            }
            
        } catch (error) {
            console.error("Error loading draft", error);
            showMessage("Error loading draft details", 'error');
        }
    };

    const handleDeleteSelectedDraft = async () => {
        if (!selectedDraftId) return;
        const selectedDraft = draftVouchers.find(d => String(d.id) === String(selectedDraftId));
        if (!selectedDraft?.invoiceNo) return;

        const result = await Swal.fire({
            title: 'Delete Draft?',
            text: `Draft Invoice No: ${selectedDraft.invoiceNo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/purchase/drafts/${encodeURIComponent(selectedDraft.invoiceNo)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data?.success) {
                setDraftVouchers(prev => prev.filter(d => d.id !== selectedDraft.id));
                setSelectedDraftId('');
                setDraftId(null);

                setGridRows([]);
                setInvoiceNo('');
                setNarration('');
                setInvoiceValue('');
                setInvoiceValueRows([]);
                setSelectedParty('');
                setSelectedPurchaseLedger('');

                showMessage('Draft deleted', 'success');
            } else {
                showMessage(response.data?.message || 'Failed to delete draft', 'error');
            }
        } catch (error) {
            console.error("Error deleting draft", error);
            showMessage(error.response?.data?.message || 'Error deleting draft', 'error');
        }
    };

    const [draftId, setDraftId] = useState(null); // ID for update

    // Store Modal Handlers
    const handleStoreSearchChange = (e) => {
        setStoreSearchQuery(e.target.value);
        setFocusedStoreIndex(0);
    };

    const handleStoreSelect = (store) => {
        const selectedCode = store.storeCode;
        setVoucherStoreCode(selectedCode);
        setStoreInfo(store);
        let nextIso = '';
        try {
            const stored = localStorage.getItem(getLastVoucherDateKeyForStore(selectedCode));
            if (stored && /^\d{4}-\d{2}-\d{2}$/.test(String(stored))) nextIso = String(stored);
        } catch {}
        if (!nextIso && store.businessDate) {
            nextIso = formatDateForInput(store.businessDate);
        }
        if (nextIso) setInvoiceDate(nextIso);
        if (!isEditMode) {
            fetchNextInvoiceNo(selectedCode);
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
        if (storeLocked) return;
        setStoreSearchQuery('');
        const all = Array.isArray(userStores) ? userStores : [];
        const idx = voucherStoreCode ? all.findIndex(s => s?.storeCode === voucherStoreCode) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus(), 100);
    }, [lockedStoreCode, storeLocked, userStores, voucherStoreCode]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (storeLocked) return;
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [openStoreModal, storeLocked]);

    useEffect(() => {
        if (!voucherStoreCode) return;
        const all = Array.isArray(userStores) ? userStores : [];
        const match = all.find(s => s?.storeCode === voucherStoreCode);
        if (match && match?.storeCode !== storeInfo?.storeCode) {
            setStoreInfo(match);
        }
    }, [voucherStoreCode, userStores]);

    const filteredUserStores = useMemo(() => {
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

    const fetchPurchaseLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/filter?screen=Purchase&type=Purchase', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setPurchaseLedgers(response.data.data);
            } else if (Array.isArray(response.data)) {
                 setPurchaseLedgers(response.data);
            }
        } catch (error) {
            console.error("Error fetching purchase ledgers", error);
        }
    };

    const fetchParties = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/parties', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                const allParties = response.data.parties || [];
                const supplierParties = allParties.filter(p => 
                    p.type && p.type.toLowerCase() === 'supplier'
                );
                setParties(supplierParties);
            } else {
                console.error("Failed to fetch parties", response.data);
            }
        } catch (error) {
            console.error("Error fetching parties", error);
        }
    };

    const fetchStoreInfo = async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.userName) {
            try {
                const response = await axios.get(`/api/stores/by-user/${user.userName}`);
                if (response.data.success && response.data.stores) {
                    setUserStores(response.data.stores);
                    if (response.data.stores.length > 0) {
                        const all = response.data.stores;
                        const fallback = all[0];
                        if (storeLocked && lockedStoreCode) {
                            const match = all.find(st => String(st?.storeCode || '').trim() === lockedStoreCode);
                            setStoreInfo(match || { storeCode: lockedStoreCode, storeName: lockedStoreCode });
                            setVoucherStoreCode(lockedStoreCode);
                        } else {
                            setStoreInfo(fallback);
                            if (!isEditFromQuery) {
                                setVoucherStoreCode(fallback.storeCode);
                            }
                        }
                        const params = new URLSearchParams(location.search || '');
                        const mode = params.get('mode');
                        if (mode !== 'edit' && !voucherDateInitializedRef.current) {
                            voucherDateInitializedRef.current = true;
                            let iso = '';
                            try {
                                const sc = (storeLocked && lockedStoreCode) ? lockedStoreCode : fallback.storeCode;
                                const stored = localStorage.getItem(getLastVoucherDateKeyForStore(sc));
                                if (stored && /^\d{4}-\d{2}-\d{2}$/.test(String(stored))) iso = String(stored);
                            } catch {}
                            if (!iso) {
                                try {
                                    const globalStored = localStorage.getItem(lastVoucherDateGlobalKey);
                                    if (globalStored && /^\d{4}-\d{2}-\d{2}$/.test(String(globalStored))) iso = String(globalStored);
                                } catch {}
                            }
                            if (!iso && fallback.businessDate) {
                                iso = formatDateForInput(fallback.businessDate);
                            }
                            if (iso) setInvoiceDate(iso);
                        }
                        if (fallback.storeCode) {
                            if (mode !== 'edit' && (!invoiceNo || invoiceNo === 'New')) {
                                fetchNextInvoiceNo(fallback.storeCode);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching store info", error);
            }
        }
    };

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            e.preventDefault();
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!showDateEntryModal) return;
        requestAnimationFrame(() => dateEntryInputRef.current?.focus?.());
    }, [showDateEntryModal]);

    useEffect(() => {
        if (!showInvoiceValueModal) return;
        requestAnimationFrame(() => invoiceScanLedgerRef.current?.focus?.());
    }, [showInvoiceValueModal]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;

            if (key === 'i') {
                e.preventDefault();
                e.stopPropagation();
                setShowInvoiceValueModal(true);
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
                setSizeSearchInput('');
                setSizeSearchResults([]);
                setShowSizeSuggestions(false);
                setFocusedSizeSuggestionIndex(-1);
                setTimeout(() => scanInputRef.current?.focus?.(), 0);
                return;
            }
            if (key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveDraftRef.current === 'function') handleSaveDraftRef.current();
                return;
            }
            if (key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSubmitRef.current === 'function') handleSubmitRef.current();
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

    const fetchNextInvoiceNo = async (storeCode) => {
        try {
            const token = localStorage.getItem('token');
            const params = storeCode ? { storeCode } : {};
            const response = await axios.get('/api/purchase/generate-invoice-no', {
                params,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInvoiceNo(response.data);
        } catch (error) {
            console.error("Error fetching invoice no", error);
        }
    };

    const fetchVoucherConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/voucher-config/PURCHASE', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                const config = response.data.config;
                setVoucherConfig(config);
                setPriceListMethod(prev => prev || config?.pricingMethod || 'PURCHASE_PRICE');
            }
        } catch (error) {
            console.error("Error fetching voucher config", error);
        }
    };

    const fetchInvoiceValueLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/screen/Purchase', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sortedLedgers = (response.data || []).sort((a, b) => {
                const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
            });
            const activeLedgers = sortedLedgers.filter(l => l.status === 1 || l.status === true);
            setInvoiceValueLedgers(activeLedgers);
        } catch (error) {
            console.error("Error fetching invoice value ledgers", error);
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
                
                // Try to find item name
                let itemName = '';
                let itemCode = code;
                let mrp = '';

                if (prices.length > 0) {
                    itemName = prices[0].itemName;
                    mrp = prices[0].mrp; // Default MRP from first price if available
                } else {
                    // If no prices, search item master to get name
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
                setSizeSearchInput('');
                setScanRate('');

                if (sizeInputRef.current) sizeInputRef.current.focus();
            }
        } catch (error) {
            console.error("Error fetching item details", error);
        }
    };

    // --- Handlers ---
    
    // Item Scan Handlers
    const handleScanInputChange = (e) => {
        const value = e.target.value;
        setScanSearchInput(value);
        setScanItemCode('');
        setScanItemName('');
        setFocusedSuggestionIndex(-1);
        setItemPrices([]); // Clear prices
        
        if (scanDebounceRef.current) {
            clearTimeout(scanDebounceRef.current);
        }
        if (scanAbortControllerRef.current) {
            scanAbortControllerRef.current.abort();
        }

        if (value.length > 1) {
            // Debounce search
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

    const handlePriceListMethodChange = (e) => {
        const nextMethod = e.target.value;
        setPriceListMethod(nextMethod);
        const priceInfo = itemPrices.find(p => p.sizeCode === scanSize);
        if (priceInfo) {
            setScanRate(getRateForMethod(priceInfo, nextMethod));
        }
    };

    const handleSelectSize = (size) => {
        if (!size) return;
        setScanSize(size.code);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
        if (priceInfo) {
            setScanRate(getEffectiveRate(priceInfo));
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
                // If typed value matches exactly a size code or name
                const exactMatch = activeSizes.find(s => s.code.toLowerCase() === sizeSearchInput.toLowerCase() || s.name.toLowerCase() === sizeSearchInput.toLowerCase());
                if (exactMatch) {
                    handleSelectSize(exactMatch);
                } else if (sizeSearchResults.length > 0) {
                    // Or select first suggestion
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
                        nextSize = activeSizes[i];
                        break;
                    }
                }

                if (nextSize) {
                    setScanSize(nextSize.code);
                    setSizeSearchInput(nextSize.name);

                    const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
                    if (priceInfo) {
                        setScanRate(getEffectiveRate(priceInfo));
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
                    setSizeSearchInput('');
                    setScanRate('');
                    setScanQuantity('');
                    setScanMrp('');
                    setItemPrices([]);
                    if (scanInputRef.current) scanInputRef.current.focus();
                }
                return;
            }

            handleAddItem();
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
        if (!scanRate) {
             showMessage("Please enter Purchase Rate", 'warning');
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
            if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < prev.length) {
                const updatedRows = [...prev];
                updatedRows[editingRowIndex] = {
                    ...updatedRows[editingRowIndex],
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    size: scanSize,
                    rate: rate,
                    mrp: mrp,
                    quantity: qty,
                    amount: rate * qty
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = editingRowIndex;
                return updatedRows;
            }

            const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.size === scanSize);

            if (existingIndex >= 0) {
                const updatedRows = [...prev];
                const existingRow = updatedRows[existingIndex];
                const newQuantity = (existingRow.quantity || 0) + qty;
                const newAmount = newQuantity * rate;

                updatedRows[existingIndex] = {
                    ...existingRow,
                    quantity: newQuantity,
                    amount: newAmount,
                    rate: rate,
                    mrp: mrp
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = existingIndex;
                return updatedRows;
            } else {
                const amount = rate * qty;
                const newRow = {
                    id: Date.now(),
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    size: scanSize,
                    rate: rate,
                    mrp: mrp,
                    quantity: qty,
                    amount: amount
                };
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = prev.length;
                return [...prev, newRow];
            }
        });

        if (editingRowIndex !== null) {
            setEditingRowIndex(null);
            setScanItemCode('');
            setScanItemName('');
            setScanSearchInput('');
            setScanSize('');
            setSizeSearchInput('');
            setScanRate('');
            setScanQuantity('');
            setScanMrp('');
            setItemPrices([]);
            if (scanInputRef.current) scanInputRef.current.focus();
            return;
        }

        const currentSizeIndex = activeSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;

        if (currentSizeIndex !== -1) {
            for (let i = currentSizeIndex + 1; i < activeSizes.length; i++) {
                nextSize = activeSizes[i];
                break;
            }
        }

        if (nextSize) {
            setScanSize(nextSize.code);
            setSizeSearchInput(nextSize.name);

            const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
            if (priceInfo) {
                setScanRate(getEffectiveRate(priceInfo));
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
            setSizeSearchInput('');
            setScanRate('');
            setScanQuantity('');
            setScanMrp('');
            setItemPrices([]);
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleDeleteRow = (index) => {
        setEditingRowIndex(prev => (prev === index ? null : prev));
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditRow = (row, index) => {
        if (!row) return;
        setEditingRowIndex(index);
        setScanItemCode(row.itemCode || '');
        setScanItemName(row.itemName || '');
        setScanSearchInput(row.itemName || row.itemCode || '');
        setScanSize(row.size || '');
        const sizeName = activeSizes.find(s => s.code === row.size)?.name || row.size || '';
        setSizeSearchInput(sizeName);
        setScanRate(String(row.rate ?? ''));
        setScanQuantity(String(row.quantity ?? ''));
        setScanMrp(String(row.mrp ?? ''));
        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 0);
    };

    const handleDeleteInvoiceRow = (index) => {
        setInvoiceValueRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleInvoiceScanLedgerChange = (e) => {
        const value = e.target.value;
        setInvoiceScanLedgerInput(value);
        setInvoiceScanLedgerCode('');
        setInvoiceScanPercInput('');
        invoiceScanPercTouchedRef.current = false;
        invoiceScanAmountTouchedRef.current = false;
        setShowInvoiceLedgerSuggestions(true);
        setFocusedInvoiceLedgerIndex(-1);
    };

    const handleSelectInvoiceScanLedger = (ledger) => {
        setInvoiceScanLedgerInput(ledger.name);
        setInvoiceScanLedgerCode(ledger.code);
        const perc = Number(ledger?.perc);
        const percValue = Number.isFinite(perc) ? perc : 0;
        setInvoiceScanPercInput(percValue ? formatPerc(percValue) : '');
        invoiceScanPercTouchedRef.current = false;
        invoiceScanAmountTouchedRef.current = false;
        if (percValue > 0) {
            const computed = computePercAmount(grandTotal, percValue);
            setInvoiceScanAmount(computed === null ? '' : computed.toFixed(2));
        }
        setShowInvoiceLedgerSuggestions(false);
        setFocusedInvoiceLedgerIndex(-1);
        setTimeout(() => {
            if (invoiceScanAmountRef.current) {
                invoiceScanAmountRef.current.focus();
            }
        }, 0);
    };

    const handleInvoiceScanLedgerKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredInvoiceLedgers.length === 0) return;
            setShowInvoiceLedgerSuggestions(true);
            setFocusedInvoiceLedgerIndex(prev => {
                if (prev === -1) return e.key === 'ArrowDown' ? 0 : filteredInvoiceLedgers.length - 1;
                if (e.key === 'ArrowDown') {
                    return (prev + 1) % filteredInvoiceLedgers.length;
                }
                return (prev - 1 + filteredInvoiceLedgers.length) % filteredInvoiceLedgers.length;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredInvoiceLedgers.length > 0) {
                const index = focusedInvoiceLedgerIndex >= 0 && focusedInvoiceLedgerIndex < filteredInvoiceLedgers.length
                    ? focusedInvoiceLedgerIndex
                    : 0;
                handleSelectInvoiceScanLedger(filteredInvoiceLedgers[index]);
                return;
            }
            if (invoiceScanAmountRef.current) {
                invoiceScanAmountRef.current.focus();
            }
        }
    };

    const handleInvoiceScanAmountChange = (e) => {
        invoiceScanAmountTouchedRef.current = true;
        setInvoiceScanAmount(e.target.value);
    };

    const handleInvoiceScanPercChange = (e) => {
        invoiceScanPercTouchedRef.current = true;
        setInvoiceScanPercInput(e.target.value);
    };

    const handleInvoiceScanPercKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const percNum = parseFloat(invoiceScanPercInput);
        if (isNaN(percNum)) return;
        const computed = computePercAmount(grandTotal, percNum);
        invoiceScanAmountTouchedRef.current = false;
        setInvoiceScanAmount(computed === null ? '' : computed.toFixed(2));
        setTimeout(() => invoiceScanAmountRef.current?.focus(), 0);
    };

    useEffect(() => {
        if (!selectedInvoiceScanLedger) return;
        if (invoiceScanAmountTouchedRef.current) return;
        const percNum = parseFloat(invoiceScanPercInput);
        if (isNaN(percNum) || percNum <= 0) return;
        const computed = computePercAmount(grandTotal, percNum);
        setInvoiceScanAmount(computed === null ? '' : computed.toFixed(2));
    }, [grandTotal, selectedInvoiceScanLedger, invoiceScanPercInput]);

    const handleAddInvoiceRow = () => {
        const rawAmount = parseFloat(invoiceScanAmount);
        if (isNaN(rawAmount) || rawAmount === 0) return;

        let code = invoiceScanLedgerCode;
        let name = invoiceScanLedgerInput.trim();

        if (!code && name) {
            const exact = availableInvoiceLedgers.find(l =>
                (l.name && l.name.toLowerCase() === name.toLowerCase()) ||
                (l.code && l.code.toLowerCase() === name.toLowerCase())
            );
            const partial = exact || availableInvoiceLedgers.find(l =>
                (l.name && l.name.toLowerCase().startsWith(name.toLowerCase())) ||
                (l.code && l.code.toLowerCase().startsWith(name.toLowerCase()))
            );
            if (partial) {
                code = partial.code;
                name = partial.name;
            }
        }

        if (!code || !name) return;

        const ledger = resolveInvoiceLedger(code, name);
        const percFromInput = parseFloat(invoiceScanPercInput);
        const percFromLedger = ledger ? Number(ledger.perc) : Number(invoiceLedgerPercByCode.get(code) || 0);
        const percValue = !isNaN(percFromInput) ? percFromInput : (Number.isFinite(percFromLedger) ? percFromLedger : 0);
        const computed = percValue > 0
            ? computePercAmount(grandTotal, percValue)
            : null;
        const amountAuto = computed !== null && isCloseNumber(rawAmount, computed, 0.02);
        const finalAmount = computed !== null && amountAuto ? computed : rawAmount;

        setInvoiceValueRows(prev => {
            const existingIndex = prev.findIndex(r => r.ledgerCode === code);
            if (existingIndex >= 0) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                if (computed !== null) {
                    updated[existingIndex] = {
                        ...existing,
                        ledgerName: name,
                        perc: percValue,
                        amountAuto,
                        amount: finalAmount.toFixed(2)
                    };
                    return updated;
                }
                const newAmount = (parseFloat(existing.amount) || 0) + finalAmount;
                updated[existingIndex] = {
                    ...existing,
                    ledgerName: name,
                    perc: percValue,
                    amountAuto: false,
                    amount: newAmount.toFixed(2)
                };
                return updated;
            }
            return [
                ...prev,
                {
                    ledgerCode: code,
                    ledgerName: name,
                    perc: percValue,
                    amountAuto,
                    amount: finalAmount.toFixed(2)
                }
            ];
        });

        setInvoiceScanLedgerInput('');
        setInvoiceScanLedgerCode('');
        setInvoiceScanPercInput('');
        setInvoiceScanAmount('');
        invoiceScanAmountTouchedRef.current = false;
        invoiceScanPercTouchedRef.current = false;
        setShowInvoiceLedgerSuggestions(false);
        setFocusedInvoiceLedgerIndex(-1);

        if (invoiceScanLedgerRef.current) {
            invoiceScanLedgerRef.current.focus();
        }
    };

    useEffect(() => {
        if (!invoiceValueLedgers || invoiceValueLedgers.length === 0) return;
        setInvoiceValueRows(prev => prev.map(row => {
            const hasPerc = row?.perc !== undefined && row?.perc !== null;
            const percValue = hasPerc ? Number(row.perc) : Number(invoiceLedgerPercByCode.get(row.ledgerCode) || 0);
            const percNum = Number.isFinite(percValue) ? percValue : 0;
            const base = Number(grandTotal);
            const computed = Number.isFinite(base) && base > 0 && percNum > 0
                ? computePercAmount(base, percNum)
                : null;
            const existingAmount = parseFloat(row.amount) || 0;
            const amountAuto = row?.amountAuto === true
                ? true
                : computed !== null && isCloseNumber(existingAmount, computed, 0.02);
            if (hasPerc && row?.amountAuto !== undefined) return row;
            return { ...row, perc: percNum, amountAuto };
        }));
    }, [invoiceValueLedgers, invoiceLedgerPercByCode, grandTotal]);

    useEffect(() => {
        const base = Number(grandTotal);
        if (!Number.isFinite(base) || base <= 0) return;
        setInvoiceValueRows(prev => {
            let changed = false;
            const next = prev.map(row => {
                const percValue = Number(row?.perc ?? 0);
                if (!Number.isFinite(percValue) || percValue <= 0) return row;
                if (row?.amountAuto !== true) return row;
                const computed = computePercAmount(base, percValue);
                if (computed === null) return row;
                const fixed = computed.toFixed(2);
                if (String(row.amount) === fixed) return row;
                changed = true;
                return { ...row, amount: fixed };
            });
            return changed ? next : prev;
        });
    }, [grandTotal]);

    useEffect(() => {
        if (!showInvoiceValueModal) return;
        if (!showInvoiceLedgerSuggestions) return;
        const onMouseDown = (e) => {
            const el = invoiceScanLedgerWrapRef.current;
            if (el && !el.contains(e.target)) {
                setShowInvoiceLedgerSuggestions(false);
                setFocusedInvoiceLedgerIndex(-1);
            }
        };
        window.addEventListener('mousedown', onMouseDown);
        return () => window.removeEventListener('mousedown', onMouseDown);
    }, [showInvoiceValueModal, showInvoiceLedgerSuggestions]);

    useEffect(() => {
        if (!showInvoiceValueModal) return;
        if (!showInvoiceLedgerSuggestions) return;
        const idx = focusedInvoiceLedgerIndex;
        if (idx < 0) return;
        const container = invoiceLedgerSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showInvoiceValueModal, showInvoiceLedgerSuggestions, focusedInvoiceLedgerIndex, invoiceScanLedgerInput]);

    const handleInvoiceScanAmountKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddInvoiceRow();
        }
    };

    const handleInvoiceModalDone = () => {
        const numericInvoiceValue = parseFloat(invoiceValue);
        if (!invoiceValue || isNaN(numericInvoiceValue) || numericInvoiceValue === 0) {
            showMessage("Please enter Invoice Value", 'warning');
            return;
        }

        const allocatedTotalAtSave = grandTotal + invoiceValueRows.reduce(
            (sum, row) => sum + (parseFloat(row.amount) || 0),
            0
        );
        const diffAtSave = Math.abs(numericInvoiceValue - allocatedTotalAtSave);
        if (diffAtSave > 0.01) {
            showMessage(
                `Invoice Value (₹${numericInvoiceValue.toFixed(2)}) must match Total Allocated (₹${allocatedTotalAtSave.toFixed(2)})`,
                'warning'
            );
            return;
        }

        setShowInvoiceValueModal(false);
    };

    useEffect(() => {
        if (!showInvoiceValueModal) return;
        const onKeyDown = (e) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && String(e.key || '').toLowerCase() === 'd') {
                e.preventDefault();
                e.stopPropagation();
                handleInvoiceModalDone();
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setShowInvoiceValueModal(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showInvoiceValueModal, invoiceValue, invoiceValueRows, grandTotal]);

    const handleOpenInvoiceModal = () => {
        // Do not auto-populate invoiceValue or add default ledger
        setShowInvoiceValueModal(true);
    };

    const processSave = async (isDraft) => {
        // Validation
        if (!selectedParty) {
            showMessage("Please select a Party", 'warning');
            return;
        }
        if (!selectedPurchaseLedger) {
            showMessage("Please select a Purchase Ledger", 'warning');
            return;
        }
        if (!invoiceDate) {
            showMessage("Please select a Date", 'warning');
            return;
        }
        if (!invoiceNo) {
            showMessage("Please enter Invoice No", 'warning');
            return;
        }
        if (gridRows.length === 0) {
            showMessage("Please add items", 'warning');
            return;
        }

        const numericInvoiceValue = parseFloat(invoiceValue);
        if (!invoiceValue || isNaN(numericInvoiceValue) || numericInvoiceValue === 0) {
            showMessage("Please enter Invoice Value", 'warning');
            return;
        }

        const allocatedTotalAtSave = grandTotal + invoiceValueRows.reduce(
            (sum, row) => sum + (parseFloat(row.amount) || 0),
            0
        );
        const diffAtSave = Math.abs(numericInvoiceValue - allocatedTotalAtSave);
        if (diffAtSave > 0.01) {
            showMessage(
                `Invoice Value (₹${numericInvoiceValue.toFixed(2)}) must match Total Allocated (₹${allocatedTotalAtSave.toFixed(2)})`,
                'warning'
            );
            return;
        }

        // Prepare Payload
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const effectiveStoreCode = (isEditMode && voucherStoreCode) ? voucherStoreCode : storeInfo?.storeCode;
        if (!effectiveStoreCode) {
            showMessage('Store information missing. Cannot save.', 'error');
            return;
        }
        
        const head = {
            id: draftId, // Include ID if editing a draft
            invoiceNo,
            invoiceDate: invoiceDate.split('-').reverse().join('-'),
            partyCode: selectedParty,
            partyInvoiceNo,
            purLed: selectedPurchaseLedger,
            narration: String(narration || '').trim(),
            storeCode: effectiveStoreCode,
            userId: user.id,
            userName: user.userName,
            purchaseAmount: totalAmount,
            totalAmount: numericInvoiceValue
        };

        const items = gridRows.map(row => ({
            itemCode: row.itemCode,
            sizeCode: row.size,
            mrp: row.mrp,
            rate: row.rate,
            price: row.rate,
            quantity: row.quantity,
            amount: row.amount
        }));

        const ledgers = invoiceValueRows.map(row => ({
            ledgerCode: row.ledgerCode,
            amount: parseFloat(row.amount) || 0
        }));

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/purchase/save', { head, items, ledgers, isDraft }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                try {
                    const key = getLastVoucherDateKeyForStore(effectiveStoreCode);
                    localStorage.setItem(key, invoiceDate);
                    localStorage.setItem(lastVoucherDateGlobalKey, invoiceDate);
                } catch {}
                Swal.fire({
                    title: 'Success',
                    text: isDraft ? 'Draft Saved Successfully' : 'Purchase Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    setGridRows([]);
                    setInvoiceNo('');
                    setPartyInvoiceNo('');
                    setNarration('');
                    setInvoiceValue('');
                    setInvoiceValueRows([]);
                    setInvoiceScanLedgerInput('');
                    setInvoiceScanLedgerCode('');
                    setInvoiceScanAmount('');
                    setShowInvoiceLedgerSuggestions(false);
                    setFocusedInvoiceLedgerIndex(-1);
                    setSelectedPurchaseLedger('');
                    setDraftId(null);
                    setSelectedDraftId('');
                    fetchDraftVouchers(); // Refresh drafts list
                    if (storeInfo?.storeCode) {
                        fetchNextInvoiceNo(storeInfo.storeCode);
                    }
                    requestCloseParentModal();
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            const backendMessage = error.response?.data?.message;
            showMessage(backendMessage || 'Error saving purchase', 'error');
        }
    };

    const handleSaveDraft = () => {
        processSave(true);
    };

    const handleSubmit = () => {
        Swal.fire({
            title: 'Confirm Submission',
            text: "Are you sure you want to submit? Inventory will be updated.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Submit!'
        }).then((result) => {
            if (result.isConfirmed) {
                processSave(false);
            }
        });
    };

    handleSaveDraftRef.current = handleSaveDraft;
    handleSubmitRef.current = handleSubmit;
    footerModalStateRef.current = {
        store: showStoreModal,
        invoice: showInvoiceValueModal
    };

    const handleDeleteVoucher = async () => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode !== 'edit' || !invoiceNo) return;

        const result = await Swal.fire({
            title: 'Delete Voucher?',
            text: `Purchase Invoice No: ${invoiceNo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/purchase/${encodeURIComponent(invoiceNo)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data?.success) {
                Swal.fire({ title: 'Deleted', text: response.data.message || 'Voucher deleted', icon: 'success', timer: 1200, showConfirmButton: false }).then(() => {
                    if (isEmbedded()) {
                        requestCloseParentModal();
                        return;
                    }
                    navigate('/purchase-entry');
                });
            } else {
                showMessage(response.data?.message || 'Failed to delete voucher', 'error');
            }
        } catch (error) {
            showMessage(error.response?.data?.message || 'Error deleting voucher', 'error');
        }
    };

    handleDeleteRef.current = handleDeleteVoucher;

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
                            <h2 className="text-lg font-bold text-slate-800">Purchase Voucher</h2>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Draft Dropdown */}
                            {draftVouchers.length > 0 && (
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-medium shadow-sm"
                                        value={selectedDraftId}
                                        onChange={handleDraftSelect}
                                    >
                                        <option value="">Load Draft...</option>
                                        {draftVouchers.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.invoiceNo} - {d.invoiceDate} - {d.partyCode}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleDeleteSelectedDraft}
                                disabled={!selectedDraftId}
                                className={`p-2 rounded-lg border transition-colors ${
                                    selectedDraftId
                                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                        : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                }`}
                                title="Delete Draft"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {storeInfo && (
                                <button
                                    type="button"
                                    onClick={openStoreModal}
                                    className={`flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm transition-all ${storeLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:border-indigo-300 cursor-pointer'}`}
                                    title={storeLocked ? 'Store locked' : 'Click to change store'}
                                    disabled={storeLocked}
                                >
                                    <div className="bg-indigo-100 p-1 rounded-full">
                                        <Store className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                            {voucherStoreCode}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700 font-sans tracking-tight">
                                            {storeInfo.storeName}
                                        </span>
                                    </div>
                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Select Party <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none"
                                        value={selectedParty}
                                        onChange={(e) => setSelectedParty(e.target.value)}
                                    >
                                        <option value="">Select Party</option>
                                        {parties.map(p => (
                                            <option key={p.id} value={p.code}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Purchase Ledger <span className="text-red-500">*</span></label>
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Search className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <select 
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none"
                                        value={selectedPurchaseLedger}
                                        onChange={(e) => setSelectedPurchaseLedger(e.target.value)}
                                    >
                                        <option value="">Select Ledger</option>
                                        {purchaseLedgers.map(l => (
                                            <option key={l.id} value={l.code}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 md:gap-6 md:ml-auto">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date <span className="text-red-500">*</span></label>
                                    <div className="relative w-32 md:w-40">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input 
                                            ref={invoiceDateRef}
                                            type="date" 
                                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            disabled={storeInfo?.isDsrDisabled !== true}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice No <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={invoiceNo}
                                        className="w-32 md:w-56 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 outline-none shadow-sm cursor-not-allowed"
                                        placeholder="Enter"
                                        readOnly
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Party Invoice#</label>
                                <input
                                    type="text"
                                    value={partyInvoiceNo}
                                    onChange={(e) => setPartyInvoiceNo(e.target.value)}
                                    className="w-48 md:w-64 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    placeholder="Enter"
                                />
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Price List :</label>
                                <select
                                    value={effectivePricingMethod}
                                    onChange={handlePriceListMethodChange}
                                    className="w-40 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                >
                                    <option value="PURCHASE_PRICE">Purchase Price</option>
                                    <option value="SALE_PRICE">Sale Price</option>
                                    <option value="MRP">MRP</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real Input Row with proper sizing */}
                 <div className="px-4 py-2 border-b border-slate-100 bg-white">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div ref={scanSuggestWrapRef} className="col-span-3 relative">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Code / Name</label>
                            <div className="relative">
                                <ScanBarcode className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
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
                                    className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Scan Item"
                                />
                            </div>
                            {showSuggestions && searchResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map((item, idx) => (
                                        <div 
                                            key={item.itemCode}
                                            id={`suggestion-item-${idx}`}
                                            className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 ${
                                                idx === focusedSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSuggestion(item);
                                            }}
                                        >
                                            <div className="font-medium text-slate-800">{item.itemName}</div>
                                            <div className="text-[11px] text-slate-500">{item.itemCode}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div ref={sizeSuggestWrapRef} className="col-span-2 relative">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Size</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
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
                                    className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Select"
                                />
                            </div>
                            {showSizeSuggestions && sizeSearchResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {sizeSearchResults.map((size, idx) => {
                                        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
                                        let priceDisplay = 'N/A';
                                        if (priceInfo) {
                                            priceDisplay = getEffectiveRate(priceInfo) || '0';
                                        }

                                        return (
                                        <div 
                                            key={size.code}
                                            id={`suggestion-size-${idx}`}
                                            className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 flex items-center justify-between group ${
                                                idx === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSize(size);
                                            }}
                                        >
                                            <div className="font-medium text-slate-800">{size.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                Price: {priceDisplay}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Qty</label>
                            <input 
                                ref={quantityRef}
                                type="number"
                                value={scanQuantity}
                                onChange={(e) => setScanQuantity(e.target.value)}
                                onKeyDown={handleQuantityKeyDown}
                                className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate</label>
                            <input 
                                ref={rateRef}
                                type="number"
                                value={scanRate}
                                onChange={(e) => setScanRate(e.target.value)}
                                onKeyDown={handleRateKeyDown}
                                disabled={voucherConfig?.isPriceEditable === false}
                                className={`w-full px-2 py-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${
                                    voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                                }`}
                                placeholder="0.00"
                            />
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
                            <div className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-semibold h-[38px] flex items-center justify-end font-mono">
                                {((parseFloat(scanRate) || 0) * (parseFloat(scanQuantity) || 0)).toFixed(2)}
                            </div>
                        </div>
                        
                        <div className="col-span-1">
                             <button 
                                onClick={handleAddItem}
                                className="w-full h-[38px] flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                 </div>

                {/* Table Section */}
                <div ref={gridScrollContainerRef} className="flex-1 overflow-auto bg-white px-4 pb-2">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-medium">
                                <tr>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Qty</th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Rate</th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {gridRows.map((row, index) => {
                                    const sizeName = activeSizes.find(s => s.code === row.size)?.name || row.size;
                                    return (
                                        <tr key={row.id || index} data-row-index={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-3">
                                                <div className="font-medium text-slate-900">{row.itemName}</div>
                                                <div className="text-[11px] text-slate-500">{row.itemCode}</div>
                                            </td>
                                            <td className="py-2 px-3 text-slate-700">{sizeName}</td>
                                            <td className="py-2 px-3 text-right text-slate-800">{row.quantity}</td>
                                            <td className="py-2 px-3 text-right text-slate-800">₹{row.rate.toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right font-semibold text-indigo-700">₹{row.amount.toFixed(2)}</td>
                                            <td className="py-2 px-2 text-center">
                                                <button
                                                    onClick={() => handleEditRow(row, index)}
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors inline-flex items-center justify-center mr-1"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteRow(index)}
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors inline-flex items-center justify-center"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {gridRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                                            No items added. Scan items to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="bg-white px-4 py-3 border-t border-slate-200">
                    <div className="grid grid-cols-4 gap-6 items-center">
                        <div className="col-span-2 flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    Narration
                                </label>
                                <input
                                    type="text"
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    placeholder="Enter Narration"
                                />
                            </div>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-xs font-semibold text-slate-600">Total Qty</span>
                                <span className="text-base font-bold text-slate-800">
                                    {totalQty}
                                </span>
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between md:justify-end gap-8">
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={handleOpenInvoiceModal}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors shadow-sm ${
                                        displayInvoiceValue > 0
                                            ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                    {renderHotkeyLabel(
                                        displayInvoiceValue > 0
                                            ? `Invoice Value: ₹ ${displayInvoiceValue.toFixed(2)}`
                                            : 'Invoice Value',
                                        'I'
                                    )}
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grand Total</span>
                                <span className="text-xl font-bold text-slate-800">₹{grandTotal.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {isEditMode && (
                                    <button
                                        onClick={handleDeleteVoucher}
                                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-rose-700 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    <span>{renderHotkeyLabel('Delete', 'D')}</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveDraft}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-yellow-600 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                <span>{renderHotkeyLabel('Save Draft', 'F')}</span>
                                </button>
                                
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-indigo-600 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                <span>{renderHotkeyLabel('Submit', 'S')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {showInvoiceValueModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] min-h-[320px] flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Invoice Value Allocation</h3>
                                <button
                                    onClick={() => setShowInvoiceValueModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                                <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span>Invoice Value <span className="text-red-500">*</span>:</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={invoiceValue}
                                            onChange={(e) => setInvoiceValue(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <span>
                                        Total Allocated:&nbsp;
                                        <span className="font-semibold text-slate-900">
                                            ₹{allocatedTotal.toFixed(2)}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div ref={invoiceScanLedgerWrapRef} className="flex-1 relative">
                                        <input
                                            ref={invoiceScanLedgerRef}
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Ledger Name"
                                            value={invoiceScanLedgerInput}
                                            onChange={handleInvoiceScanLedgerChange}
                                            onKeyDown={handleInvoiceScanLedgerKeyDown}
                                            onFocus={() => {
                                                setShowInvoiceLedgerSuggestions(true);
                                                setFocusedInvoiceLedgerIndex((prev) => {
                                                    if (prev >= 0) return prev;
                                                    return filteredInvoiceLedgers.length ? 0 : -1;
                                                });
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    const wrap = invoiceScanLedgerWrapRef.current;
                                                    if (wrap && wrap.contains(document.activeElement)) return;
                                                    setShowInvoiceLedgerSuggestions(false);
                                                    setFocusedInvoiceLedgerIndex(-1);
                                                }, 0);
                                            }}
                                        />
                                        {showInvoiceLedgerSuggestions && filteredInvoiceLedgers.length > 0 && (
                                            <div
                                                ref={invoiceLedgerSuggestionsRef}
                                                className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                                            >
                                                {filteredInvoiceLedgers.map((ledger, index) => (
                                                        <div
                                                            key={ledger.code}
                                                            data-suggestion-index={index}
                                                            className={`px-3 py-1.5 text-sm cursor-pointer flex justify-between items-center ${
                                                                index === focusedInvoiceLedgerIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                            }`}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectInvoiceScanLedger(ledger);
                                                            }}
                                                        >
                                                            <span className="text-slate-800">{ledger.name}</span>
                                                            <span className="text-[11px] text-slate-400 font-mono">
                                                                {ledger.code}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-20">
                                        <input
                                            ref={invoiceScanPercRef}
                                            type="number"
                                            step="0.01"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={invoiceScanPercInput}
                                            placeholder="%"
                                            onChange={handleInvoiceScanPercChange}
                                            onKeyDown={handleInvoiceScanPercKeyDown}
                                        />
                                    </div>
                                    <div className="w-28">
                                        <input
                                            ref={invoiceScanAmountRef}
                                            type="number"
                                            step="0.01"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono"
                                            placeholder="0.00"
                                            value={invoiceScanAmount}
                                            onChange={handleInvoiceScanAmountChange}
                                            onKeyDown={handleInvoiceScanAmountKeyDown}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {invoiceValueRows.map((row, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 flex justify-between items-center">
                                                <span className="text-slate-800">{row.ledgerName}</span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {row.ledgerCode}
                                                </span>
                                            </div>
                                            <div className="w-20 px-3 py-1.5 border border-slate-200 rounded text-sm text-right font-mono bg-slate-50">
                                                {row.perc ? formatPerc(row.perc) : ''}
                                            </div>
                                            <div className="w-28 px-3 py-1.5 border border-slate-200 rounded text-sm text-right font-mono bg-slate-50">
                                                {parseFloat(row.amount || 0).toFixed(2)}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteInvoiceRow(index)}
                                                className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {invoiceValueRows.length === 0 && (
                                        <div className="text-xs text-slate-400 px-1 pt-1">
                                            No ledgers added. Type a ledger and amount, then press Enter.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={handleInvoiceModalDone}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-sm"
                                >
                                    {renderHotkeyLabel('Done', 'D')}
                                </button>
                            </div>
                        </div>
                    </div>
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
                                        setInvoiceDate(iso);
                                        setShowDateEntryModal(false);
                                    }}
                                />
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
                                                        : voucherStoreCode === s.storeCode
                                                            ? 'bg-indigo-50 border border-indigo-100'
                                                            : 'hover:bg-slate-50 border border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={`p-2 rounded-lg ${
                                                        idx === focusedStoreIndex || voucherStoreCode === s.storeCode ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                    }`}>
                                                        <Store className={`w-4 h-4 ${
                                                            idx === focusedStoreIndex || voucherStoreCode === s.storeCode ? 'text-indigo-600' : 'text-slate-400'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-indigo-600">{s.storeCode}</div>
                                                        <div className="text-sm font-bold text-slate-700">{s.storeName}</div>
                                                    </div>
                                                </div>
                                                {voucherStoreCode === s.storeCode && (
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

                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Showing {filteredUserStores.length} of {userStores.length} available stores
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default PurchaseEntry;
