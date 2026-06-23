import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Search, FileText, Pencil, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import DateInputButton from './DateInputButton';
import { formatVoucherQty } from './uomDisplay';
import VoucherPrintButton from './VoucherPrintButton';

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
    const [fromStores, setFromStores] = useState([]);
    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [fromStoreSearchInput, setFromStoreSearchInput] = useState('');
    const [fromStoreSearchResults, setFromStoreSearchResults] = useState([]);
    const [showFromStoreSuggestions, setShowFromStoreSuggestions] = useState(false);
    const [focusedFromStoreSuggestionIndex, setFocusedFromStoreSuggestionIndex] = useState(-1);
    const [toStoreSearchInput, setToStoreSearchInput] = useState('');
    const [toStoreSearchResults, setToStoreSearchResults] = useState([]);
    const [showToStoreSuggestions, setShowToStoreSuggestions] = useState(false);
    const [focusedToStoreSuggestionIndex, setFocusedToStoreSuggestionIndex] = useState(-1);
    const fromStoreSuggestWrapRef = useRef(null);
    const toStoreSuggestWrapRef = useRef(null);
    const fromStoreSuggestionsRef = useRef(null);
    const toStoreSuggestionsRef = useRef(null);
    const [showFromStoreModal, setShowFromStoreModal] = useState(false);
    const [fromStoreSearchQuery, setFromStoreSearchQuery] = useState('');
    const [focusedFromStoreIndex, setFocusedFromStoreIndex] = useState(-1);
    const [showChangeFromStoreModal, setShowChangeFromStoreModal] = useState(false);
    const [changeFromStoreSearchQuery, setChangeFromStoreSearchQuery] = useState('');
    const [focusedChangeFromStoreIndex, setFocusedChangeFromStoreIndex] = useState(-1);
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
    const [isSubmitSaving, setIsSubmitSaving] = useState(false);
    const isSubmitSavingRef = useRef(false);
    const [showTotalAmountModal, setShowTotalAmountModal] = useState(false);
    const [showPriceListModal, setShowPriceListModal] = useState(false);
    const [priceListModalHref, setPriceListModalHref] = useState('');
    const [priceListModalTitle, setPriceListModalTitle] = useState('Price List');
    const [stoLedgerRows, setStoLedgerRows] = useState([]);
    const [availableStoLedgers, setAvailableStoLedgers] = useState([]);
    const [stoLedgerInput, setStoLedgerInput] = useState('');
    const [stoLedgerCode, setStoLedgerCode] = useState('');
    const [stoLedgerPercInput, setStoLedgerPercInput] = useState('');
    const [stoLedgerAmountInput, setStoLedgerAmountInput] = useState('');
    const [showStoLedgerSuggestions, setShowStoLedgerSuggestions] = useState(false);
    const [focusedStoLedgerIndex, setFocusedStoLedgerIndex] = useState(-1);
    const [committedStoLedgerTotal, setCommittedStoLedgerTotal] = useState(null);
    const stoLedgerWrapRef = useRef(null);
    const stoLedgerSuggestionsRef = useRef(null);
    const stoLedgerInputRef = useRef(null);
    const stoLedgerPercRef = useRef(null);
    const stoLedgerAmountRef = useRef(null);
    const stoLedgerAmountTouchedRef = useRef(false);
    const stoLedgerPercTouchedRef = useRef(false);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [gridRows, setGridRows] = useState([]);
    gridHasItemsRef.current = Array.isArray(gridRows) && gridRows.length > 0;
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [showDrafts, setShowDrafts] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const handleSaveRef = useRef(null);
    const handleDeleteRef = useRef(null);
    const hotkeyBlockRef = useRef({ drafts: false, received: false });
    const fromStoreSearchInputRef = useRef(null);
    const changeFromStoreSearchInputRef = useRef(null);

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    const [scanSizeName, setScanSizeName] = useState('');
    
    const [scanRate, setScanRate] = useState(''); // Transfer Rate (Input)
    const [scanQtyInput, setScanQtyInput] = useState('');
    const [scanAmountInput, setScanAmountInput] = useState('');
    const [scanMrp, setScanMrp] = useState('');
    const [scanClosingStock, setScanClosingStock] = useState('');

    const [scanBaseUom, setScanBaseUom] = useState('');
    const [scanAltUom, setScanAltUom] = useState('');
    const [scanFactor, setScanFactor] = useState('');
    const [scanQtyUnitMode, setScanQtyUnitMode] = useState('BASE');
    const [scanRateUnitMode, setScanRateUnitMode] = useState('BASE');
    const [scanQtyConfirmed, setScanQtyConfirmed] = useState(false);
    const defaultBaseRateRef = useRef(0);
    const scanUomInfoRef = useRef({ baseUom: '', options: [] });
    const rateTouchedRef = useRef(false);
    const scanAmountTouchedRef = useRef(false);

    const [showAltEntryModal, setShowAltEntryModal] = useState(false);
    const [altEntryQty, setAltEntryQty] = useState('');
    const [altEntryUnitMode, setAltEntryUnitMode] = useState('ALT');
    const [altEntryRate, setAltEntryRate] = useState('');
    const altEntryQtyRef = useRef(null);
    const altEntryUnitRef = useRef(null);
    const altEntryRateRef = useRef(null);
    
    const [itemPrices, setItemPrices] = useState([]); 
    const itemPricesCacheRef = useRef(new Map());
    const [itemStock, setItemStock] = useState({}); // Store stock for all sizes of selected item
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
    const editingRowIndexRef = useRef(null);
    const showPriceListModalRef = useRef(false);
    // #region debug-point A:focus-reporter
    const reportFocusDebug = useCallback((hypothesisId, location, msg, data = {}) => {
        fetch("http://127.0.0.1:7777/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: "stock-transfer-focus-loop",
                runId: "pre-fix",
                hypothesisId,
                location,
                msg: `[DEBUG] ${msg}`,
                data: {
                    activeTag: document?.activeElement?.tagName || '',
                    activePlaceholder: document?.activeElement?.getAttribute?.('placeholder') || '',
                    ...data
                },
                ts: Date.now()
            })
        }).catch(() => {});
    }, []);
    // #endregion
    // #region debug-point A:alt-qty-rate-reporter
    const reportAltQtyRateDebug = useCallback((hypothesisId, location, msg, data = {}) => {
        fetch("http://127.0.0.1:7778/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: "stock-transfer-alt-qty-rate",
                runId: "pre-fix",
                hypothesisId,
                location,
                msg: `[DEBUG] ${msg}`,
                data: {
                    activeTag: document?.activeElement?.tagName || '',
                    activePlaceholder: document?.activeElement?.getAttribute?.('placeholder') || '',
                    ...data
                },
                ts: Date.now()
            })
        }).catch(() => {});
    }, []);
    // #endregion
    
    // Header Refs
    const fromStoreRef = useRef(null);
    const toStoreRef = useRef(null);
    const dateRef = useRef(null);
    const stoNumberRef = useRef(null);
    const narrationRef = useRef(null);
    const voucherDateInitializedRef = useRef(false);
    const initialToStoreFocusDoneRef = useRef(false);
    const focusToStoreAfterSaveRef = useRef(false);
    const [focusToStoreAfterSaveSeq, setFocusToStoreAfterSaveSeq] = useState(0);

    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    const fetchItemDetailsRequestSeqRef = useRef(0);
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
        editingRowIndexRef.current = editingRowIndex;
    }, [editingRowIndex]);

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
            const idx = editingRowIndexRef.current;
            const rows = Array.isArray(gridRowsRef.current) ? gridRowsRef.current : [];
            if (idx !== null && idx !== undefined && idx >= 0 && idx < rows.length) {
                itemCode = String(rows[idx]?.itemCode || '').trim();
            }
            if (!itemCode && rows.length > 0) {
                itemCode = String(rows[rows.length - 1]?.itemCode || '').trim();
            }
        }

        setPriceListModalTitle(itemCode ? `Price List - ${itemCode}` : 'Price List');
        setPriceListModalHref(itemCode
            ? `/price-management?q=${encodeURIComponent(itemCode)}`
            : '/price-management');
        setShowPriceListModal(true);
    }, []);

    useEffect(() => {
        if (!focusToStoreAfterSaveRef.current) return;
        focusToStoreAfterSaveRef.current = false;
        requestAnimationFrame(() => toStoreRef.current?.focus?.());
        setTimeout(() => toStoreRef.current?.focus?.(), 75);
        setTimeout(() => toStoreRef.current?.focus?.(), 200);
    }, [focusToStoreAfterSaveSeq]);

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);

    const stoLedgerNameByCode = React.useMemo(() => {
        const map = new Map();
        (availableStoLedgers || []).forEach(l => {
            const code = String(l?.code ?? '').trim();
            if (!code) return;
            const name = String(l?.name ?? '').trim();
            map.set(code, name || code);
        });
        return map;
    }, [availableStoLedgers]);

    const totalAllocated = React.useMemo(() => {
        return (stoLedgerRows || []).reduce((sum, row) => sum + (parseFloat(row?.amount) || 0), 0);
    }, [stoLedgerRows]);

    const totalAllocatedWithBase = React.useMemo(() => {
        const base = Number(totalAmount) || 0;
        const led = Number(totalAllocated) || 0;
        return base + led;
    }, [totalAmount, totalAllocated]);

    const isCloseNumber = (a, b, tol = 0.01) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
        return Math.abs(na - nb) <= tol;
    };

    const computePercAmount = (baseAmount, percValue) => {
        const base = Number(baseAmount);
        const perc = Number(percValue);
        if (!Number.isFinite(base) || !Number.isFinite(perc)) return null;
        if (base === 0 || perc === 0) return 0;
        return (base * perc) / 100;
    };

    const normalizeSignedDecimalInput = (value) => {
        const raw = String(value ?? '');
        let cleaned = raw.replace(/[^0-9.\-]/g, '');
        cleaned = cleaned.replace(/(?!^)-/g, '');
        const dotIdx = cleaned.indexOf('.');
        if (dotIdx >= 0) {
            cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, '');
        }
        return cleaned;
    };

    const filteredStoLedgers = React.useMemo(() => {
        const q = String(stoLedgerInput || '').trim().toLowerCase();
        if (!q) return (availableStoLedgers || []).slice(0, 50);
        return (availableStoLedgers || [])
            .filter(l => {
                const name = String(l?.name || '').toLowerCase();
                const code = String(l?.code || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            })
            .slice(0, 50);
    }, [stoLedgerInput, availableStoLedgers]);

    useEffect(() => {
        if (!showTotalAmountModal) return;
        requestAnimationFrame(() => {
            try {
                stoLedgerInputRef.current?.focus?.();
                stoLedgerInputRef.current?.select?.();
            } catch {}
        });
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setShowTotalAmountModal(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showTotalAmountModal]);

    useEffect(() => {
        if (!showTotalAmountModal) return;
        const onKeyDown = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const key = String(e.key || '').toLowerCase();
            if (key !== 'd') return;
            e.preventDefault();
            e.stopPropagation();
            handleTotalAmountModalDone();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showTotalAmountModal]);

    useEffect(() => {
        if (!showTotalAmountModal) return;
        if (!showStoLedgerSuggestions) return;
        const onMouseDown = (e) => {
            const el = stoLedgerWrapRef.current;
            if (el && !el.contains(e.target)) {
                setShowStoLedgerSuggestions(false);
                setFocusedStoLedgerIndex(-1);
            }
        };
        window.addEventListener('mousedown', onMouseDown);
        return () => window.removeEventListener('mousedown', onMouseDown);
    }, [showTotalAmountModal, showStoLedgerSuggestions]);

    useEffect(() => {
        if (!showTotalAmountModal) return;
        if (!showStoLedgerSuggestions) return;
        const idx = focusedStoLedgerIndex;
        if (idx < 0) return;
        const container = stoLedgerSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showTotalAmountModal, showStoLedgerSuggestions, focusedStoLedgerIndex, stoLedgerInput]);

    useEffect(() => {
        const base = Number(totalAmount);
        if (!Number.isFinite(base) || base <= 0) return;
        if (!stoLedgerRows || stoLedgerRows.length === 0) return;
        setStoLedgerRows(prev => prev.map(row => {
            const amount = parseFloat(row?.amount) || 0;
            const perc = base > 0 ? (amount * 100) / base : 0;
            if (!Number.isFinite(perc)) return { ...row, perc: 0 };
            return { ...row, perc: perc };
        }));
    }, [totalAmount]);

    useEffect(() => {
        if (committedStoLedgerTotal === null) return;
        if (isCloseNumber(committedStoLedgerTotal, totalAllocatedWithBase, 0.005)) return;
        setCommittedStoLedgerTotal(totalAllocatedWithBase);
    }, [committedStoLedgerTotal, totalAllocatedWithBase]);

    useEffect(() => {
        if (!stoLedgerCode) return;
        if (stoLedgerAmountTouchedRef.current) return;
        const percNum = parseFloat(stoLedgerPercInput);
        if (isNaN(percNum) || percNum <= 0) return;
        const computed = computePercAmount(totalAmount, percNum);
        if (computed === null) return;
        setStoLedgerAmountInput(computed.toFixed(2));
    }, [totalAmount, stoLedgerCode, stoLedgerPercInput]);

    const resolveStoLedger = (code, name) => {
        if (!code && !name) return null;
        const list = availableStoLedgers || [];
        const byCode = code ? list.find(l => String(l?.code || '').trim() === String(code).trim()) : null;
        if (byCode) return byCode;
        const lowered = String(name || '').trim().toLowerCase();
        if (!lowered) return null;
        return list.find(l => String(l?.name || '').trim().toLowerCase() === lowered) || null;
    };

    const handleSelectStoLedger = (ledger) => {
        if (!ledger) return;
        const code = String(ledger.code || '').trim();
        const name = String(ledger.name || '').trim();
        if (!code) return;
        setStoLedgerCode(code);
        setStoLedgerInput(name || code);

        const perc = Number(ledger?.perc);
        const percValue = Number.isFinite(perc) ? perc : 0;
        setStoLedgerPercInput(percValue ? String(percValue) : '');
        stoLedgerPercTouchedRef.current = false;
        stoLedgerAmountTouchedRef.current = false;
        if (percValue > 0) {
            const computed = computePercAmount(totalAmount, percValue);
            setStoLedgerAmountInput(computed === null ? '' : computed.toFixed(2));
        } else {
            setStoLedgerAmountInput('');
        }

        setShowStoLedgerSuggestions(false);
        setFocusedStoLedgerIndex(-1);
        setTimeout(() => stoLedgerAmountRef.current?.focus?.(), 0);
    };

    const handleStoLedgerKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredStoLedgers.length === 0) return;
            setShowStoLedgerSuggestions(true);
            setFocusedStoLedgerIndex(prev => {
                if (prev === -1) return e.key === 'ArrowDown' ? 0 : filteredStoLedgers.length - 1;
                if (e.key === 'ArrowDown') return (prev + 1) % filteredStoLedgers.length;
                return (prev - 1 + filteredStoLedgers.length) % filteredStoLedgers.length;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredStoLedgers.length > 0) {
                const idx = focusedStoLedgerIndex >= 0 && focusedStoLedgerIndex < filteredStoLedgers.length ? focusedStoLedgerIndex : 0;
                handleSelectStoLedger(filteredStoLedgers[idx]);
                return;
            }
            stoLedgerAmountRef.current?.focus?.();
        }
    };

    const handleStoLedgerPercChange = (e) => {
        stoLedgerPercTouchedRef.current = true;
        setStoLedgerPercInput(normalizeSignedDecimalInput(e.target.value));
    };

    const handleStoLedgerAmountChange = (e) => {
        stoLedgerAmountTouchedRef.current = true;
        setStoLedgerAmountInput(normalizeSignedDecimalInput(e.target.value));
    };

    const handleAddStoLedgerRow = () => {
        const rawAmount = parseFloat(stoLedgerAmountInput);
        if (isNaN(rawAmount) || rawAmount === 0) return;

        let code = String(stoLedgerCode || '').trim();
        let name = String(stoLedgerInput || '').trim();
        if (!code && name) {
            const exact = (availableStoLedgers || []).find(l =>
                (l.name && String(l.name).toLowerCase() === name.toLowerCase()) ||
                (l.code && String(l.code).toLowerCase() === name.toLowerCase())
            );
            const partial = exact || (availableStoLedgers || []).find(l =>
                (l.name && String(l.name).toLowerCase().startsWith(name.toLowerCase())) ||
                (l.code && String(l.code).toLowerCase().startsWith(name.toLowerCase()))
            );
            if (partial) {
                code = String(partial.code || '').trim();
                name = String(partial.name || '').trim();
            }
        }

        if (!code || !name) return;

        const ledger = resolveStoLedger(code, name);
        const type = String(ledger?.type || '').trim();
        const percFromInput = parseFloat(stoLedgerPercInput);
        const percValue = !isNaN(percFromInput) ? percFromInput : 0;
        const computed = percValue > 0 ? computePercAmount(totalAmount, percValue) : null;
        const amountAuto = computed !== null && isCloseNumber(rawAmount, computed, 0.02);
        const finalAmount = computed !== null && amountAuto ? computed : rawAmount;
        const finalPerc = totalAmount > 0 ? (finalAmount * 100) / totalAmount : 0;

        setStoLedgerRows(prev => {
            const existingIndex = prev.findIndex(r => String(r?.ledgerCode || '').trim() === code);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    ledgerCode: code,
                    ledgerName: name,
                    type,
                    perc: finalPerc,
                    amountAuto,
                    amount: finalAmount.toFixed(2)
                };
                return updated;
            }
            return [
                ...prev,
                {
                    ledgerCode: code,
                    ledgerName: name,
                    type,
                    perc: finalPerc,
                    amountAuto,
                    amount: finalAmount.toFixed(2)
                }
            ];
        });

        setStoLedgerInput('');
        setStoLedgerCode('');
        setStoLedgerPercInput('');
        setStoLedgerAmountInput('');
        stoLedgerPercTouchedRef.current = false;
        stoLedgerAmountTouchedRef.current = false;
        setShowStoLedgerSuggestions(false);
        setFocusedStoLedgerIndex(-1);
        stoLedgerInputRef.current?.focus?.();
    };

    const handleStoLedgerAmountKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        handleAddStoLedgerRow();
    };

    const handleTotalAmountModalDone = () => {
        setCommittedStoLedgerTotal(totalAllocatedWithBase);
        setShowTotalAmountModal(false);
    };

    const closingAsOnDate = formatDateForDisplay(stoDate);

    // --- Helpers ---
    const getUomLabel = useCallback((codeRaw) => {
        const code = String(codeRaw || '').trim();
        if (!code) return '';
        const match = (Array.isArray(uoms) ? uoms : []).find(u => String(u?.code || '').trim().toLowerCase() === code.toLowerCase());
        return String(match?.name || code).trim() || code;
    }, [uoms]);

    const isClubbingEnabled = useCallback((cfg) => {
        const raw =
            cfg?.isClubbingAllowed ??
            cfg?.IsClubbingAllowed ??
            cfg?.Is_ClubbingAllowed ??
            cfg?.is_clubbing_allowed;

        if (raw === undefined || raw === null || raw === '') return true;
        if (raw === 0 || raw === '0' || raw === false) return false;
        const s = String(raw).trim().toLowerCase();
        if (s === '0' || s === 'false' || s === 'no' || s === 'n') return false;
        if (s === '1' || s === 'true' || s === 'yes' || s === 'y') return true;
        const n = Number(raw);
        if (Number.isFinite(n)) return n !== 0;
        return true;
    }, []);

    const showMessage = (message, type = 'info') => {
        const msg = String(message || '');
        const msgLower = msg.trim().toLowerCase();
        const shouldRefocusQty =
            msgLower.includes('unknown unit code in qty') ||
            msgLower.includes('please enter valid qty');
        // #region debug-point D:warning-open
        reportAltQtyRateDebug('D', 'StockTransferOut.js:812', 'showMessage open', {
            message: msg,
            type,
            shouldRefocusQty,
            scanQtyInput: String(scanQtyInput || ''),
            scanQtyUnitMode,
            scanRate: String(scanRate || ''),
            scanRateUnitMode
        });
        // #endregion

        return Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: msg,
            icon: type,
            confirmButtonText: 'OK',
            timer: type === 'error' ? 2500 : 1800,
            timerProgressBar: true,
            allowEnterKey: true,
            focusConfirm: true,
            returnFocus: false
        }).then(() => {
            // #region debug-point D:warning-close
            reportAltQtyRateDebug('D', 'StockTransferOut.js:823', 'showMessage close', {
                message: msg,
                type,
                shouldRefocusQty,
                scanQtyInput: String(scanQtyInput || ''),
                scanQtyUnitMode,
                scanRate: String(scanRate || ''),
                scanRateUnitMode
            });
            // #endregion
            if (!shouldRefocusQty) return;
            setTimeout(() => {
                try {
                    quantityRef.current?.focus?.();
                    quantityRef.current?.select?.();
                } catch {}
            }, 0);
        });
    };

    const handlePrintComingSoon = useCallback(() => {
        return Swal.fire({
            title: 'Info',
            text: 'Comming Soon...',
            icon: 'info',
            confirmButtonText: 'OK',
            timer: 1800,
            timerProgressBar: true,
            allowEnterKey: true,
            focusConfirm: true,
            returnFocus: false
        });
    }, []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Enter') return;
            if (e.defaultPrevented) return;
            if (!Swal.isVisible?.()) return;
            e.preventDefault();
            e.stopPropagation();
            try {
                Swal.clickConfirm();
            } catch {}
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, []);

    const getLastVoucherDateKeyForStore = useCallback((storeCode) => {
        const sc = String(storeCode || '').trim();
        return sc ? `RG_lastVoucherDate:sto:${sc}` : lastVoucherDateGlobalKey;
    }, []);

    // --- Effects ---
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchStores();
        fetchActiveSizes();
        fetchUoms();
        fetchVoucherConfig();
        fetchStoLedgers();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const stoNumberParam = params.get('stoNumber');
        const mode = params.get('mode');
        if (!stoNumberParam || (mode !== 'edit' && mode !== 'duplicate')) {
            setIsEditMode(false);
            setIsReceivedSto(false);
            setSelectedDraft(null);
            return;
        }
        if (mode === 'edit') {
            setIsEditMode(true);
            handleDraftSelect({ stoNumber: stoNumberParam });
            return;
        }
        setIsEditMode(false);
        loadStoForDuplicate(stoNumberParam);
    }, [location.search]);

    useEffect(() => {
        if (initialToStoreFocusDoneRef.current) return;
        if (isReceivedSto) return;
        if (showFromStoreModal || showDrafts || showDateEntryModal || showTotalAmountModal || showAltEntryModal) return;
        initialToStoreFocusDoneRef.current = true;
        requestAnimationFrame(() => toStoreRef.current?.focus?.());
    }, [isReceivedSto, showFromStoreModal, showDrafts, showDateEntryModal, showTotalAmountModal, showAltEntryModal]);

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

    const fetchStoLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers', token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
            const list = Array.isArray(response.data) ? response.data : [];
            const filtered = list.filter(l => {
                const status = l?.status;
                const isActive = status == null || status === 1 || status === true;
                return isActive;
            });
            setAvailableStoLedgers(filtered);
        } catch (error) {
            console.error("Error fetching ledgers for STO", error);
            setAvailableStoLedgers([]);
        }
    };

    const fetchStores = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/stores/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && response.data.success && response.data.stores) {
                const activeList = Array.isArray(response.data.stores) ? response.data.stores : [];
                setStores(activeList);
                setFromStores(activeList);
                
                // Set default From Store if user has one
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // If user is restricted to a store, select it. 
                // Since we don't have easy access to user's assigned store code here without another call, 
                // we can rely on user selection or fetch user's store like in PurchaseEntry.
                // For now, I'll fetch user's store info to pre-select.
                fetchUserStore(user.userName, activeList);
            }
        } catch (error) {
            console.error("Error fetching stores", error);
        }
    };

    const fetchUserStore = async (userName, activeStoresArg) => {
        if (!userName) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/stores/by-user/${encodeURIComponent(userName)}`, token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);

            const mapped = (response.data?.success && Array.isArray(response.data.stores)) ? response.data.stores : [];
            const fallbackActive = Array.isArray(activeStoresArg) ? activeStoresArg : (Array.isArray(stores) ? stores : []);
            const allowedForFrom = mapped.length > 0 ? mapped : fallbackActive;
            setFromStores(allowedForFrom);

            if (mapped.length > 0) {
                const params = new URLSearchParams(location.search || '');
                const mode = params.get('mode');
                const storeInfo = mapped[0];
                const userStore = storeInfo?.storeCode;
                if (mode !== 'edit' && mode !== 'duplicate') {
                    setFromStore(userStore);
                    setFromStoreSearchInput(getStoreDisplay(storeInfo));
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
            const fallbackActive = Array.isArray(activeStoresArg) ? activeStoresArg : (Array.isArray(stores) ? stores : []);
            if (fallbackActive.length > 0) setFromStores(fallbackActive);
        }
    };

    const getStoreDisplay = useCallback((store) => {
        if (!store) return '';
        const name = String(store?.storeName || '').trim();
        const code = String(store?.storeCode || '').trim();
        if (!name && !code) return '';
        if (!name) return code;
        if (!code) return name;
        return `${name} (${code})`;
    }, []);

    const filterStoresForSearch = useCallback((value, excludeCode, listOverride) => {
        const v = String(value || '').trim().toLowerCase();
        const all = Array.isArray(listOverride) ? listOverride : (Array.isArray(stores) ? stores : []);
        const filtered = all.filter(s => {
            const code = String(s?.storeCode || '').trim();
            if (excludeCode && code === excludeCode) return false;
            const name = String(s?.storeName || '').toLowerCase();
            const c = code.toLowerCase();
            if (!v) return true;
            return name.includes(v) || c.includes(v);
        });
        return filtered.slice(0, 50);
    }, [stores]);

    const resolveStoreCodeFromInput = useCallback((inputValue, listOverride) => {
        const raw = String(inputValue || '').trim();
        if (!raw) return '';
        const m = raw.match(/\(([^)]+)\)\s*$/);
        const candidate = String(m ? (m[1] || '') : raw).trim();
        if (!candidate) return '';

        const all = Array.isArray(listOverride) ? listOverride : (Array.isArray(stores) ? stores : []);
        const byCode = all.find(s => String(s?.storeCode || '').trim().toLowerCase() === candidate.toLowerCase());
        if (byCode?.storeCode) return String(byCode.storeCode).trim();

        const normalizedRaw = raw.toLowerCase();
        const byDisplay = all.find(s => getStoreDisplay(s).toLowerCase() === normalizedRaw);
        if (byDisplay?.storeCode) return String(byDisplay.storeCode).trim();

        const byName = all.find(s => String(s?.storeName || '').trim().toLowerCase() === normalizedRaw);
        if (byName?.storeCode) return String(byName.storeCode).trim();

        return '';
    }, [getStoreDisplay, stores]);

    const applyFromStoreSelection = useCallback((store) => {
        const val = String(store?.storeCode || '').trim();
        if (!val) return;
        setFromStore(val);
        setFromStoreSearchInput(getStoreDisplay(store));
        setShowFromStoreSuggestions(false);
        setFocusedFromStoreSuggestionIndex(-1);
        const preserveExistingVoucherNumber = Boolean(selectedDraft) || Boolean(isEditMode);
        if (val && !preserveExistingVoucherNumber) fetchNextStoNumber(val);
        if (val === toStore) {
            setToStore('');
            setToStoreSearchInput('');
            setShowToStoreSuggestions(false);
            setFocusedToStoreSuggestionIndex(-1);
        }
        setTimeout(() => toStoreRef.current?.focus?.(), 0);
    }, [getStoreDisplay, isEditMode, selectedDraft, toStore]);

    const applyToStoreSelection = useCallback((store) => {
        const val = String(store?.storeCode || '').trim();
        if (!val) return;
        setToStore(val);
        setToStoreSearchInput(getStoreDisplay(store));
        setShowToStoreSuggestions(false);
        setFocusedToStoreSuggestionIndex(-1);
        setTimeout(() => dateRef.current?.focus?.(), 0);
    }, [getStoreDisplay]);

    const selectedFromStoreInfo = React.useMemo(() => {
        const code = String(fromStore || '').trim();
        if (!code) return null;
        const allowed = Array.isArray(fromStores) ? fromStores : [];
        const all = Array.isArray(stores) ? stores : [];
        return (
            allowed.find(s => String(s?.storeCode || '').trim() === code) ||
            all.find(s => String(s?.storeCode || '').trim() === code) ||
            null
        );
    }, [fromStore, fromStores, stores]);

    const applyFromStoreSelectionInteractive = useCallback(async (store) => {
        const code = String(store?.storeCode || '').trim();
        if (!code) return;
        if (String(fromStore || '').trim() === code) {
            setShowChangeFromStoreModal(false);
            return;
        }
        if (String(toStore || '').trim() === code) {
            showMessage("From and To locations cannot be the same", 'warning');
            return;
        }
        applyFromStoreSelection(store);
        setShowChangeFromStoreModal(false);
        setTimeout(() => toStoreRef.current?.focus?.(), 0);
    }, [applyFromStoreSelection, fromStore, toStore]);

    useEffect(() => {
        const onDocMouseDown = (e) => {
            const target = e.target;
            if (fromStoreSuggestWrapRef.current && !fromStoreSuggestWrapRef.current.contains(target)) {
                setShowFromStoreSuggestions(false);
                setFocusedFromStoreSuggestionIndex(-1);
            }
            if (toStoreSuggestWrapRef.current && !toStoreSuggestWrapRef.current.contains(target)) {
                setShowToStoreSuggestions(false);
                setFocusedToStoreSuggestionIndex(-1);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    useEffect(() => {
        if (!showFromStoreSuggestions) return;
        const idx = focusedFromStoreSuggestionIndex;
        if (idx < 0) return;
        const container = fromStoreSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showFromStoreSuggestions, focusedFromStoreSuggestionIndex]);

    useEffect(() => {
        if (!showToStoreSuggestions) return;
        const idx = focusedToStoreSuggestionIndex;
        if (idx < 0) return;
        const container = toStoreSuggestionsRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-suggestion-index="${idx}"]`);
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView({ block: 'nearest' });
        } catch {}
    }, [showToStoreSuggestions, focusedToStoreSuggestionIndex]);

    useEffect(() => {
        if (!fromStore) return;
        const st = (Array.isArray(stores) ? stores : []).find(s => String(s?.storeCode || '').trim() === String(fromStore || '').trim());
        if (!st) return;
        const display = getStoreDisplay(st);
        if (display && fromStoreSearchInput !== display) setFromStoreSearchInput(display);
    }, [fromStore, stores, getStoreDisplay, fromStoreSearchInput]);

    useEffect(() => {
        if (!toStore) return;
        const st = (Array.isArray(stores) ? stores : []).find(s => String(s?.storeCode || '').trim() === String(toStore || '').trim());
        if (!st) return;
        const display = getStoreDisplay(st);
        if (display && toStoreSearchInput !== display) setToStoreSearchInput(display);
    }, [toStore, stores, getStoreDisplay, toStoreSearchInput]);

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
            if (e.ctrlKey || e.metaKey) return;
            const isAltOnly = e.altKey && !e.shiftKey;
            const isShiftOnly = e.shiftKey && !e.altKey;
            if (!isAltOnly && !isShiftOnly) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (showDateEntryModal || showFromStoreModal || showDrafts) return;
            if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
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

    const filteredFromStores = React.useMemo(() => {
        const list = Array.isArray(stores) ? stores : [];
        const q = String(fromStoreSearchQuery || '').trim().toLowerCase();
        if (!q) return list;
        return list.filter(s =>
            String(s?.storeCode || '').toLowerCase().includes(q) ||
            String(s?.storeName || '').toLowerCase().includes(q)
        );
    }, [stores, fromStoreSearchQuery]);

    const filteredChangeFromStores = React.useMemo(() => {
        const list = Array.isArray(fromStores) ? fromStores : [];
        const q = String(changeFromStoreSearchQuery || '').trim().toLowerCase();
        if (!q) return list;
        return list.filter(s =>
            String(s?.storeCode || '').toLowerCase().includes(q) ||
            String(s?.storeName || '').toLowerCase().includes(q)
        );
    }, [fromStores, changeFromStoreSearchQuery]);

    const openChangeFromStoreModal = useCallback(() => {
        if (isReceivedSto || currentUser?.role === 'STORE USER') return;
        const all = Array.isArray(fromStores) ? fromStores : [];
        if (all.length === 0) return;
        setChangeFromStoreSearchQuery('');
        const idx = fromStore ? all.findIndex(s => String(s?.storeCode || '') === String(fromStore || '')) : -1;
        setFocusedChangeFromStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowChangeFromStoreModal(true);
        setTimeout(() => changeFromStoreSearchInputRef.current?.focus?.(), 100);
    }, [currentUser?.role, fromStore, fromStores, isReceivedSto]);

    const openToStoreModal = useCallback(() => {
        if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
        const all = Array.isArray(stores) ? stores : [];
        if (all.length === 0) return;
        setFromStoreSearchQuery('');
        const idx = toStore ? all.findIndex(s => String(s?.storeCode || '') === String(toStore || '')) : -1;
        setFocusedFromStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowFromStoreModal(true);
        setTimeout(() => fromStoreSearchInputRef.current?.focus(), 100);
    }, [toStore, stores]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (hotkeyBlockRef.current.drafts || hotkeyBlockRef.current.received) return;
            e.preventDefault();
            e.stopPropagation();
            openToStoreModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [openToStoreModal]);

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
                if (val && val === fromStore) {
                    showMessage("From Location and To Location cannot be same", 'warning');
                    return;
                }
                setToStore(val);
                setShowFromStoreModal(false);
                setTimeout(() => dateRef.current?.focus?.(), 0);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowFromStoreModal(false);
        }
    };

    const handleChangeFromStoreSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const max = filteredChangeFromStores.length - 1;
            setFocusedChangeFromStoreIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const max = filteredChangeFromStores.length - 1;
            setFocusedChangeFromStoreIndex(prev => Math.max(0, Math.min(max, prev < 0 ? 0 : prev - 1)));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedChangeFromStoreIndex >= 0 && filteredChangeFromStores[focusedChangeFromStoreIndex]) {
                applyFromStoreSelectionInteractive(filteredChangeFromStores[focusedChangeFromStoreIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowChangeFromStoreModal(false);
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

    const fetchItemDetails = async (input, options = {}) => {
        const raw = String(input || '').trim();
        if (!raw) return false;
        const normalize = (v) => String(v || '').trim();
        const preferredSizeCode = normalize(options?.preferredSizeCode);
        const preserveQuantity = options?.preserveQuantity === true;
        const openSizeChooser = options?.openSizeChooser === true;
        const focusScanItem = options?.focusScanItem === true;
        const preservedQtyInput = preserveQuantity ? String(scanQtyInput || '') : '';
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

            if (!isLatestRequest()) return false;

            const hasItemRecord = Boolean(
                (Array.isArray(prices) && prices.length > 0) ||
                (resolvedItemName && String(resolvedItemName).trim()) ||
                (resolvedItemCode && resolvedItemCode.trim() && resolvedItemCode.trim().toLowerCase() !== raw.toLowerCase())
            );
            if (!hasItemRecord) {
                showMessage('Item not found', 'warning');
                setScanItemCode('');
                setScanItemName('');
                setScanSearchInput(raw);
                setShowSuggestions(false);
                requestAnimationFrame(() => {
                    try {
                        scanInputRef.current?.focus?.();
                        scanInputRef.current?.select?.();
                    } catch {}
                });
                setItemStockStatus(fromStore ? 'idle' : 'idle');
                return false;
            }

            setItemPrices(Array.isArray(prices) ? prices : []);

            setScanItemName(resolvedItemName || '');
            setScanItemCode(resolvedItemCode);
            setScanSearchInput(resolvedItemName || resolvedItemCode);
            setScanMrp(resolvedMrp || '');
            setShowSuggestions(false);
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;
            setScanClosingStock('');

            const stockResponse = fromStore && resolvedItemCode
                ? await axios.get('/api/inventory/stock/item', {
                    params: { storeCode: fromStore, itemCode: resolvedItemCode, tranDate: stoDate },
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null)
                : null;

            if (!isLatestRequest()) return false;

            let nextStock = {};
            let nextStockStatus = fromStore ? 'error' : 'idle';
            if (stockResponse && stockResponse.data?.success) {
                nextStock = stockResponse.data.stock || {};
                nextStockStatus = 'loaded';
            }

            setItemStock(nextStock);
            itemStockRef.current = nextStock;
            setItemStockStatus(nextStockStatus);

            const availableSizes = getAvailableSizesForItem(prices, nextStock, nextStockStatus);
            let selectedSize = null;
            if (preferredSizeCode) {
                selectedSize = availableSizes.find(size =>
                    normalize(size?.code).toLowerCase() === preferredSizeCode.toLowerCase()
                ) || null;
            }
            if (!selectedSize && availableSizes.length > 0) {
                selectedSize = availableSizes[0];
            }

            if (selectedSize) {
                applyScanSizeSelection(selectedSize, prices, {
                    focusQuantity: false,
                    closeSuggestions: !openSizeChooser,
                    itemCodeOverride: resolvedItemCode,
                    preserveQuantity
                });
                if (preserveQuantity) {
                    setScanQtyInput(preservedQtyInput);
                    setScanQtyConfirmed(false);
                }
                // #region debug-point C:fetch-item-selected-size
                reportFocusDebug('C', 'StockTransferOut.js:1700', 'fetchItemDetails selected size', {
                    raw,
                    resolvedItemCode,
                    selectedSizeCode: selectedSize?.code || '',
                    openSizeChooser,
                    focusScanItem,
                    preserveQuantity,
                    requestSeq
                });
                // #endregion
                if (openSizeChooser) {
                    sizeAutoShowAllRef.current = true;
                    setSizeSearchResults(availableSizes);
                    setFocusedSizeSuggestionIndex(
                        Math.max(0, availableSizes.findIndex(size =>
                            normalize(size?.code).toLowerCase() === normalize(selectedSize?.code).toLowerCase()
                        ))
                    );
                    setShowSizeSuggestions(true);
                    requestAnimationFrame(() => {
                        if (!isLatestRequest()) return;
                        if (focusScanItem) {
                            scanInputRef.current?.focus?.();
                            scanInputRef.current?.select?.();
                            return;
                        }
                        sizeInputRef.current?.focus?.();
                    });
                } else if (!focusScanItem) {
                    sizeAutoShowAllRef.current = true;
                    setSizeSearchResults(availableSizes);
                    setFocusedSizeSuggestionIndex(
                        Math.max(0, availableSizes.findIndex(size =>
                            normalize(size?.code).toLowerCase() === normalize(selectedSize?.code).toLowerCase()
                        ))
                    );
                    setShowSizeSuggestions(true);
                    requestAnimationFrame(() => {
                        if (!isLatestRequest()) return;
                        sizeInputRef.current?.focus?.();
                    });
                } else if (focusScanItem) {
                    requestAnimationFrame(() => {
                        if (!isLatestRequest()) return;
                        scanInputRef.current?.focus?.();
                        scanInputRef.current?.select?.();
                    });
                }
            } else {
                setScanSize('');
                setScanSizeName('');
                setSizeSearchInput('');
                setScanRate('');
                rateTouchedRef.current = false;
                defaultBaseRateRef.current = 0;
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                scanUomInfoRef.current = { baseUom: '', options: [] };
                setScanQtyUnitMode('BASE');
                setScanRateUnitMode('BASE');
                if (preserveQuantity) {
                    setScanQtyInput(preservedQtyInput);
                } else {
                    setScanQtyInput('');
                }
                setScanQtyConfirmed(false);
                sizeAutoShowAllRef.current = true;
                requestAnimationFrame(() => {
                    if (!isLatestRequest()) return;
                    const sizeEl = sizeInputRef.current;
                    if (!sizeEl) return;
                    if (focusScanItem) {
                        scanInputRef.current?.focus?.();
                        scanInputRef.current?.select?.();
                        return;
                    }
                    sizeEl.focus();
                });
            }
            return true;
        } catch (error) {
            if (!isLatestRequest()) return false;
            console.error("Error fetching item details", error);
            setItemStockStatus(fromStore ? 'error' : 'idle');
            showMessage('Item not found', 'warning');
            requestAnimationFrame(() => {
                try {
                    scanInputRef.current?.focus?.();
                    scanInputRef.current?.select?.();
                } catch {}
            });
            return false;
        }
    };

    const getScanFactorNumber = useCallback(() => {
        const direct = parseFloat(scanFactor);
        if (Number.isFinite(direct) && direct > 0) return direct;

        const selectedAlt = String(scanAltUom || '').trim().toLowerCase();
        if (!selectedAlt) return 0;

        const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
        const match = options.find(o => String(o?.altUom || '').trim().toLowerCase() === selectedAlt);
        const f = parseFloat(match?.factor);
        return Number.isFinite(f) && f > 0 ? f : 0;
    }, [scanAltUom, scanFactor]);

    const normalizeUnitToken = useCallback((val) => {
        return String(val || '').trim().toLowerCase();
    }, []);

    const getUnitTokenFromUomCode = useCallback((uomCode) => {
        const code = String(uomCode || '').trim();
        return code ? code[0].toLowerCase() : '';
    }, []);

    const resolveUnitToken = useCallback((tokenRaw) => {
        const token = normalizeUnitToken(tokenRaw);
        if (!token) {
            return {
                ok: true,
                unitMode: 'BASE',
                resolvedUom: String(scanUomInfoRef.current?.baseUom || scanBaseUom || '').trim(),
                factor: '',
                token: ''
            };
        }

        const baseCode = String(scanUomInfoRef.current?.baseUom || scanBaseUom || '').trim();
        const baseLower = normalizeUnitToken(baseCode);

        const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];

        const score = (codeLower, codeRaw) => {
            if (!codeLower) return 0;
            if (token === codeLower) return 3;
            if (token === getUnitTokenFromUomCode(codeRaw)) return 2;
            if (codeLower.startsWith(token)) return 1;
            return 0;
        };

        const baseScore = score(baseLower, baseCode);

        let bestAlt = null;
        let bestAltScore = 0;
        for (const opt of options) {
            const altCode = String(opt?.altUom || '').trim();
            const altLower = normalizeUnitToken(altCode);
            const s = score(altLower, altCode);
            if (s > bestAltScore) {
                bestAltScore = s;
                bestAlt = opt;
            }
        }

        if (baseScore === 0 && bestAltScore === 0) {
            return { ok: false, unitMode: 'BASE', resolvedUom: baseCode, token };
        }

        if (bestAltScore > baseScore) {
            const altUom = String(bestAlt?.altUom || '').trim();
            const factor = bestAlt?.factor !== undefined && bestAlt?.factor !== null ? String(bestAlt.factor) : '';
            return { ok: true, unitMode: 'ALT', resolvedUom: altUom, factor, token };
        }

        return { ok: true, unitMode: 'BASE', resolvedUom: baseCode, factor: '', token };
    }, [getUnitTokenFromUomCode, normalizeUnitToken, scanAltUom, scanBaseUom]);

    const parseQtyWithUnit = useCallback((rawValue) => {
        const raw = String(rawValue || '').trim();
        if (!raw) {
            return { ok: true, qtyNum: 0, unitToken: '', hasUnit: false };
        }

        const m = raw.match(/^(\d+(?:\.\d*)?|\.\d+)\s*([a-zA-Z]+)?$/);
        if (!m) {
            return { ok: false, qtyNum: 0, unitToken: '', hasUnit: false };
        }

        const qtyNum = parseFloat(m[1]);
        const unitToken = m[2] ? String(m[2]) : '';

        return {
            ok: Number.isFinite(qtyNum),
            qtyNum: Number.isFinite(qtyNum) ? qtyNum : 0,
            unitToken,
            hasUnit: Boolean(unitToken)
        };
    }, []);

    const getScanBaseQtyFromScan = useCallback(() => {
        const parsed = parseQtyWithUnit(scanQtyInput);
        const q = parsed?.qtyNum ?? 0;
        if (!Number.isFinite(q) || q <= 0) return 0;
        if (scanQtyUnitMode !== 'ALT') return q;
        const f = getScanFactorNumber();
        if (!f) return 0;
        return q * f;
    }, [getScanFactorNumber, parseQtyWithUnit, scanQtyInput, scanQtyUnitMode]);

    const getScanEnteredAmount = useCallback(() => {
        const rawAmount = String(scanAmountInput || '').trim();
        if (rawAmount) {
            const a = parseFloat(rawAmount);
            if (Number.isFinite(a)) return a;
            return 0;
        }
        const parsedQty = parseQtyWithUnit(scanQtyInput);
        const qtyNum = parsedQty?.qtyNum ?? 0;
        const rateNum = parseFloat(scanRate);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
        if (!Number.isFinite(rateNum) || rateNum <= 0) return 0;
        return qtyNum * rateNum;
    }, [parseQtyWithUnit, scanAmountInput, scanQtyInput, scanRate]);

    const getBaseRateFromDisplayed = useCallback((rateNum, unitMode) => {
        const r = Number(rateNum);
        if (!Number.isFinite(r) || r <= 0) return 0;
        if (unitMode !== 'ALT') return r;
        const f = getScanFactorNumber();
        if (!f) return 0;
        return r / f;
    }, [getScanFactorNumber]);

    const getDisplayedRateFromBase = useCallback((baseRateNum, unitMode) => {
        const r = Number(baseRateNum);
        if (!Number.isFinite(r) || r <= 0) return 0;
        if (unitMode !== 'ALT') return r;
        const f = getScanFactorNumber();
        if (!f) return 0;
        return r * f;
    }, [getScanFactorNumber]);

    const getEffectiveRate = useCallback((priceInfo) => {
        const pricingMethod = String(voucherConfig?.pricingMethod || 'PURCHASE_PRICE').trim().toUpperCase();
        if (pricingMethod === 'MRP') return priceInfo?.mrp || '';
        if (pricingMethod === 'SALE_PRICE') return priceInfo?.salePrice || '';
        return priceInfo?.purchasePrice || '';
    }, [voucherConfig?.pricingMethod]);

    const confirmQtyAndSyncRateUnit = useCallback(() => {
        const parsedQty = parseQtyWithUnit(scanQtyInput);
        if (!parsedQty?.ok) {
            showMessage('Please enter valid Qty', 'warning');
            return false;
        }

        const qtyNum = parsedQty.qtyNum;
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
            showMessage('Please enter valid Qty', 'warning');
            return false;
        }

        const resolved = resolveUnitToken(parsedQty.unitToken);
        if (!resolved?.ok) {
            showMessage('Unknown unit code in Qty', 'warning');
            return false;
        }

        const nextUnitMode = resolved.unitMode === 'ALT' ? 'ALT' : 'BASE';
        const nextAltUom = nextUnitMode === 'ALT' ? String(resolved.resolvedUom || '').trim() : '';
        const nextFactorStr = nextUnitMode === 'ALT' ? String(resolved.factor || '').trim() : '';
        const nextFactorNumCandidate = nextUnitMode === 'ALT' ? parseFloat(nextFactorStr) : 0;
        const nextFactorNum = nextUnitMode === 'ALT'
            ? (Number.isFinite(nextFactorNumCandidate) && nextFactorNumCandidate > 0 ? nextFactorNumCandidate : 0)
            : 0;

        if (nextUnitMode === 'ALT') {
            if (nextAltUom) setScanAltUom(nextAltUom);
            if (nextFactorStr) setScanFactor(nextFactorStr);
        } else {
            setScanAltUom('');
            setScanFactor('');
        }
        const prevUnitMode = scanRateUnitMode || scanQtyUnitMode || 'BASE';

        const currentRateNum = parseFloat(scanRate);
        const baseRateFromCurrent = getBaseRateFromDisplayed(currentRateNum, prevUnitMode);
        const baseRateFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
        const baseRate = baseRateFromCurrent || baseRateFallback;

        const pricingMethod = String(voucherConfig?.pricingMethod || 'PURCHASE_PRICE').trim().toUpperCase();
        const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
        const selectedOpt = nextAltUom
            ? options.find(o => String(o?.altUom || '').trim().toLowerCase() === nextAltUom.toLowerCase())
            : null;
        const optPriceRaw =
            pricingMethod === 'MRP' ? selectedOpt?.mrp :
            pricingMethod === 'SALE_PRICE' ? selectedOpt?.salePrice :
            selectedOpt?.purchasePrice;
        const optPriceNum = parseFloat(optPriceRaw);
        const nextDisplayedRate =
            nextUnitMode === 'ALT'
                ? (Number.isFinite(optPriceNum) && optPriceNum > 0
                    ? optPriceNum
                    : (Number.isFinite(baseRate) && baseRate > 0 && nextFactorNum > 0 ? baseRate * nextFactorNum : 0))
                : (Number.isFinite(baseRate) && baseRate > 0 ? baseRate : 0);

        if ((!rateTouchedRef.current || !String(scanRate || '').trim()) && nextDisplayedRate > 0) {
            setScanRate(String(Number(nextDisplayedRate).toFixed(2)));
            rateTouchedRef.current = false;
        }

        // #region debug-point B:qty-sync-success
        reportAltQtyRateDebug('B', 'StockTransferOut.js:2016', 'confirmQtyAndSyncRateUnit success', {
            scanQtyInput: String(scanQtyInput || ''),
            parsedQty: parsedQty.qtyNum,
            parsedUnitToken: String(parsedQty.unitToken || ''),
            nextUnitMode,
            nextAltUom,
            nextFactorStr,
            prevUnitMode,
            scanRate: String(scanRate || ''),
            currentRateNum,
            baseRateFromCurrent,
            baseRateFallback,
            baseRate,
            optPriceRaw: optPriceRaw ?? '',
            nextDisplayedRate
        });
        // #endregion
        setScanQtyUnitMode(nextUnitMode);
        setScanRateUnitMode(nextUnitMode);
        setScanQtyConfirmed(true);
        return true;
    }, [
        getBaseRateFromDisplayed,
        parseQtyWithUnit,
        resolveUnitToken,
        scanQtyInput,
        scanQtyUnitMode,
        scanRate,
        scanRateUnitMode,
        showMessage,
        voucherConfig?.pricingMethod
    ]);

    const fetchUomMapForScan = useCallback(async (itemCodeRaw, sizeCodeRaw) => {
        const itemCode = String(itemCodeRaw || '').trim();
        const sizeCode = String(sizeCodeRaw || '').trim();
        if (!itemCode || !sizeCode) return null;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/item-uom-map', {
                params: { itemCode, sizeCode },
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data?.success) return null;
            const rows =
                Array.isArray(response.data.rows) ? response.data.rows :
                Array.isArray(response.data.data) ? response.data.data :
                Array.isArray(response.data.list) ? response.data.list : [];
            if (!rows.length) return null;

            const first = rows[0] || {};
            const baseUom = String(first.baseUom || scanUomInfoRef.current?.baseUom || scanBaseUom || '').trim();
            const options = rows.map(r => ({
                altUom: String(r?.altUom || '').trim(),
                factor: r?.factor !== undefined && r?.factor !== null ? String(r.factor) : '',
                purchasePrice: r?.purchasePrice,
                salePrice: r?.salePrice,
                mrp: r?.mrp
            })).filter(o => o.altUom && (parseFloat(o.factor) > 0));

            const next = { baseUom, options };
            scanUomInfoRef.current = next;
            if (next.baseUom) setScanBaseUom(next.baseUom);

            if (!rateTouchedRef.current) {
                const currentText = String(scanRate || '').trim();
                const baseExisting = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                if ((!currentText || parseFloat(currentText) <= 0) && !(baseExisting > 0)) {
                    const pricingMethod = String(voucherConfig?.pricingMethod || 'PURCHASE_PRICE').trim().toUpperCase();
                    let derivedBase = 0;
                    for (const opt of options) {
                        const factorNum = parseFloat(opt?.factor);
                        if (!(Number.isFinite(factorNum) && factorNum > 0)) continue;
                        const pRaw =
                            pricingMethod === 'MRP' ? opt?.mrp :
                            pricingMethod === 'SALE_PRICE' ? opt?.salePrice :
                            opt?.purchasePrice;
                        const pNum = parseFloat(pRaw);
                        if (!(Number.isFinite(pNum) && pNum > 0)) continue;
                        derivedBase = pNum / factorNum;
                        break;
                    }
                    if (Number.isFinite(derivedBase) && derivedBase > 0) {
                        defaultBaseRateRef.current = derivedBase;
                        setScanRate(String(Number(derivedBase).toFixed(2)));
                        rateTouchedRef.current = false;
                        setScanRateUnitMode('BASE');
                    }
                }
            }

            return next;
        } catch {
            return null;
        }
    }, [scanBaseUom, scanRate, voucherConfig?.pricingMethod]);

    useEffect(() => {
        if (!showAltEntryModal) return;
        const t = setTimeout(() => altEntryQtyRef.current?.focus?.(), 0);
        return () => clearTimeout(t);
    }, [showAltEntryModal]);

    useEffect(() => {
        if (!showAltEntryModal) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowAltEntryModal(false);
                setTimeout(() => quantityRef.current?.focus?.(), 0);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [showAltEntryModal]);

    const openAltEntryModal = useCallback((defaultBaseRate, factorNumRaw) => {
        const factorNum = Number.isFinite(factorNumRaw) && factorNumRaw > 0 ? factorNumRaw : 0;
        const baseRateNum = parseFloat(defaultBaseRate);
        const canPrefill = Number.isFinite(baseRateNum) && baseRateNum > 0 && factorNum > 0;
        const prefillAltRate = canPrefill ? String(baseRateNum * factorNum) : '';
        const prefillBaseRate = Number.isFinite(baseRateNum) && baseRateNum > 0 ? String(baseRateNum) : '';

        setAltEntryQty('');
        setAltEntryUnitMode('ALT');
        setAltEntryRate(prefillAltRate || prefillBaseRate);
        setShowAltEntryModal(true);
    }, []);

    const applyAltEntry = useCallback(() => {
        const qtyNum = parseFloat(altEntryQty);
        const rateNum = parseFloat(altEntryRate);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
            showMessage("Please enter valid Qty", 'warning');
            return;
        }
        if (!Number.isFinite(rateNum) || rateNum <= 0) {
            showMessage("Please enter valid Rate", 'warning');
            return;
        }

        const factorNum = getScanFactorNumber();
        let qtyBase = qtyNum;
        let rateBase = rateNum;

        if (altEntryUnitMode === 'ALT') {
            if (!factorNum) {
                showMessage("Alternate Unit is not configured properly (Factor required)", 'warning');
                return;
            }
            qtyBase = qtyNum * factorNum;
            rateBase = rateNum / factorNum;
        }

        setScanQtyUnitMode('BASE');
        setScanQtyInput(String(qtyBase));
        setScanRate(String(Number(rateBase).toFixed(2)));
        setScanRateUnitMode('BASE');
        setScanQtyConfirmed(true);
        setShowAltEntryModal(false);
        setTimeout(() => rateRef.current?.focus?.(), 0);
    }, [altEntryQty, altEntryRate, altEntryUnitMode, getScanFactorNumber, showMessage]);

    const fetchUomInfoForRow = useCallback(async (itemCodeRaw, sizeCodeRaw) => {
        const itemCode = String(itemCodeRaw || '').trim();
        const sizeCode = String(sizeCodeRaw || '').trim();
        if (!itemCode || !sizeCode) return null;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/item-uom-map', {
                params: { itemCode, sizeCode },
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data?.success) return null;
            const rows =
                Array.isArray(response.data.rows) ? response.data.rows :
                Array.isArray(response.data.data) ? response.data.data :
                Array.isArray(response.data.list) ? response.data.list : [];
            if (!rows.length) return null;

            const first = rows[0] || {};
            const baseUom = String(first.baseUom || '').trim();
            const altUom = String(first.altUom || '').trim();
            const factor = first?.factor !== undefined && first?.factor !== null ? String(first.factor) : '';
            return { baseUom, altUom, factor };
        } catch {
            return null;
        }
    }, []);

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

        const cache = new Map();
        const resolved = await Promise.all(list.map(async (row) => {
            const itemCode = String(row?.itemCode || '').trim();
            const sizeCode = String(row?.sizeCode || '').trim();
            if (!itemCode || !sizeCode) return { key: null, info: null };
            const key = `${itemCode}__${sizeCode}`;
            if (cache.has(key)) return { key, info: cache.get(key) };
            const info = await fetchUomInfoForRow(itemCode, sizeCode);
            cache.set(key, info);
            return { key, info };
        }));
        const infoByKey = new Map();
        for (const entry of resolved) {
            if (entry?.key) {
                infoByKey.set(entry.key, entry.info);
            }
        }

        return list.map(row => {
            const key = `${String(row?.itemCode || '').trim()}__${String(row?.sizeCode || '').trim()}`;
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
                baseUom: String(row?.baseUom || info.baseUom || '').trim() || 'PCS',
                altUom: info.altUom,
                factor: info.factor,
                displayQuantity: derivedDisplay.displayQuantity,
                qtyUnitMode: derivedDisplay.qtyUnitMode,
                enteredRate: derivedDisplay.enteredRate
            };
        });
    }, [deriveLoadedRowDisplayValues, fetchUomInfoForRow]);

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
                const ledgers = response.data.ledgers;

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
                setGridRows(await enrichRowsWithUomInfo(newRows));
                setEditingRowIndex(null);
                setShowDrafts(false);
                if (Array.isArray(ledgers)) {
                    const sumLedgers = ledgers.reduce((sum, l) => sum + (parseFloat(l?.amount) || 0), 0);
                    const baseTotal = items.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0);
                    setStoLedgerRows(ledgers.map(l => {
                        const code = String(l?.ledgerCode ?? '').trim();
                        const name = code ? (stoLedgerNameByCode.get(code) || code) : '';
                        return {
                            ledgerCode: code,
                            ledgerName: name,
                            type: String(l?.type ?? '').trim(),
                            amount: String(l?.amount ?? '').trim()
                        };
                    }).filter(r => r.ledgerCode));
                    setCommittedStoLedgerTotal(baseTotal + sumLedgers);
                } else {
                    setStoLedgerRows([]);
                    setCommittedStoLedgerTotal(null);
                }
                if (received) {
                    showMessage('This STO is RECEIVED. Edit/Delete is disabled.', 'warning');
                } else {
                    showMessage('Draft loaded successfully', 'success');
                }
                setTimeout(() => toStoreRef.current?.focus?.(), 0);
            }
        } catch (error) {
            console.error("Error loading draft", error);
            showMessage('Error loading draft', 'error');
        }
    };

    const loadStoForDuplicate = useCallback(async (stoNumberRaw) => {
        const no = String(stoNumberRaw || '').trim();
        if (!no) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sto/${encodeURIComponent(no)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.data) return;
            const head = response.data.head;
            const items = response.data.items || [];
            const ledgers = response.data.ledgers;

            setSelectedDraft(null);
            setIsReceivedSto(false);
            setFromStore(head.fromStore);
            setToStore(head.toStore);
            setStoDate(formatDateForInput(head.date));
            setStoNumber('');
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
                closingStock: 0
            }));
            setGridRows(await enrichRowsWithUomInfo(newRows));
            setEditingRowIndex(null);
            setShowDrafts(false);

            if (Array.isArray(ledgers)) {
                const sumLedgers = ledgers.reduce((sum, l) => sum + (parseFloat(l?.amount) || 0), 0);
                const baseTotal = items.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0);
                setStoLedgerRows(ledgers.map(l => {
                    const code = String(l?.ledgerCode ?? '').trim();
                    const name = code ? (stoLedgerNameByCode.get(code) || code) : '';
                    return {
                        ledgerCode: code,
                        ledgerName: name,
                        type: String(l?.type ?? '').trim(),
                        amount: String(l?.amount ?? '').trim()
                    };
                }).filter(r => r.ledgerCode));
                setCommittedStoLedgerTotal(baseTotal + sumLedgers);
            } else {
                setStoLedgerRows([]);
                setCommittedStoLedgerTotal(null);
            }

            const from = String(head?.fromStore || '').trim();
            if (from) fetchNextStoNumber(from);

            showMessage('Duplicate voucher loaded. Save will create a new STO number.', 'success');
            setTimeout(() => toStoreRef.current?.focus?.(), 0);
        } catch (error) {
            console.error("Error loading STO for duplicate", error);
            showMessage('Error loading voucher', 'error');
        }
    }, [stoLedgerNameByCode]);

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
    const handleFromLocationPillKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setTimeout(() => toStoreRef.current?.focus?.(), 0);
        }
    };

    const handleFromStoreKeyDown = (e) => {
        if (showFromStoreSuggestions && fromStoreSearchResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedFromStoreSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, fromStoreSearchResults.length - 1)));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedFromStoreSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const idx = focusedFromStoreSuggestionIndex;
                if (idx >= 0 && idx < fromStoreSearchResults.length) applyFromStoreSelection(fromStoreSearchResults[idx]);
                return;
            }
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowFromStoreSuggestions(false);
            setFocusedFromStoreSuggestionIndex(-1);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const resolved = resolveStoreCodeFromInput(fromStoreSearchInput, fromStores);
            if (resolved) {
                const list = Array.isArray(fromStores) ? fromStores : [];
                const match = list.find(s => String(s?.storeCode || '').trim() === String(resolved));
                if (match) {
                    applyFromStoreSelection(match);
                    return;
                }
            }
            showMessage('Please select a valid From Location', 'warning');
            setFromStore('');
            setShowFromStoreSuggestions(false);
            setFocusedFromStoreSuggestionIndex(-1);
            setTimeout(() => fromStoreSearchInputRef.current?.focus?.(), 0);
        }
    };

    const handleToStoreKeyDown = (e) => {
        if (showToStoreSuggestions && toStoreSearchResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedToStoreSuggestionIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, toStoreSearchResults.length - 1)));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedToStoreSuggestionIndex(prev => (prev <= 0 ? 0 : prev - 1));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const idx = focusedToStoreSuggestionIndex;
                if (idx >= 0 && idx < toStoreSearchResults.length) applyToStoreSelection(toStoreSearchResults[idx]);
                return;
            }
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowToStoreSuggestions(false);
            setFocusedToStoreSuggestionIndex(-1);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            setShowToStoreSuggestions(false);
            setFocusedToStoreSuggestionIndex(-1);
            dateRef.current?.focus?.();
        }
    };

    const handleDateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (narrationRef.current) {
                narrationRef.current.focus();
                return;
            }
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleNarrationKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (scanInputRef.current) scanInputRef.current.focus();
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
                    const response = (fromStore && voucherConfig?.isNegativeInventoryAllowed !== true)
                        ? await axios.get('/api/inventory/search-available', {
                            params: { storeCode: fromStore, query: value, tranDate: stoDate },
                            headers: { 'Authorization': `Bearer ${token}` },
                            signal: scanAbortControllerRef.current.signal
                        })
                        : await axios.get('/api/items/search', {
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

    const handleSelectSuggestion = async (item) => {
        const preserveEditValues = editingRowIndexRef.current !== null;
        const currentSizeCode = String(scanSize || '').trim();
        // #region debug-point B:select-suggestion-start
        reportFocusDebug('B', 'StockTransferOut.js:2640', 'handleSelectSuggestion start', {
            itemCode: item?.itemCode || '',
            itemName: item?.itemName || '',
            preserveEditValues,
            currentSizeCode
        });
        // #endregion
        setScanItemCode(item.itemCode);
        setScanItemName(item.itemName);
        setScanSearchInput(item.itemName);
        setShowSuggestions(false);
        const ok = await fetchItemDetails(item.itemCode, {
            preferredSizeCode: preserveEditValues ? currentSizeCode : '',
            preserveQuantity: preserveEditValues,
            openSizeChooser: preserveEditValues,
            focusScanItem: false
        });
        if (!ok) {
            requestAnimationFrame(() => {
                try {
                    scanInputRef.current?.focus?.();
                    scanInputRef.current?.select?.();
                } catch {}
            });
        }
        // #region debug-point B:select-suggestion-end
        reportFocusDebug('B', 'StockTransferOut.js:2660', 'handleSelectSuggestion end', {
            itemCode: item?.itemCode || '',
            ok
        });
        // #endregion
        return ok;
    };

    const handleScanKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // #region debug-point A:item-enter
            reportFocusDebug('A', 'StockTransferOut.js:2675', 'handleScanKeyDown enter', {
                query: String(scanSearchInput || ''),
                searchResultsCount: Array.isArray(searchResults) ? searchResults.length : -1,
                focusedSuggestionIndex
            });
            // #endregion

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

            const query = rawQuery.toLowerCase();
            const list = Array.isArray(searchResults) ? searchResults : [];
            let ok = false;
            if (list.length > 0) {
                const exactMatch = query
                    ? list.find(it =>
                        String(it?.itemCode || '').trim().toLowerCase() === query ||
                        String(it?.itemName || '').trim().toLowerCase() === query
                    )
                    : null;

                const chosen =
                    (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < list.length ? list[focusedSuggestionIndex] : null) ||
                    exactMatch ||
                    list[0];

                if (chosen) {
                    ok = await handleSelectSuggestion(chosen);
                } else {
                    const preserveEditValues = editingRowIndexRef.current !== null;
                    const currentSizeCode = String(scanSize || '').trim();
                    ok = await fetchItemDetails(scanSearchInput, {
                        preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                        preserveQuantity: preserveEditValues,
                        openSizeChooser: preserveEditValues,
                        focusScanItem: false
                    });
                }
            } else {
                const preserveEditValues = editingRowIndexRef.current !== null;
                const currentSizeCode = String(scanSize || '').trim();
                ok = await fetchItemDetails(scanSearchInput, {
                    preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                    preserveQuantity: preserveEditValues,
                    openSizeChooser: preserveEditValues,
                    focusScanItem: false
                });
            }
            if (!ok) {
                // #region debug-point A:item-enter-fallback
                reportFocusDebug('A', 'StockTransferOut.js:2725', 'handleScanKeyDown fallback-to-item', {
                    query: String(scanSearchInput || ''),
                    ok
                });
                // #endregion
                requestAnimationFrame(() => {
                    try {
                        scanInputRef.current?.focus?.();
                        scanInputRef.current?.select?.();
                    } catch {}
                });
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
    const getAvailableSizesForItem = useCallback((pricesOverride, stockOverride, stockStatusOverride) => {
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
        const prices = Array.isArray(pricesOverride) ? pricesOverride : (Array.isArray(itemPrices) ? itemPrices : []);

        if (showAll) {
            sizes = sizeMaster;
        } else {
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
        const effectiveStockStatus = stockStatusOverride || itemStockStatus;
        if (!negativeAllowed && effectiveStockStatus === 'loaded') {
            const stock = stockOverride || itemStockRef.current || {};
            sizes = (Array.isArray(sizes) ? sizes : []).filter(s => (stock[normalize(s?.code)] || 0) > 0);
        }

        return Array.isArray(sizes) ? sizes : [];
    }, [activeSizes, itemPrices, itemStockStatus, voucherConfig?.isNegativeInventoryAllowed, voucherConfig?.showAllSize]);

    const getAvailableSizesForScan = useCallback(() => {
        return getAvailableSizesForItem(itemPrices, itemStockRef.current, itemStockStatus);
    }, [getAvailableSizesForItem, itemPrices, itemStockStatus]);

    useEffect(() => {
        if (!scanItemCode) return;
        if (!scanSize) return;

        const normalizedSelected = String(scanSize || '').trim().toLowerCase();
        if (!normalizedSelected) return;

        const availableSizes = getAvailableSizesForScan();
        const stillAvailable = availableSizes.some(size => String(size?.code || '').trim().toLowerCase() === normalizedSelected);
        if (stillAvailable) return;

        sizeAutoShowAllRef.current = true;
        setScanSize('');
        setScanSizeName('');
        setSizeSearchInput('');
        setFocusedSizeSuggestionIndex(-1);
        setShowSizeSuggestions(false);
    }, [getAvailableSizesForScan, scanItemCode, scanSize]);

    const handleSizeInputChange = (e) => {
        const value = e.target.value;
        sizeAutoShowAllRef.current = !value;
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
            setFocusedSizeSuggestionIndex(filtered.length > 0 ? 0 : -1);
            setShowSizeSuggestions(true);
        } else {
            setSizeSearchResults(availableSizes);
            setFocusedSizeSuggestionIndex(availableSizes.length > 0 ? 0 : -1);
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

    const applyScanSizeSelection = useCallback((size, pricesOverride, options = {}) => {
        if (!size) return;
        const normalize = (v) => String(v || '').trim();
        const targetSizeCode = normalize(size.code);
        const targetSizeName = normalize(size.name);
        const {
            focusQuantity = true,
            closeSuggestions = true,
            itemCodeOverride = '',
            preserveQuantity = editingRowIndexRef.current !== null
        } = options;
        const prices = Array.isArray(pricesOverride) ? pricesOverride : (Array.isArray(itemPrices) ? itemPrices : []);

        if (!targetSizeCode) return false;

        sizeAutoShowAllRef.current = false;
        setScanSize(targetSizeCode);
        setScanSizeName(targetSizeName || targetSizeCode);
        setSizeSearchInput(targetSizeName || targetSizeCode);
        if (closeSuggestions) {
            setShowSizeSuggestions(false);
        }
        if (!preserveQuantity) {
            setScanQtyInput('');
        }
        setScanQtyConfirmed(false);
        setScanAmountInput('');
        scanAmountTouchedRef.current = false;

        const priceInfo = prices.find(p => normalize(p?.sizeCode) === targetSizeCode);
        if (priceInfo) {
            const rate = getEffectiveRate(priceInfo);
            setScanRate(rate);
            rateTouchedRef.current = false;
            defaultBaseRateRef.current = parseFloat(rate) || 0;
            setScanMrp(priceInfo.mrp ? priceInfo.mrp : '');
            setScanBaseUom(priceInfo.uom || '');
            setScanAltUom(priceInfo.altUom || '');
            setScanFactor(priceInfo.factor !== undefined && priceInfo.factor !== null ? String(priceInfo.factor) : '');
            scanUomInfoRef.current = {
                baseUom: String(priceInfo.uom || '').trim(),
                options: String(priceInfo.altUom || '').trim() && parseFloat(priceInfo.factor) > 0
                    ? [{ altUom: String(priceInfo.altUom || '').trim(), factor: String(priceInfo.factor) }]
                    : []
            };
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            const hasAlt = String(priceInfo.altUom || '').trim() && (parseFloat(priceInfo.factor) > 0);
            if (hasAlt) {
                fetchUomMapForScan(itemCodeOverride || scanItemCode, targetSizeCode);
            }
        } else {
            setScanRate('');
            rateTouchedRef.current = false;
            defaultBaseRateRef.current = 0;
            setScanMrp('');
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            scanUomInfoRef.current = { baseUom: '', options: [] };
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
        }

        fetchStock(itemCodeOverride || scanItemCode, targetSizeCode);

        if (focusQuantity) {
            quantityRef.current?.focus?.();
        }
        return true;
    }, [fetchStock, fetchUomMapForScan, getEffectiveRate, itemPrices, scanItemCode]);

    const handleSelectSize = (size, options = {}) => {
        applyScanSizeSelection(size, itemPrices, options);
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

    const handleQuantityKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const parsed = parseQtyWithUnit(scanQtyInput);
            const qNum = parsed?.qtyNum ?? 0;
            // #region debug-point A:qty-enter
            reportAltQtyRateDebug('A', 'StockTransferOut.js:3070', 'handleQuantityKeyDown enter', {
                scanQtyInput: String(scanQtyInput || ''),
                parsedOk: Boolean(parsed?.ok),
                qNum,
                unitToken: String(parsed?.unitToken || ''),
                hasUnit: Boolean(parsed?.hasUnit),
                scanQtyUnitMode,
                scanRate: String(scanRate || ''),
                scanRateUnitMode,
                scanAmountInput: String(scanAmountInput || '')
            });
            // #endregion
            if (!parsed?.ok) {
                showMessage("Invalid Qty format. Use like 2c or 2.5c", 'warning');
                return;
            }
            if (!Number.isFinite(qNum) || qNum <= 0) {
                const availableSizes = getAvailableSizesForScan();
                const currentSizeIndex = availableSizes.findIndex(s => s.code === scanSize);
                let nextSize = null;

                if (currentSizeIndex !== -1) {
                    nextSize = availableSizes[currentSizeIndex + 1] || null;
                }

                if (nextSize) {
                    applyScanSizeSelection(nextSize, itemPrices, {
                        focusQuantity: false,
                        closeSuggestions: true,
                        preserveQuantity: false
                    });
                    setScanQtyInput('');
                    setScanQtyConfirmed(false);
                    setScanAmountInput('');
                    scanAmountTouchedRef.current = false;
                    requestAnimationFrame(() => quantityRef.current?.focus?.());
                } else {
                    setScanItemCode('');
                    setScanItemName('');
                    setScanSearchInput('');
                    setScanSize('');
                    setScanSizeName('');
                    setSizeSearchInput('');
                    setScanRate('');
                    setScanQtyInput('');
                    setScanMrp('');
                    setScanClosingStock('');
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    defaultBaseRateRef.current = 0;
                    setScanQtyConfirmed(false);
                    setItemPrices([]);
                    setItemStock({});
                    itemStockRef.current = {};
                    if (scanInputRef.current) scanInputRef.current.focus();
                }
                return;
            }

            if (parsed?.ok && parsed?.hasUnit) {
                const quick = resolveUnitToken(parsed.unitToken);
                if (!quick?.ok) {
                    await fetchUomMapForScan(scanItemCode, scanSize);
                    const after = resolveUnitToken(parsed.unitToken);
                    if (!after?.ok) {
                        showMessage('Unknown unit code in Qty', 'warning');
                        return;
                    }
                }
            }

            const ok = confirmQtyAndSyncRateUnit();
            if (!ok) return;
            requestAnimationFrame(() => {
                try {
                    rateRef.current?.focus?.();
                    rateRef.current?.select?.();
                } catch {}
            });
        }
    };

    const handleAddItem = async () => {
        if (isReceivedSto) return;
        if (!scanItemCode) {
            showMessage("Please select an Item", 'warning');
            return;
        }
        if (!scanSize) {
            showMessage("Please select a Size", 'warning');
            return;
        }
        const parsedQty = parseQtyWithUnit(scanQtyInput);
        if (!parsedQty?.ok || !Number.isFinite(parsedQty.qtyNum) || parsedQty.qtyNum <= 0) {
            showMessage("Please enter valid Quantity", 'warning');
            return;
        }

        let resolved = resolveUnitToken(parsedQty.unitToken);
        if (!resolved?.ok && parsedQty?.hasUnit) {
            await fetchUomMapForScan(scanItemCode, scanSize);
            resolved = resolveUnitToken(parsedQty.unitToken);
        }
        if (!resolved?.ok) {
            showMessage('Unknown unit code in Qty', 'warning');
            return;
        }

        const qtyUnitMode = resolved.unitMode === 'ALT' ? 'ALT' : 'BASE';
        const qtyEntered = parsedQty.qtyNum;
        const selectedAltUom = qtyUnitMode === 'ALT' ? String(resolved.resolvedUom || '').trim() : '';
        const selectedFactorStr = qtyUnitMode === 'ALT' ? String(resolved.factor || '').trim() : '';
        const configuredAltUom = String(scanAltUom || '').trim();
        const configuredFactorStr = scanFactor !== undefined && scanFactor !== null ? String(scanFactor).trim() : '';
        const rowAltUom = qtyUnitMode === 'ALT' ? selectedAltUom : configuredAltUom;
        const rowFactorStr = qtyUnitMode === 'ALT' ? selectedFactorStr : configuredFactorStr;
        const factorNumCandidate = qtyUnitMode === 'ALT' ? parseFloat(selectedFactorStr) : 0;
        const factorNum = qtyUnitMode === 'ALT'
            ? (Number.isFinite(factorNumCandidate) && factorNumCandidate > 0 ? factorNumCandidate : getScanFactorNumber())
            : 0;
        const qtyBase = qtyUnitMode === 'ALT' ? (factorNum ? qtyEntered * factorNum : 0) : qtyEntered;
        if (qtyUnitMode === 'ALT') {
            if (selectedAltUom) setScanAltUom(selectedAltUom);
            if (selectedFactorStr) setScanFactor(selectedFactorStr);
        }
        if (!qtyBase) {
            if (qtyUnitMode === 'ALT') {
                showMessage("Alternate Unit is not configured properly (Factor required)", 'warning');
            } else {
                showMessage("Please enter valid Quantity", 'warning');
            }
            return;
        }
        const availableStock = parseFloat(scanClosingStock) || 0;

        const existingQtyOtherRows = gridRows.reduce((sum, row, i) => {
            if (i === editingRowIndex) return sum;
            if (row.itemCode === scanItemCode && row.sizeCode === scanSize) {
                return sum + (parseFloat(row.quantity) || 0);
            }
            return sum;
        }, 0);

        if (voucherConfig?.isNegativeInventoryAllowed !== true && existingQtyOtherRows + qtyBase > availableStock) {
            showMessage(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
            return;
        }

        const rawAmount = String(scanAmountInput || '').trim();
        const amountOverrideNum = rawAmount ? parseFloat(rawAmount) : NaN;
        const enteredAmountOverride = Number.isFinite(amountOverrideNum) ? amountOverrideNum : 0;

        const computedDisplayedRate = parseFloat(scanRate) || 0;
        const displayedRate = enteredAmountOverride > 0 ? (enteredAmountOverride / qtyEntered) : computedDisplayedRate;
        const rateBase = getBaseRateFromDisplayed(displayedRate, qtyUnitMode);
        const mrp = parseFloat(scanMrp) || 0;
        const enteredAmount = enteredAmountOverride > 0 ? enteredAmountOverride : (qtyEntered * displayedRate);
        if (displayedRate <= 0 || enteredAmount <= 0 || rateBase <= 0) {
            // #region debug-point C:amount-rate-validation-failed
            reportAltQtyRateDebug('C', 'StockTransferOut.js:3196', 'handleAddItem rate validation failed', {
                scanQtyInput: String(scanQtyInput || ''),
                qtyUnitMode,
                qtyEntered,
                scanRate: String(scanRate || ''),
                scanRateUnitMode,
                rawAmount,
                enteredAmountOverride,
                computedDisplayedRate,
                displayedRate,
                rateBase,
                factorNum,
                rowAltUom,
                rowFactorStr
            });
            // #endregion
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
                rate: rateBase,
                mrp: mrp,
                price: rateBase,
                quantity: qtyBase,
                displayQuantity: qtyEntered,
                qtyUnitMode: qtyUnitMode,
                baseUom: scanBaseUom,
                altUom: rowAltUom,
                factor: rowFactorStr,
                enteredUom: resolved.resolvedUom || scanBaseUom,
                enteredUnitToken: normalizeUnitToken(parsedQty.unitToken),
                enteredRate: displayedRate,
                amount: enteredAmount,
                closingStock: scanClosingStock
            });

            const clubbingAllowed = isClubbingEnabled(voucherConfig);

            if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < prev.length) {
                const baseRow = prev[editingRowIndex] || {};
                if (!clubbingAllowed) {
                    const updatedRows = [...prev];
                    updatedRows[editingRowIndex] = makeRow(baseRow);
                    pendingGridScrollRef.current = true;
                    pendingGridScrollIndexRef.current = editingRowIndex;
                    return updatedRows;
                }

                const otherIndex = prev.findIndex((row, i) =>
                    i !== editingRowIndex && row.itemCode === scanItemCode && row.sizeCode === scanSize
                );

                let updatedRows = prev;
                let targetIndex = editingRowIndex;
                let mergedQty = qtyBase;

                if (otherIndex >= 0) {
                    mergedQty += parseFloat(prev[otherIndex]?.quantity) || 0;
                    updatedRows = prev.filter((_, i) => i !== otherIndex);
                    if (otherIndex < targetIndex) targetIndex -= 1;
                } else {
                    updatedRows = [...prev];
                }

                const newRow = makeRow(baseRow);
                newRow.quantity = mergedQty;
                newRow.displayQuantity = mergedQty;
                newRow.qtyUnitMode = 'BASE';
                newRow.enteredUom = scanBaseUom;
                newRow.enteredUnitToken = '';
                newRow.enteredRate = rateBase;
                newRow.amount = mergedQty * rateBase;
                updatedRows[targetIndex] = newRow;
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = targetIndex;
                return updatedRows;
            }

            if (clubbingAllowed) {
                const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
                if (existingIndex >= 0) {
                    const updatedRows = [...prev];
                    const existingRow = updatedRows[existingIndex];
                    const newQuantity = (parseFloat(existingRow.quantity) || 0) + qtyBase;
                    const newAmount = newQuantity * rateBase;

                    updatedRows[existingIndex] = {
                        ...existingRow,
                        quantity: newQuantity,
                        displayQuantity: newQuantity,
                        qtyUnitMode: 'BASE',
                        amount: newAmount,
                        rate: rateBase,
                        price: rateBase,
                        enteredUom: scanBaseUom,
                        enteredUnitToken: '',
                        enteredRate: rateBase,
                        closingStock: scanClosingStock
                    };
                    pendingGridScrollRef.current = true;
                    pendingGridScrollIndexRef.current = existingIndex;
                    return updatedRows;
                }
            }

            pendingGridScrollRef.current = true;
            pendingGridScrollIndexRef.current = prev.length;
            return [...prev, makeRow()];
        });
        setEditingRowIndex(null);

        // Determine next state (Auto-advance Size)
        const availableSizes = getAvailableSizesForScan();
        const currentSizeIndex = availableSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1) {
            nextSize = availableSizes[currentSizeIndex + 1] || null;
        }

        if (nextSize) {
            // Keep Item, Advance to Next Size
            applyScanSizeSelection(nextSize, itemPrices, {
                focusQuantity: false,
                closeSuggestions: true,
                preserveQuantity: false
            });
            setScanQtyInput('');
            setScanQtyConfirmed(false);
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;
            requestAnimationFrame(() => quantityRef.current?.focus?.());

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
            setScanQtyInput('');
            setScanAmountInput('');
            setScanMrp('');
            setScanClosingStock('');
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            scanUomInfoRef.current = { baseUom: '', options: [] };
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            defaultBaseRateRef.current = 0;
            setScanQtyConfirmed(false);
            scanAmountTouchedRef.current = false;
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
        let prices = [];
        try {
            const itemCode = String(row.itemCode || '').trim();
            if (itemCode) {
                const cached = itemPricesCacheRef.current.get(itemCode);
                if (cached) {
                    prices = cached;
                } else {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(`/api/prices/item/${encodeURIComponent(itemCode)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    prices = response?.data?.success ? (response.data.prices || []) : [];
                    itemPricesCacheRef.current.set(itemCode, prices);
                }
            }
        } catch {
            prices = [];
        }
        setEditingRowIndex(index);
        setItemPrices(Array.isArray(prices) ? prices : []);

        setScanItemCode(row.itemCode || '');
        setScanItemName(row.itemName || '');
        setScanSearchInput(row.itemName || row.itemCode || '');
        setScanSize(row.sizeCode || '');
        const resolvedSizeName =
            row.sizeName ||
            prices.find(p => String(p?.sizeCode || '').trim() === String(row.sizeCode || '').trim())?.sizeName ||
            row.sizeCode ||
            '';
        setScanSizeName(resolvedSizeName);
        setSizeSearchInput(resolvedSizeName);
        const rowFactorNum = row?.factor !== undefined && row?.factor !== null ? parseFloat(row.factor) : 0;
        const rowHasAlt = Boolean(String(row?.altUom || '').trim()) && Number.isFinite(rowFactorNum) && rowFactorNum > 0;
        const rowUnitMode = row?.qtyUnitMode === 'ALT' ? 'ALT' : 'BASE';
        const enteredQtyNum =
            row?.displayQuantity !== undefined && row?.displayQuantity !== null
                ? parseFloat(row.displayQuantity) || 0
                : (parseFloat(row?.quantity) || 0);
        const baseRateNum = row?.rate !== undefined && row?.rate !== null ? parseFloat(row.rate) || 0 : 0;
        const enteredRateNum =
            row?.enteredRate !== undefined && row?.enteredRate !== null
                ? parseFloat(row.enteredRate) || 0
                : (rowUnitMode === 'ALT' && rowHasAlt ? baseRateNum * rowFactorNum : baseRateNum);
        const token =
            row?.enteredUnitToken
                ? String(row.enteredUnitToken)
                : getUnitTokenFromUomCode(rowUnitMode === 'ALT' ? row.altUom : row.baseUom);
        const qtyText = enteredQtyNum > 0 ? `${enteredQtyNum}${token || ''}` : '';

        defaultBaseRateRef.current = baseRateNum || 0;
        setScanRate(rowUnitMode === 'ALT' ? String(Number(enteredRateNum || 0).toFixed(2)) : (baseRateNum ? String(baseRateNum) : ''));
        setScanMrp(row.mrp !== undefined && row.mrp !== null ? String(row.mrp) : '');
        setScanQtyInput(qtyText);
        setScanAmountInput('');
        scanAmountTouchedRef.current = false;
        setScanQtyUnitMode(rowUnitMode);
        setScanRateUnitMode(rowUnitMode);
        setScanQtyConfirmed(true);
        setScanBaseUom(row.baseUom || '');
        setScanAltUom(row.altUom || '');
        setScanFactor(row.factor !== undefined && row.factor !== null ? String(row.factor) : '');
        scanUomInfoRef.current = {
            baseUom: String(row.baseUom || '').trim(),
            options: String(row.altUom || '').trim() && parseFloat(row.factor) > 0
                ? [{ altUom: String(row.altUom || '').trim(), factor: String(row.factor) }]
                : []
        };

        if (row.itemCode && row.sizeCode) {
            await fetchStock(row.itemCode, row.sizeCode);
        } else if (row.closingStock !== undefined && row.closingStock !== null) {
            setScanClosingStock(String(row.closingStock));
        }

        requestAnimationFrame(() => {
            try {
                scanInputRef.current?.focus?.();
                scanInputRef.current?.select?.();
            } catch {}
        });
    };

    const handleSave = async (isDraft = false) => {
        if (isReceivedSto) {
            showMessage("Cannot edit STO. It is already received in Stock Transfer In.", 'warning');
            return;
        }
        const resolvedFromStore = fromStore || resolveStoreCodeFromInput(fromStoreSearchInput, fromStores);
        const resolvedToStore = toStore || resolveStoreCodeFromInput(toStoreSearchInput, stores);

        if (!fromStore && resolvedFromStore) {
            setFromStore(resolvedFromStore);
        }
        if (!toStore && resolvedToStore) {
            setToStore(resolvedToStore);
        }

        if (!resolvedFromStore) {
            showMessage("Please select From Location", 'warning');
            return;
        }
        if (!resolvedToStore) {
            showMessage("Please select To Location", 'warning');
            return;
        }
        if (resolvedFromStore === resolvedToStore) {
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
            fromStore: resolvedFromStore,
            toStore: resolvedToStore,
            userName: user.userName,
            narration,
            totalAmount,
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

        if (!isDraft) {
            if (isSubmitSavingRef.current) return;
            isSubmitSavingRef.current = true;
            setIsSubmitSaving(true);
        }

        try {
            const token = localStorage.getItem('token');
            const payload = { 
                isDraft, 
                head, 
                items,
                ledgers: (stoLedgerRows || []).map(r => ({
                    ledgerCode: r.ledgerCode,
                    amount: parseFloat(r.amount) || 0,
                    type: r.type || ''
                }))
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
                    setScanQtyInput('');
                    setScanRate('');
                    setScanMrp('');
                    setScanClosingStock('');
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    defaultBaseRateRef.current = 0;
                    setScanQtyConfirmed(false);
                    setItemPrices([]);
                    setItemStock({});
                    itemStockRef.current = {};
                    setSelectedDraft(null);
                    setIsReceivedSto(false);
                    setStoLedgerRows([]);
                    setCommittedStoLedgerTotal(null);

                    if (fromStore) {
                        fetchNextStoNumber(fromStore);
                    }
                    requestCloseParentModal();
                    focusToStoreAfterSaveRef.current = true;
                    setFocusToStoreAfterSaveSeq(v => v + 1);
                    setTimeout(() => toStoreRef.current?.focus?.(), 350);
                    setTimeout(() => toStoreRef.current?.focus?.(), 650);
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            const msg = error?.response?.data?.message || error?.response?.data || error?.message || 'Error saving stock transfer';
            showMessage(String(msg), 'error');
        } finally {
            if (!isDraft) {
                isSubmitSavingRef.current = false;
                setIsSubmitSaving(false);
            }
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
                        
                        <div className="flex items-center gap-3">
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

                            <div className="w-80">
                                <button
                                    ref={fromStoreRef}
                                    type="button"
                                    onClick={openChangeFromStoreModal}
                                    onKeyDown={handleFromLocationPillKeyDown}
                                    className={`w-full flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm ${
                                        !isReceivedSto && currentUser?.role !== 'STORE USER'
                                            ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all'
                                            : 'cursor-default opacity-75'
                                    }`}
                                    title={!isReceivedSto && currentUser?.role !== 'STORE USER' ? 'Click to change store' : undefined}
                                >
                                    <div className="bg-indigo-100 p-1 rounded-full">
                                        <Store className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex items-baseline gap-2 min-w-0">
                                        <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                            {String(fromStore || '').trim() || '—'}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700 font-sans tracking-tight truncate">
                                            {String(selectedFromStoreInfo?.storeName || fromStoreSearchInput || '').trim() || 'From Location'}
                                        </span>
                                    </div>
                                    {!isReceivedSto && currentUser?.role !== 'STORE USER' && (
                                        <Search className="w-4 h-4 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
                            {/* To Location */}
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">To Location <span className="text-red-500">*</span></label>
                                <div ref={toStoreSuggestWrapRef} className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Store className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        ref={toStoreRef}
                                        type="text"
                                        value={toStoreSearchInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setToStoreSearchInput(value);
                                            if (toStore) setToStore('');
                                            const results = filterStoresForSearch(value, fromStore, stores);
                                            setToStoreSearchResults(results);
                                            setShowToStoreSuggestions(true);
                                            setFocusedToStoreSuggestionIndex(results.length ? 0 : -1);
                                        }}
                                        onKeyDown={handleToStoreKeyDown}
                                        onFocus={() => {
                                            if (isReceivedSto) return;
                                            const results = filterStoresForSearch(toStoreSearchInput, fromStore, stores);
                                            setToStoreSearchResults(results);
                                            setShowToStoreSuggestions(true);
                                            setFocusedToStoreSuggestionIndex(results.length ? 0 : -1);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                const wrap = toStoreSuggestWrapRef.current;
                                                if (wrap && wrap.contains(document.activeElement)) return;
                                                setShowToStoreSuggestions(false);
                                                setFocusedToStoreSuggestionIndex(-1);
                                            }, 0);
                                        }}
                                        disabled={isReceivedSto}
                                        placeholder="Search store code or name"
                                        autoComplete="off"
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                    />
                                    {showToStoreSuggestions && toStoreSearchResults.length > 0 && !isReceivedSto && (
                                        <div ref={toStoreSuggestionsRef} className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {toStoreSearchResults.map((s, idx) => (
                                                <div
                                                    key={`${String(s?.storeCode || idx)}-${idx}`}
                                                    data-suggestion-index={idx}
                                                    className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 flex items-center justify-between ${
                                                        idx === focusedToStoreSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(ev) => {
                                                        ev.preventDefault();
                                                        applyToStoreSelection(s);
                                                    }}
                                                >
                                                    <span className="text-slate-800">{String(s?.storeName || '')}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{String(s?.storeCode || '')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date <span className="text-red-500">*</span></label>
                                <DateInputButton
                                    inputRef={dateRef}
                                    value={stoDate}
                                    disabled={isDateDisabled || isReceivedSto}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(selectedDate) => {
                                        const today = new Date().toISOString().split('T')[0];
                                        if (selectedDate > today) {
                                            showMessage("Date cannot be greater than today", 'warning');
                                            setStoDate(today);
                                        } else {
                                            setStoDate(selectedDate);
                                        }
                                    }}
                                    onKeyDown={handleDateKeyDown}
                                    wrapperClassName="relative"
                                    buttonClassName={`pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-left min-w-[9rem] ${isDateDisabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                                />
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

                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Narration</label>
                                <input
                                    ref={narrationRef}
                                    type="text"
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    onKeyDown={handleNarrationKeyDown}
                                    disabled={isReceivedSto}
                                    className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400 ${isReceivedSto ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    placeholder="Enter narration..."
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
                                    // #region debug-point D:item-blur
                                    reportFocusDebug('D', 'StockTransferOut.js:3860', 'item input blur', {
                                        scanSearchInput: String(scanSearchInput || ''),
                                        showSuggestions,
                                        sizeSearchInput: String(sizeSearchInput || ''),
                                        scanSize: String(scanSize || '')
                                    });
                                    // #endregion
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
                            onFocus={(e) => {
                                // #region debug-point E:size-focus
                                reportFocusDebug('E', 'StockTransferOut.js:3900', 'size input focus', {
                                    sizeSearchInput: String(sizeSearchInput || ''),
                                    scanSize: String(scanSize || ''),
                                    relatedPlaceholder: e?.relatedTarget?.getAttribute?.('placeholder') || ''
                                });
                                // #endregion
                                handleSizeInputFocus();
                            }}
                            onKeyDown={handleSizeKeyDown}
                            onBlur={() => {
                                // #region debug-point E:size-blur
                                reportFocusDebug('E', 'StockTransferOut.js:3908', 'size input blur', {
                                    sizeSearchInput: String(sizeSearchInput || ''),
                                    scanSize: String(scanSize || ''),
                                    scanSearchInput: String(scanSearchInput || '')
                                });
                                // #endregion
                                const normalize = (v) => String(v || '').trim();
                                const input = normalize(sizeSearchInput);
                                const current = normalize(scanSize);
                                if (input && !current) {
                                    const availableSizes = getAvailableSizesForScan();
                                    const lower = (v) => normalize(v).toLowerCase();
                                    let candidate = null;
                                    const exactMatch = availableSizes.find(s =>
                                        lower(s?.code) === lower(input) || lower(s?.name) === lower(input)
                                    );
                                    if (exactMatch) candidate = exactMatch;
                                    else if (sizeSearchResults.length > 0) candidate = sizeSearchResults[0];
                                    else if (availableSizes.length > 0) candidate = availableSizes[0];
                                    if (candidate) handleSelectSize(candidate);
                                }
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
                        {showSizeSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                {sizeSearchResults.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-slate-400">No sizes available</div>
                                ) : (
                                    sizeSearchResults.map((size, index) => {
                                        const stock = itemStock[size.code] !== undefined ? itemStock[size.code] : 0;
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
                                                } else {
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
                                    })
                                )}
                            </div>
                        )}
                    </div>
                    <div className="col-span-1 py-2 border-r border-indigo-100 px-2 flex flex-col justify-center">
                            <input
                            ref={quantityRef}
                            type="text"
                            value={scanQtyInput}
                            onChange={(e) => {
                                setScanQtyInput(e.target.value);
                                setScanQtyConfirmed(false);

                                const parsed = parseQtyWithUnit(e.target.value);
                                if (parsed?.ok && parsed?.hasUnit) {
                                    const resolved = resolveUnitToken(parsed.unitToken);
                                    if (resolved?.ok) {
                                        const mode = resolved.unitMode === 'ALT' ? 'ALT' : 'BASE';
                                        setScanQtyUnitMode(mode);
                                        setScanRateUnitMode(mode);
                                        if (mode === 'ALT') {
                                            const altCode = String(resolved.resolvedUom || '').trim();
                                            const f = String(resolved.factor || '').trim();
                                            if (altCode) setScanAltUom(altCode);
                                            if (f) setScanFactor(f);

                                            if (!rateTouchedRef.current) {
                                                const prevMode = scanRateUnitMode || 'BASE';
                                                const baseFromCurrent = getBaseRateFromDisplayed(parseFloat(scanRate), prevMode);
                                                const baseFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                                                const baseRate = baseFromCurrent || baseFallback;

                                                const factorNum = parseFloat(f);
                                                const pricingMethod = String(voucherConfig?.pricingMethod || 'PURCHASE_PRICE').trim().toUpperCase();
                                                const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
                                                const selectedOpt = altCode
                                                    ? options.find(o => String(o?.altUom || '').trim().toLowerCase() === altCode.toLowerCase())
                                                    : null;
                                                const optPriceRaw =
                                                    pricingMethod === 'MRP' ? selectedOpt?.mrp :
                                                    pricingMethod === 'SALE_PRICE' ? selectedOpt?.salePrice :
                                                    selectedOpt?.purchasePrice;
                                                const optPriceNum = parseFloat(optPriceRaw);
                                                const nextRate =
                                                    Number.isFinite(optPriceNum) && optPriceNum > 0
                                                        ? optPriceNum
                                                        : (Number.isFinite(baseRate) && baseRate > 0 && Number.isFinite(factorNum) && factorNum > 0 ? baseRate * factorNum : 0);
                                                if (nextRate > 0) {
                                                    setScanRate(String(Number(nextRate).toFixed(2)));
                                                    rateTouchedRef.current = false;
                                                }
                                            }
                                        } else {
                                            setScanAltUom('');
                                            setScanFactor('');
                                            if (!rateTouchedRef.current) {
                                                const baseFromCurrent = getBaseRateFromDisplayed(parseFloat(scanRate), scanRateUnitMode || 'BASE');
                                                const baseFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                                                const baseRate = baseFromCurrent || baseFallback;
                                                if (Number.isFinite(baseRate) && baseRate > 0) {
                                                    setScanRate(String(Number(baseRate).toFixed(2)));
                                                    rateTouchedRef.current = false;
                                                }
                                            }
                                        }
                                    }
                                } else if (parsed?.ok && !parsed?.hasUnit) {
                                    setScanQtyUnitMode('BASE');
                                    setScanRateUnitMode('BASE');
                                    setScanAltUom('');
                                    setScanFactor('');
                                    if (!rateTouchedRef.current) {
                                        const baseFromCurrent = getBaseRateFromDisplayed(parseFloat(scanRate), scanRateUnitMode || 'BASE');
                                        const baseFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                                        const baseRate = baseFromCurrent || baseFallback;
                                        if (Number.isFinite(baseRate) && baseRate > 0) {
                                            setScanRate(String(Number(baseRate).toFixed(2)));
                                            rateTouchedRef.current = false;
                                        }
                                    }
                                }
                            }}
                            onKeyDown={handleQuantityKeyDown}
                            placeholder={scanBaseUom ? `Qty (${scanBaseUom})` : 'Qty'}
                            disabled={isReceivedSto}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-center text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                        {scanQtyConfirmed && scanQtyUnitMode === 'ALT' && (
                            <div className="text-[9px] text-center text-slate-500 font-bold mt-0.5">
                                Base Qty ({scanBaseUom || 'BASE'}):{' '}
                                <span className="text-indigo-700">
                                    {(() => {
                                        const base = getScanBaseQtyFromScan();
                                        if (!base) return '0';
                                        const s = Number(base);
                                        if (!Number.isFinite(s)) return '0';
                                        return s % 1 === 0 ? String(s) : s.toFixed(3);
                                    })()}
                                </span>
                            </div>
                        )}
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
                            onChange={(e) => {
                                const val = e.target.value;
                                setScanRate(val);
                                rateTouchedRef.current = String(val || '').trim() !== '';
                                setScanRateUnitMode(scanQtyUnitMode === 'ALT' ? 'ALT' : 'BASE');
                                if (scanAmountTouchedRef.current) {
                                    setScanAmountInput('');
                                    scanAmountTouchedRef.current = false;
                                }
                            }}
                            onKeyDown={handleRateKeyDown}
                            placeholder="Rate"
                            disabled={voucherConfig?.isPriceEditable === false || isReceivedSto}
                            className={`w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm ${
                                voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                            }`}
                        />
                    </div>
                    <div className="col-span-2 py-2 border-r border-indigo-100 px-4 flex items-center justify-end">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={String(scanAmountInput || '').trim() ? scanAmountInput : getScanEnteredAmount().toFixed(2)}
                            onChange={(e) => {
                                const val = e.target.value;
                                setScanAmountInput(val);
                                scanAmountTouchedRef.current = String(val || '').trim() !== '';
                                const parsedQty = parseQtyWithUnit(scanQtyInput);
                                const qtyNum = parsedQty?.qtyNum ?? 0;
                                const amountNum = parseFloat(val);
                                if (Number.isFinite(qtyNum) && qtyNum > 0 && Number.isFinite(amountNum) && amountNum > 0) {
                                    const nextRate = amountNum / qtyNum;
                                    setScanRate(String(Number(nextRate).toFixed(2)));
                                    rateTouchedRef.current = true;
                                    setScanRateUnitMode(scanQtyUnitMode === 'ALT' ? 'ALT' : 'BASE');
                                }
                            }}
                            onFocus={() => {
                                if (String(scanAmountInput || '').trim()) return;
                                const computed = getScanEnteredAmount();
                                const next = computed > 0 ? String(Number(computed).toFixed(2)) : '';
                                setScanAmountInput(next);
                                scanAmountTouchedRef.current = Boolean(next);
                            }}
                            placeholder="Amount"
                            disabled={isReceivedSto}
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
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
                    )})}
                    
                </div>

                {/* Footer Section */}
                <div className="bg-white border-t border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
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
                                    disabled={isReceivedSto}
                                    className={`text-2xl font-black font-mono tracking-tight ${
                                        isReceivedSto ? 'text-indigo-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'
                                    }`}
                                >
                                    ₹ {Number((committedStoLedgerTotal ?? totalAllocatedWithBase) || 0).toFixed(2)}
                                </button>
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
                                <VoucherPrintButton
                                    onClick={handlePrintComingSoon}
                                    disabled={isReceivedSto}
                                    className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:text-slate-300 disabled:border-slate-200 disabled:cursor-not-allowed"
                                >
                                    {renderHotkeyLabel('Print', 'P')}
                                </VoucherPrintButton>
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
                                    disabled={isReceivedSto || isSubmitSaving}
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
                                    setTimeout(() => {
                                        narrationRef.current?.focus?.();
                                        narrationRef.current?.select?.();
                                    }, 0);
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
                    aria-label="Select To Store"
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
                                    <h3 className="font-bold text-slate-800">Select To Store</h3>
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
                                                if (val && val === fromStore) {
                                                    showMessage("From Location and To Location cannot be same", 'warning');
                                                    return;
                                                }
                                                setToStore(val);
                                                setShowFromStoreModal(false);
                                                setTimeout(() => dateRef.current?.focus?.(), 0);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                                                idx === focusedFromStoreIndex
                                                    ? 'bg-indigo-50 border border-indigo-200 ring-2 ring-indigo-500/20'
                                                    : String(toStore || '') === String(s.storeCode || '')
                                                        ? 'bg-indigo-50 border border-indigo-100'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`p-2 rounded-lg ${
                                                    idx === focusedFromStoreIndex || String(toStore || '') === String(s.storeCode || '') ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                }`}>
                                                    <Store className={`w-4 h-4 ${
                                                        idx === focusedFromStoreIndex || String(toStore || '') === String(s.storeCode || '') ? 'text-indigo-600' : 'text-slate-400'
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

            {showChangeFromStoreModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Select From Location"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowChangeFromStoreModal(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Store className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Select From Location</h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Choose a location to continue</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChangeFromStoreModal(false)}
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
                                    ref={changeFromStoreSearchInputRef}
                                    type="text"
                                    placeholder="Search store code or name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={changeFromStoreSearchQuery}
                                    onChange={(e) => {
                                        setChangeFromStoreSearchQuery(e.target.value);
                                        setFocusedChangeFromStoreIndex(0);
                                    }}
                                    onKeyDown={handleChangeFromStoreSearchKeyDown}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredChangeFromStores.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredChangeFromStores.map((s, idx) => (
                                        <button
                                            id={`sto-change-from-store-option-${idx}`}
                                            key={s.storeCode}
                                            type="button"
                                            onClick={() => applyFromStoreSelectionInteractive(s)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                                                idx === focusedChangeFromStoreIndex
                                                    ? 'bg-indigo-50 border border-indigo-200 ring-2 ring-indigo-500/20'
                                                    : String(fromStore || '') === String(s.storeCode || '')
                                                        ? 'bg-indigo-50 border border-indigo-100'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`p-2 rounded-lg ${
                                                    idx === focusedChangeFromStoreIndex || String(fromStore || '') === String(s.storeCode || '') ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                }`}>
                                                    <Store className={`w-4 h-4 ${
                                                        idx === focusedChangeFromStoreIndex || String(fromStore || '') === String(s.storeCode || '') ? 'text-indigo-600' : 'text-slate-400'
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
                                    <p className="text-sm font-medium text-slate-500">No stores found matching "{changeFromStoreSearchQuery}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setShowChangeFromStoreModal(false)}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showAltEntryModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Alternate Unit Entry"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowAltEntryModal(false);
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Qty / Unit / Rate</h3>
                            <button
                                type="button"
                                onClick={() => setShowAltEntryModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        <div className="p-4 flex flex-col gap-3">
                            <div className="grid grid-cols-12 items-center gap-3">
                                <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</div>
                                <div className="col-span-8">
                                    <input
                                        ref={altEntryQtyRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={altEntryQty}
                                        onChange={(e) => setAltEntryQty(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                altEntryUnitRef.current?.focus?.();
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</div>
                                <div className="col-span-8">
                                    <select
                                        ref={altEntryUnitRef}
                                        value={altEntryUnitMode}
                                        onChange={(e) => setAltEntryUnitMode(e.target.value === 'ALT' ? 'ALT' : 'BASE')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                altEntryRateRef.current?.focus?.();
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="BASE">{scanBaseUom || 'UOM'}</option>
                                        <option value="ALT">{scanAltUom || 'ALT'}</option>
                                    </select>
                                </div>

                                <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rate</div>
                                <div className="col-span-8">
                                    <input
                                        ref={altEntryRateRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={altEntryRate}
                                        onChange={(e) => setAltEntryRate(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                applyAltEntry();
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] min-h-[320px] flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Total Amount Allocation</h3>
                            <button
                                type="button"
                                onClick={() => setShowTotalAmountModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="Close"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
                            <div className="flex justify-end items-center text-xs text-slate-600 mb-2">
                                <span>
                                    Total Allocated:&nbsp;
                                    <span className="font-semibold text-slate-900">
                                        ₹{totalAllocatedWithBase.toFixed(2)}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <div ref={stoLedgerWrapRef} className="flex-1 relative">
                                    <input
                                        ref={stoLedgerInputRef}
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ledger Name"
                                        value={stoLedgerInput}
                                        onChange={(e) => {
                                            setStoLedgerInput(e.target.value);
                                            setStoLedgerCode('');
                                            setShowStoLedgerSuggestions(true);
                                            setFocusedStoLedgerIndex((prev) => {
                                                if (prev >= 0) return prev;
                                                return filteredStoLedgers.length ? 0 : -1;
                                            });
                                        }}
                                        onKeyDown={handleStoLedgerKeyDown}
                                        onFocus={() => {
                                            setShowStoLedgerSuggestions(true);
                                            setFocusedStoLedgerIndex((prev) => {
                                                if (prev >= 0) return prev;
                                                return filteredStoLedgers.length ? 0 : -1;
                                            });
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                const wrap = stoLedgerWrapRef.current;
                                                if (wrap && wrap.contains(document.activeElement)) return;
                                                setShowStoLedgerSuggestions(false);
                                                setFocusedStoLedgerIndex(-1);
                                            }, 0);
                                        }}
                                    />
                                    {showStoLedgerSuggestions && filteredStoLedgers.length > 0 && (
                                        <div
                                            ref={stoLedgerSuggestionsRef}
                                            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
                                        >
                                            {filteredStoLedgers.map((ledger, index) => (
                                                <div
                                                    key={ledger.code}
                                                    data-suggestion-index={index}
                                                    className={`px-3 py-1.5 text-sm cursor-pointer flex justify-between items-center ${
                                                        index === focusedStoLedgerIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectStoLedger(ledger);
                                                    }}
                                                >
                                                    <span className="text-slate-800">{ledger.name}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">{ledger.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="w-20">
                                    <input
                                        ref={stoLedgerPercRef}
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={stoLedgerPercInput}
                                        onChange={handleStoLedgerPercChange}
                                        placeholder="%"
                                    />
                                </div>
                                <div className="w-28">
                                    <input
                                        ref={stoLedgerAmountRef}
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={stoLedgerAmountInput}
                                        onChange={handleStoLedgerAmountChange}
                                        onKeyDown={handleStoLedgerAmountKeyDown}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col flex-1 min-h-0">
                                <div className="grid grid-cols-12 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-8 px-3 py-2">Ledger</div>
                                    <div className="col-span-2 px-3 py-2 text-right">%</div>
                                    <div className="col-span-2 px-3 py-2 text-right">Amount</div>
                                </div>
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    {stoLedgerRows.length === 0 ? (
                                        <div className="px-3 py-10 text-center text-sm text-slate-500">No ledgers added</div>
                                    ) : (
                                        stoLedgerRows.map((row, idx) => (
                                            <div key={`${row.ledgerCode}-${idx}`} className="grid grid-cols-12 border-t border-slate-100 text-sm items-center">
                                                <div className="col-span-8 px-3 py-2 flex items-center justify-between gap-3">
                                                    <span className="text-slate-800">{stoLedgerNameByCode.get(row.ledgerCode) || row.ledgerName || row.ledgerCode}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">{row.ledgerCode}</span>
                                                </div>
                                                <div className="col-span-2 px-3 py-2 text-right font-mono text-slate-600">
                                                    {Number(row?.perc || 0).toFixed(2)}
                                                </div>
                                                <div className="col-span-2 px-3 py-2 text-right font-mono font-semibold text-slate-800 flex items-center justify-end gap-2">
                                                    <span>{Number(row?.amount || 0).toFixed(2)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setStoLedgerRows(prev => prev.filter((_, i) => i !== idx))}
                                                        className="text-rose-600 hover:text-rose-700"
                                                        aria-label="Delete"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleTotalAmountModalDone}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full shadow-sm"
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
