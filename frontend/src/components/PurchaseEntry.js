import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ScanBarcode, Trash2, Save, X, ArrowLeft, Plus, Store, User, Search, FileText, Pencil } from 'lucide-react';
import DateInputButton from './DateInputButton';
import { formatVoucherQty } from './uomDisplay';
import VoucherPrintButton from './VoucherPrintButton';
import { getLastVoucherDateAll, normalizeToIsoDate, setLastVoucherDateAll, todayIsoDate } from './dateUtils';

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

export const PurchaseLikeEntry = ({
    apiBase = '/api/purchase',
    voucherType = 'PURCHASE',
    lastVoucherKeyBase = 'purchase',
    title = 'Purchase Voucher',
    successName = 'Purchase'
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
    const lockedStoreCode = String(searchParams.get('storeCode') || '').trim();
    const storeLocked = searchParams.get('lockedStore') === 'true' && !!lockedStoreCode;
    const isEditFromQuery = searchParams.get('mode') === 'edit' && !!String(searchParams.get('invoiceNo') || '').trim();
    const userRole = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}')?.role || '';
        } catch {
            return '';
        }
    }, []);
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

    const partySuggestWrapRef = useRef(null);
    const purchaseLedgerSuggestWrapRef = useRef(null);
    const showPartySuggestionsRef = useRef(false);
    const showPurchaseLedgerSuggestionsRef = useRef(false);

    // #region debug-point A:purchase-esc-report
    const reportPurchaseEscDebug = useCallback((hypothesisId, msg, data = {}) => {
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'purchase-esc-search',
                runId: 'post-fix',
                hypothesisId,
                location: 'frontend/src/components/PurchaseEntry.js',
                msg: `[DEBUG] ${msg}`,
                data,
                ts: Date.now()
            })
        }).catch(() => {});
    }, []);
    // #endregion

    const requestCloseParentModal = useCallback(() => {
        if (!isEmbedded()) return;
        try {
            window.parent.postMessage({ type: 'RG_CLOSE_VOUCHER_MODAL' }, window.location.origin);
        } catch {
            window.parent.postMessage({ type: 'RG_CLOSE_VOUCHER_MODAL' }, '*');
        }
    }, [isEmbedded]);

    const isHeaderSearchEscapeContext = () => {
        return Boolean(
            showPartySuggestionsRef.current ||
            showPurchaseLedgerSuggestionsRef.current
        );
    };

    const gridHasItemsRef = useRef(false);
    const exitConfirmOpenRef = useRef(false);

    useEffect(() => {
        // #region debug-point B:purchase-esc-event-order
        const reportRawEscape = (phase) => (e) => {
            if (e.key !== 'Escape') return;
            const activeElement = document.activeElement;
            const inParty = Boolean(
                activeElement &&
                partySuggestWrapRef.current &&
                partySuggestWrapRef.current.contains(activeElement)
            );
            const inPurchaseLedger = Boolean(
                activeElement &&
                purchaseLedgerSuggestWrapRef.current &&
                purchaseLedgerSuggestWrapRef.current.contains(activeElement)
            );
            if (!inParty && !inPurchaseLedger && !showPartySuggestionsRef.current && !showPurchaseLedgerSuggestionsRef.current) return;
            reportPurchaseEscDebug(phase === 'capture' ? 'B' : 'C', `Raw Escape ${phase}`, {
                key: e.key,
                defaultPrevented: e.defaultPrevented,
                activeTag: activeElement?.tagName || '',
                activeId: activeElement?.id || '',
                activeName: activeElement?.getAttribute?.('name') || '',
                activePlaceholder: activeElement?.getAttribute?.('placeholder') || '',
                inParty,
                inPurchaseLedger,
                showPartySuggestions: showPartySuggestionsRef.current,
                showPurchaseLedgerSuggestions: showPurchaseLedgerSuggestionsRef.current
            });
        };
        const onCapture = reportRawEscape('capture');
        const onBubble = reportRawEscape('bubble');
        document.addEventListener('keydown', onCapture, true);
        document.addEventListener('keydown', onBubble);
        return () => {
            document.removeEventListener('keydown', onCapture, true);
            document.removeEventListener('keydown', onBubble);
        };
        // #endregion
    }, [reportPurchaseEscDebug]);

    useEffect(() => {
        if (!isEmbedded()) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            // #region debug-point D:purchase-esc-embedded-global
            const headerEscapeContext = isHeaderSearchEscapeContext();
            reportPurchaseEscDebug('D', 'Embedded global Escape handler', {
                defaultPrevented: e.defaultPrevented,
                headerEscapeContext,
                activePlaceholder: document.activeElement?.getAttribute?.('placeholder') || '',
                showPartySuggestions: showPartySuggestionsRef.current,
                showPurchaseLedgerSuggestions: showPurchaseLedgerSuggestionsRef.current
            });
            // #endregion
            if (headerEscapeContext) return;
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
            // #region debug-point E:purchase-esc-document-global
            const headerEscapeContext = isHeaderSearchEscapeContext();
            reportPurchaseEscDebug('E', 'Document global Escape handler', {
                defaultPrevented: e.defaultPrevented,
                headerEscapeContext,
                activePlaceholder: document.activeElement?.getAttribute?.('placeholder') || '',
                showPartySuggestions: showPartySuggestionsRef.current,
                showPurchaseLedgerSuggestions: showPurchaseLedgerSuggestionsRef.current
            });
            // #endregion
            if (headerEscapeContext) return;
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
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isEmbedded, navigate]);

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
    const lastVoucherDateGlobalKey = `RG_lastVoucherDate:${lastVoucherKeyBase}`;
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [partySearchInput, setPartySearchInput] = useState('');
    const [showPartySuggestions, setShowPartySuggestions] = useState(false);
    const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);
    const [purchaseLedgers, setPurchaseLedgers] = useState([]);
    const [partySearchLedgers, setPartySearchLedgers] = useState([]);
    const [selectedPurchaseLedger, setSelectedPurchaseLedger] = useState('');
    const [purchaseLedgerSearchInput, setPurchaseLedgerSearchInput] = useState('');
    const [showPurchaseLedgerSuggestions, setShowPurchaseLedgerSuggestions] = useState(false);
    const [focusedPurchaseLedgerSuggestionIndex, setFocusedPurchaseLedgerSuggestionIndex] = useState(-1);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [voucherStoreCode, setVoucherStoreCode] = useState('');
    const [partyInvoiceNo, setPartyInvoiceNo] = useState('');
    const [narration, setNarration] = useState('');
    const [storeInfo, setStoreInfo] = useState(null);
    const isStoreUserBusinessDateLocked =
        String(userRole || '').trim().toUpperCase() === 'STORE USER' &&
        storeInfo?.isDsrDisabled === false;
    const [userStores, setUserStores] = useState([]); // Stores mapped to current user
    const [voucherConfig, setVoucherConfig] = useState(null);
    const [voucherConfigLoaded, setVoucherConfigLoaded] = useState(false);
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
    const [isSubmitSaving, setIsSubmitSaving] = useState(false);
    const isSubmitSavingRef = useRef(false);
    const handleDeleteRef = useRef(null);
    const footerModalStateRef = useRef({ store: false, invoice: false });
    const [showPriceListModal, setShowPriceListModal] = useState(false);
    const [priceListModalHref, setPriceListModalHref] = useState('');
    const [priceListModalTitle, setPriceListModalTitle] = useState('Price List');

    // Draft State
    const [draftVouchers, setDraftVouchers] = useState([]);
    const [selectedDraftId, setSelectedDraftId] = useState(''); // Store Invoice No actually as per API

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [gridRows, setGridRows] = useState([]);
    gridHasItemsRef.current = Array.isArray(gridRows) && gridRows.length > 0;
    const gridRowsRef = useRef([]);
    const scanItemCodeRef = useRef('');
    const scanSearchInputRef = useRef('');
    const editingRowIndexRef = useRef(null);
    const showPriceListModalRef = useRef(false);

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    
    const [scanRate, setScanRate] = useState(''); // Purchase Rate
    const [scanQtyInput, setScanQtyInput] = useState(''); // Quantity
    const [scanMrp, setScanMrp] = useState(''); // MRP (Hidden but kept in state if needed)
    const [scanBaseUom, setScanBaseUom] = useState('');
    const [scanAltUom, setScanAltUom] = useState('');
    const [scanFactor, setScanFactor] = useState('');
    const [scanQtyUnitMode, setScanQtyUnitMode] = useState('BASE');
    const [scanRateUnitMode, setScanRateUnitMode] = useState('BASE');
    const scanUomInfoRef = useRef({ baseUom: '', options: [] });
    const defaultBaseRateRef = useRef(0);
    const rateTouchedRef = useRef(false);
    const [scanAmountInput, setScanAmountInput] = useState('');
    const scanAmountTouchedRef = useRef(false);
    
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
    const sizeAutoShowAllRef = useRef(false);
    
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    const partyInputRef = useRef(null);
    const purchaseLedgerSelectedCodeRef = useRef('');
    const purchaseLedgerRef = useRef(null);
    const partyInvoiceRef = useRef(null);
    const narrationRef = useRef(null);
    const priceListRef = useRef(null);
    const scanAmountRef = useRef(null);
    const addItemBtnRef = useRef(null);

    showPartySuggestionsRef.current = showPartySuggestions;
    showPurchaseLedgerSuggestionsRef.current = showPurchaseLedgerSuggestions;

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
    const partySelectedCodeRef = useRef('');
    const initialScanFocusDoneRef = useRef(false);
    
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

    useEffect(() => {
        if (scanAmountTouchedRef.current) return;
        const r = parseFloat(scanRate);
        const raw = String(scanQtyInput || '').trim();
        const m = raw.match(/^(\d+(?:\.\d*)?|\.\d+)\s*([a-zA-Z]+)?$/);
        const q = m ? parseFloat(m[1]) : NaN;
        if (!Number.isFinite(r) || !Number.isFinite(q)) {
            setScanAmountInput('');
            return;
        }
        const next = (Math.max(0, r) * Math.max(0, q)).toFixed(2);
        if (scanAmountInput !== next) setScanAmountInput(next);
    }, [scanRate, scanQtyInput, scanAmountInput]);

    const invoiceScanLedgerRef = useRef(null);
    const invoiceScanPercRef = useRef(null);
    const invoiceScanAmountRef = useRef(null);
    const invoiceScanAmountTouchedRef = useRef(false);
    const invoiceScanPercTouchedRef = useRef(false);
    const invoiceScanLedgerWrapRef = useRef(null);
    const invoiceLedgerSuggestionsRef = useRef(null);

    const [uoms, setUoms] = useState([]);
    const uomNameByCode = useMemo(() => {
        const map = new Map();
        const list = Array.isArray(uoms) ? uoms : [];
        list.forEach(u => {
            const code = String(u?.code || '').trim();
            if (!code) return;
            const name = String(u?.name || '').trim();
            map.set(code.toLowerCase(), name || code);
        });
        return map;
    }, [uoms]);

    const getUomLabel = useCallback((codeRaw) => {
        const code = String(codeRaw || '').trim();
        if (!code) return '';
        return uomNameByCode.get(code.toLowerCase()) || code;
    }, [uomNameByCode]);

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

    const getInvoiceLedgerDisplayName = React.useCallback((code, currentName) => {
        const resolved = resolveInvoiceLedger(code, currentName);
        return String(resolved?.name || currentName || code || '').trim();
    }, [resolveInvoiceLedger]);

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

    const getLastVoucherDateKeyForStore = useCallback((storeCode) => {
        const sc = String(storeCode || '').trim();
        return sc ? `RG_lastVoucherDate:${lastVoucherKeyBase}:${sc}` : lastVoucherDateGlobalKey;
    }, [lastVoucherDateGlobalKey, lastVoucherKeyBase]);

    const effectivePricingMethod = priceListMethod || voucherConfig?.pricingMethod || 'PURCHASE_PRICE';

    const getRateForMethod = (priceInfo, method) => {
        if (!priceInfo) return '';
        if (method === 'MRP') return priceInfo.mrp || '';
        if (method === 'SALE_PRICE') return priceInfo.salePrice || '';
        return priceInfo.purchasePrice || '';
    };

    const getEffectiveRate = (priceInfo) => getRateForMethod(priceInfo, effectivePricingMethod);

    const itemPriceBySizeCode = useMemo(() => {
        const map = new Map();
        const list = Array.isArray(itemPrices) ? itemPrices : [];
        list.forEach((p) => {
            const key = String(p?.sizeCode || '').trim();
            if (!key) return;
            map.set(key, p);
        });
        return map;
    }, [itemPrices]);

    const sizeHasPriceForMethod = useCallback((size) => {
        const key = String(size?.code || '').trim();
        if (!key) return false;
        const priceInfo = itemPriceBySizeCode.get(key);
        if (!priceInfo) return false;
        const n = parseFloat(getEffectiveRate(priceInfo));
        return Number.isFinite(n) && n > 0;
    }, [effectivePricingMethod, itemPriceBySizeCode]);

    const getScanFactorNumber = useCallback(() => {
        const n = parseFloat(scanFactor);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [scanFactor]);

    const getAltRateForMethod = useCallback((option, method) => {
        if (!option) return '';
        if (method === 'MRP') return option.mrp ?? '';
        if (method === 'SALE_PRICE') return option.salePrice ?? '';
        return option.purchasePrice ?? '';
    }, []);

    const getBaseRateFromDisplayed = useCallback((displayedRate, unitMode) => {
        const r = Number(displayedRate);
        if (!Number.isFinite(r) || r <= 0) return 0;
        if (unitMode === 'ALT') {
            const f = getScanFactorNumber();
            if (!f) return 0;
            return r / f;
        }
        return r;
    }, [getScanFactorNumber]);

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
    }, [getUnitTokenFromUomCode, normalizeUnitToken, scanBaseUom]);

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

    const syncRateForUnitMode = useCallback((nextUnitMode) => {
        const prevUnitMode = scanRateUnitMode === 'ALT' ? 'ALT' : 'BASE';
        const currentRateNum = parseFloat(scanRate);
        const baseRateFromCurrent = getBaseRateFromDisplayed(currentRateNum, prevUnitMode);
        const baseRateFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
        const baseRate = baseRateFallback || baseRateFromCurrent;

        if (nextUnitMode === 'ALT') {
            const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
            let selected = null;
            if (scanAltUom) {
                selected = options.find(o => String(o?.altUom || '').trim().toLowerCase() === String(scanAltUom).trim().toLowerCase()) || null;
            }
            if (!selected && options.length) {
                selected = options[0];
                const nextAlt = String(selected?.altUom || '').trim();
                const nextFactor = selected?.factor !== undefined && selected?.factor !== null ? String(selected.factor) : '';
                if (nextAlt) setScanAltUom(nextAlt);
                if (nextFactor) setScanFactor(nextFactor);
            }

            const optRateRaw = getAltRateForMethod(selected, effectivePricingMethod);
            const optRateNum = parseFloat(optRateRaw);
            const nextDisplayedRate = (Number.isFinite(optRateNum) && optRateNum > 0) ? optRateNum : 0;

            if ((!rateTouchedRef.current || !String(scanRate || '').trim()) && nextDisplayedRate > 0) {
                setScanRate(String(Number(nextDisplayedRate).toFixed(2)));
                rateTouchedRef.current = false;
            }
            if ((!rateTouchedRef.current || !String(scanRate || '').trim()) && nextDisplayedRate <= 0) {
                setScanRate('');
                rateTouchedRef.current = false;
            }
            setScanRateUnitMode('ALT');
            return;
        }

        if ((!rateTouchedRef.current || !String(scanRate || '').trim()) && baseRate > 0) {
            setScanRate(String(Number(baseRate).toFixed(2)));
            rateTouchedRef.current = false;
        }
        setScanRateUnitMode('BASE');
    }, [
        effectivePricingMethod,
        getAltRateForMethod,
        getBaseRateFromDisplayed,
        scanAltUom,
        scanRate,
        scanRateUnitMode
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

            if (!scanAltUom && options.length) {
                const firstOpt = options[0];
                setScanAltUom(String(firstOpt.altUom || '').trim());
                setScanFactor(firstOpt.factor !== undefined && firstOpt.factor !== null ? String(firstOpt.factor) : '');
            }

            return next;
        } catch {
            return null;
        }
    }, [scanAltUom, scanBaseUom]);

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
        const explicitRateMode = String(row?.rateUnitMode || '').trim().toUpperCase();
        const quantityNum = Number(row?.quantity);
        const rateNum = Number(row?.rate);
        const derivedAltQty = hasAltConversion && Number.isFinite(quantityNum) ? (quantityNum / factorNum) : NaN;
        const canUseAlt =
            hasAltConversion &&
            Number.isFinite(derivedAltQty) &&
            Math.abs(derivedAltQty - Math.round(derivedAltQty)) < 1e-9;

        let qtyUnitMode = explicitQtyMode === 'ALT' && hasAltConversion ? 'ALT' : 'BASE';
        if (!explicitQtyMode && canUseAlt) qtyUnitMode = 'ALT';

        let rateUnitMode = explicitRateMode === 'ALT' && hasAltConversion ? 'ALT' : 'BASE';
        if (!explicitRateMode && qtyUnitMode === 'ALT' && canUseAlt) rateUnitMode = 'ALT';

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
            rateUnitMode,
            displayQuantity,
            enteredRate
        };
    }, []);

    const enrichGridRowsWithUom = useCallback(async (rowsRaw) => {
        const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
        if (!rows.length) return;

        const cache = new Map();
        const tasks = rows.map(async (r) => {
            const itemCode = String(r?.itemCode || '').trim();
            const sizeCode = String(r?.size || r?.sizeCode || '').trim();
            if (!itemCode || !sizeCode) return { key: null, info: null };
            const key = `${itemCode}__${sizeCode}`;
            if (cache.has(key)) return { key, info: cache.get(key) };
            const info = await fetchUomInfoForRow(itemCode, sizeCode);
            cache.set(key, info);
            return { key, info };
        });

        const resolved = await Promise.all(tasks);
        const infoByKey = new Map(resolved.filter(x => x.key).map(x => [x.key, x.info]));

        setGridRows((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            if (current.length !== rows.length) return prev;

            return current.map((r) => {
                const itemCode = String(r?.itemCode || '').trim();
                const sizeCode = String(r?.size || r?.sizeCode || '').trim();
                const key = itemCode && sizeCode ? `${itemCode}__${sizeCode}` : '';
                const info = key ? infoByKey.get(key) : null;

                const nextBaseUom = String(r?.baseUom || info?.baseUom || '').trim() || 'PCS';
                const nextAltUom = String(r?.altUom || info?.altUom || '').trim();
                const nextFactor = r?.factor !== undefined && r?.factor !== null ? String(r.factor) : (info?.factor || '');
                const derivedDisplay = deriveLoadedRowDisplayValues(r, nextAltUom, nextFactor);

                return {
                    ...r,
                    baseUom: nextBaseUom,
                    altUom: nextAltUom,
                    factor: nextFactor,
                    qtyUnitMode: derivedDisplay.qtyUnitMode,
                    rateUnitMode: derivedDisplay.rateUnitMode,
                    displayQuantity: derivedDisplay.displayQuantity,
                    enteredRate: derivedDisplay.enteredRate
                };
            });
        });
    }, [deriveLoadedRowDisplayValues, fetchUomInfoForRow]);

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchPurchaseLedgers();
        fetchPartySearchLedgers();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchVoucherConfig();
        fetchInvoiceValueLedgers();
        fetchDraftVouchers();
        fetchUoms();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const invoiceNoParam = params.get('invoiceNo');
        const mode = params.get('mode');
        if (!invoiceNoParam || (mode !== 'edit' && mode !== 'duplicate')) {
            setIsEditMode(false);
            return;
        }

        const load = async () => {
            try {
                setIsEditMode(mode === 'edit');
                const token = localStorage.getItem('token');
                const res = await axios.get(`${apiBase}/details/${encodeURIComponent(invoiceNoParam)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = res.data;
                if (!data) return;

                const storeCode = String(data.storeCode || lockedStoreCode || '').trim();
                if (mode === 'edit') {
                    setInvoiceNo(data.invoiceNo);
                } else {
                    setInvoiceNo('');
                }
                setVoucherStoreCode(storeCode);
                if (mode === 'duplicate' && storeCode) {
                    const match = (userStores || []).find(s => String(s?.storeCode || '').trim() === storeCode);
                    if (match) setStoreInfo(match);
                    fetchNextInvoiceNo(storeCode);
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
                enrichGridRowsWithUom(newRows);

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
                if (mode === 'edit') {
                    if (data.id) setDraftId(data.id);
                } else {
                    setDraftId(null);
                }
                setSelectedDraftId('');
                initialScanFocusDoneRef.current = false;
                requestAnimationFrame(() => partyInputRef.current?.focus?.());
            } catch (e) {
                console.error('Error loading voucher', e);
                showMessage('Error loading voucher', 'error');
            }
        };

        load();
    }, [location.search, lockedStoreCode, storeLocked]);

    useEffect(() => {
        if (initialScanFocusDoneRef.current) return;
        if (!voucherStoreCode) return;
        if (showStoreModal || showDateEntryModal || showInvoiceValueModal) return;
        initialScanFocusDoneRef.current = true;
        requestAnimationFrame(() => partyInputRef.current?.focus?.());
    }, [voucherStoreCode, showStoreModal, showDateEntryModal, showInvoiceValueModal]);

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

    useEffect(() => {
        if (focusedPartySuggestionIndex >= 0 && showPartySuggestions) {
            const element = document.getElementById(`suggestion-party-${focusedPartySuggestionIndex}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedPartySuggestionIndex, showPartySuggestions]);

    useEffect(() => {
        if (focusedPurchaseLedgerSuggestionIndex >= 0 && showPurchaseLedgerSuggestions) {
            const element = document.getElementById(`suggestion-purchase-ledger-${focusedPurchaseLedgerSuggestionIndex}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedPurchaseLedgerSuggestionIndex, showPurchaseLedgerSuggestions]);

    // --- API Calls ---
    const fetchDraftVouchers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${apiBase}/drafts`, {
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
            const res = await axios.get(`${apiBase}/details-by-id/${selectedId}`, {
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
            enrichGridRowsWithUom(newRows);

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
            const response = await axios.delete(`${apiBase}/drafts/${encodeURIComponent(selectedDraft.invoiceNo)}`, {
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

    const applyStoreSelection = async (store) => {
        if (!store?.storeCode) return;
        if (voucherStoreCode === store.storeCode) {
            setShowStoreModal(false);
            return;
        }

        const hasUnsaved =
            (Array.isArray(gridRows) && gridRows.length > 0) ||
            (Array.isArray(invoiceValueRows) && invoiceValueRows.length > 0) ||
            !!String(invoiceNo || '').trim() ||
            !!String(partyInvoiceNo || '').trim() ||
            !!String(narration || '').trim() ||
            !!String(invoiceValue || '').trim() ||
            !!String(selectedParty || '').trim() ||
            !!String(selectedPurchaseLedger || '').trim() ||
            !!draftId ||
            !!selectedDraftId;

        if (hasUnsaved) {
            const result = await Swal.fire({
                title: 'Change Store?',
                text: isEditMode
                    ? 'Store will be changed for this voucher. Voucher details will remain.'
                    : 'Store will be changed for this voucher. Voucher details will remain.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Change',
                cancelButtonText: 'Cancel',
                customClass: { container: 'z-[10001]' }
            });
            if (!result.isConfirmed) return;
        }

        const selectedCode = store.storeCode;
        setVoucherStoreCode(selectedCode);
        setStoreInfo(store);
        if (!isEditMode && String(userRole || '').trim().toUpperCase() === 'STORE USER') {
            const iso =
                store?.isDsrDisabled === false && store?.businessDate
                    ? formatDateForInput(store.businessDate)
                    : formatDateForInput(new Date());
            if (iso) setInvoiceDate(iso);
        }

        if (isEditMode) {
            setShowStoreModal(false);
            setTimeout(() => scanInputRef.current?.focus?.(), 0);
            return;
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
        setStoreSearchQuery('');
        const all = Array.isArray(userStores) ? userStores : [];
        const idx = voucherStoreCode ? all.findIndex(s => s?.storeCode === voucherStoreCode) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus(), 100);
    }, [userStores, voucherStoreCode]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [openStoreModal]);

    useEffect(() => {
        if (!voucherStoreCode) return;
        const all = Array.isArray(userStores) ? userStores : [];
        const match = all.find(s => s?.storeCode === voucherStoreCode);
        if (match && match?.storeCode !== storeInfo?.storeCode) {
            setStoreInfo(match);
        }
    }, [voucherStoreCode, userStores]);

    useEffect(() => {
        if (!showStoreModal) return;
        if (focusedStoreIndex < 0) return;
        const el = document.getElementById(`store-option-${focusedStoreIndex}`);
        if (el && typeof el.scrollIntoView === 'function') {
            try {
                el.scrollIntoView({ block: 'nearest' });
            } catch {}
        }
    }, [showStoreModal, focusedStoreIndex, storeSearchQuery]);

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

    const fetchPurchaseLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/led-masters/by-group-names', {
                params: { names: 'Purchase Accounts,Sales Accounts' },
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.success) {
                setPurchaseLedgers(response.data.ledMasters || []);
            } else {
                setPurchaseLedgers([]);
            }
        } catch (error) {
            console.error("Error fetching purchase ledgers", error);
            setPurchaseLedgers([]);
        }
    };

    const fetchPartySearchLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/ledgers', { headers: { 'Authorization': `Bearer ${token}` } });
            const allLedgers = Array.isArray(res.data) ? res.data : [];

            const seen = new Set();
            const combined = allLedgers
                .filter(l => {
                    const code = String(l?.code ?? '').trim();
                    if (!code) return false;
                    const status = l?.status;
                    const isActive = status == null || status === 1 || status === true;
                    if (!isActive) return false;
                    const type = String(l?.type ?? '').trim().toLowerCase();
                    return type === 'purchase' || type === 'sale';
                })
                .filter(l => {
                    const code = String(l?.code ?? '').trim();
                    if (seen.has(code)) return false;
                    seen.add(code);
                    return true;
                });

            setPartySearchLedgers(combined);
        } catch (error) {
            console.error("Error fetching party search ledgers", error);
            setPartySearchLedgers([]);
        }
    };

    const fetchParties = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/led-masters/by-group-names', {
                params: { names: 'Sundry Debtors,Sundry Creditors' },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                setParties(response.data.ledMasters || []);
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
                const token = localStorage.getItem('token');
                const response = await axios.get(
                    `/api/stores/by-user/${encodeURIComponent(user.userName)}`,
                    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
                );
                const all = (response.data?.success && Array.isArray(response.data.stores)) ? response.data.stores : [];
                // #region debug-point A:purchase-store-bootstrap
                fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"warehouse-store-pill",runId:"pre-fix",hypothesisId:"A",location:"PurchaseEntry.js:fetchStoreInfo",msg:"[DEBUG] Purchase store bootstrap",data:{userName:String(user.userName||""),role:String(user.role||""),mappedCount:Array.isArray(all)?all.length:-1,firstStore:String(all?.[0]?.storeCode||""),storeLocked:Boolean(storeLocked),lockedStoreCode:String(lockedStoreCode||""),isEditFromQuery:Boolean(isEditFromQuery)},ts:Date.now()})}).catch(()=>{});
                // #endregion

                setUserStores(all);

                if (storeLocked && lockedStoreCode) {
                    const match = all.find(st => String(st?.storeCode || '').trim() === lockedStoreCode);
                    setStoreInfo(match || { storeCode: lockedStoreCode, storeName: lockedStoreCode });
                    setVoucherStoreCode(lockedStoreCode);
                    return;
                }

                if (all.length === 0) {
                    setStoreInfo(null);
                    if (!isEditFromQuery) setVoucherStoreCode('');
                    return;
                }

                const fallback = all[0];
                setStoreInfo(fallback);
                if (!isEditFromQuery) {
                    setVoucherStoreCode(fallback.storeCode);
                }

                const params = new URLSearchParams(location.search || '');
                const mode = params.get('mode');
                if (mode !== 'edit' && !voucherDateInitializedRef.current) {
                    voucherDateInitializedRef.current = true;
                    let iso = '';
                    const isLocked =
                        String(userRole || '').trim().toUpperCase() === 'STORE USER' &&
                        fallback?.isDsrDisabled === false;
                    if (isLocked && fallback.businessDate) {
                        iso = formatDateForInput(fallback.businessDate);
                    } else {
                        const isStoreUser = String(userRole || '').trim().toUpperCase() === 'STORE USER';
                        if (isStoreUser) {
                            iso = formatDateForInput(new Date());
                        } else {
                            const stored = getLastVoucherDateAll() || normalizeToIsoDate(localStorage.getItem(lastVoucherDateGlobalKey));
                            if (stored) {
                                iso = stored;
                                setLastVoucherDateAll(stored);
                            } else {
                                iso = todayIsoDate();
                            }
                        }
                    }
                    if (iso) setInvoiceDate(iso);
                }
                if (fallback.storeCode) {
                    if (mode !== 'edit' && (!invoiceNo || invoiceNo === 'New')) {
                        fetchNextInvoiceNo(fallback.storeCode);
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
            if (isStoreUserBusinessDateLocked) return;
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isStoreUserBusinessDateLocked]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode === 'edit') return;
        if (!isStoreUserBusinessDateLocked) return;
        const iso = formatDateForInput(storeInfo?.businessDate);
        if (!iso) return;
        if (invoiceDate !== iso) setInvoiceDate(iso);
    }, [invoiceDate, isStoreUserBusinessDateLocked, location.search, storeInfo?.businessDate]);

    useEffect(() => {
        if (!addModeRef.current) return;
        if (!invoiceDate) return;
        if (String(userRole || '').trim().toUpperCase() === 'STORE USER') return;
        setLastVoucherDateAll(invoiceDate);
    }, [invoiceDate, userRole]);

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
            if (e.ctrlKey || e.metaKey) return;
            const isAltOnly = e.altKey && !e.shiftKey;
            const isShiftOnly = e.shiftKey && !e.altKey;
            if (!isAltOnly && !isShiftOnly) return;
            const key = String(e.key || '').toLowerCase();
            if (!key) return;
            if (footerModalStateRef.current.store || footerModalStateRef.current.invoice) return;
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

    const fetchNextInvoiceNo = async (storeCode) => {
        try {
            const token = localStorage.getItem('token');
            const params = storeCode ? { storeCode } : {};
            const response = await axios.get(`${apiBase}/generate-invoice-no`, {
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
            const response = await axios.get(`/api/voucher-config/${encodeURIComponent(voucherType)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                const config = response.data.config;
                setVoucherConfig(config);
                setPriceListMethod(prev => prev || config?.pricingMethod || 'PURCHASE_PRICE');
            }
        } catch (error) {
            console.error("Error fetching voucher config", error);
        } finally {
            setVoucherConfigLoaded(true);
        }
    };

    const fetchInvoiceValueLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const screen = (() => {
                const vt = String(voucherType || '').trim();
                if (!vt) return 'Purchase';
                return vt.slice(0, 1).toUpperCase() + vt.slice(1).toLowerCase();
            })();

            const [ledgersRes, mastersRes] = await Promise.all([
                axios.get(`/api/ledgers/screen/${encodeURIComponent(screen)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                }),
                axios.get('/api/led-masters', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                })
            ]);

            const allowed = Array.isArray(ledgersRes?.data) ? ledgersRes.data : [];
            const masters = (mastersRes?.data && mastersRes.data.success) ? (mastersRes.data.ledMasters || []) : [];
            const nameByCode = new Map(
                masters
                    .map(m => ({ code: String(m?.code || '').trim(), name: String(m?.name || '').trim() }))
                    .filter(x => x.code)
                    .map(x => [x.code, x.name])
            );

            const activeAllowed = allowed.filter(l => l?.status === 1 || l?.status === true);
            const mapped = activeAllowed.map(l => {
                const code = String(l?.code || '').trim();
                const masterName = code ? nameByCode.get(code) : '';
                const fallbackName = String(l?.name || '').trim();
                return {
                    ...l,
                    code,
                    name: masterName || fallbackName || code
                };
            });

            const sorted = mapped.sort((a, b) => {
                const ao = Number.isFinite(Number(a?.shortOrder)) ? Number(a.shortOrder) : Number.MAX_SAFE_INTEGER;
                const bo = Number.isFinite(Number(b?.shortOrder)) ? Number(b.shortOrder) : Number.MAX_SAFE_INTEGER;
                if (ao !== bo) return ao - bo;
                return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
            });

            setInvoiceValueLedgers(sorted);
        } catch (error) {
            console.error("Error fetching invoice value ledgers", error);
            setInvoiceValueLedgers([]);
        }
    };

    const partyLedgerSuggestionSource = useMemo(() => {
        const combined = [...(invoiceValueLedgers || []), ...(partySearchLedgers || [])];
        const seen = new Set();
        return combined.filter(l => {
            const code = String(l?.code ?? '').trim();
            if (!code) return false;
            if (seen.has(code)) return false;
            seen.add(code);
            const status = l?.status;
            const isActive = status == null || status === 1 || status === true;
            return isActive;
        });
    }, [invoiceValueLedgers, partySearchLedgers]);

    const partySuggestionResults = useMemo(() => {
        const q = String(partySearchInput || '').trim().toLowerCase();

        const list = (parties || [])
            .filter(p => {
                if (!q) return true;
                const name = String(p?.name || '').toLowerCase();
                const code = String(p?.code || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            })
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
            .slice(0, 60)
            .map(p => ({
                key: `P:${p.code}`,
                source: 'Ledger Master',
                code: String(p.code || '').trim(),
                name: String(p.name || '').trim()
            }))
            .filter(x => x.code);

        return list;
    }, [partySearchInput, parties]);

    const purchaseLedgerSuggestionResults = useMemo(() => {
        const q = String(purchaseLedgerSearchInput || '').trim().toLowerCase();

        return (purchaseLedgers || [])
            .filter(l => {
                if (!q) return true;
                const name = String(l?.name || '').toLowerCase();
                const code = String(l?.code || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            })
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
            .slice(0, 60)
            .map(l => ({
                key: `PL:${l.code}`,
                code: String(l.code || '').trim(),
                name: String(l.name || '').trim()
            }))
            .filter(x => x.code);
    }, [purchaseLedgerSearchInput, purchaseLedgers]);

    useEffect(() => {
        const code = String(selectedParty || '').trim();
        if (!code) {
            setPartySearchInput('');
            partySelectedCodeRef.current = '';
            return;
        }
        if (partySelectedCodeRef.current === code) return;

        const partyMatch = (parties || []).find(p => String(p?.code || '').trim() === code);
        const nextLabel = String(partyMatch?.name || code).trim();
        setPartySearchInput(nextLabel);
        partySelectedCodeRef.current = code;
    }, [selectedParty, parties]);

    useEffect(() => {
        const code = String(selectedPurchaseLedger || '').trim();
        if (!code) {
            setPurchaseLedgerSearchInput('');
            purchaseLedgerSelectedCodeRef.current = '';
            return;
        }
        if (purchaseLedgerSelectedCodeRef.current === code) return;

        const purchaseLedgerMatch = (purchaseLedgers || []).find(l => String(l?.code || '').trim() === code);
        const nextLabel = String(purchaseLedgerMatch?.name || code).trim();
        setPurchaseLedgerSearchInput(nextLabel);
        purchaseLedgerSelectedCodeRef.current = code;
    }, [selectedPurchaseLedger, purchaseLedgers]);

    const handlePartyInputChange = (e) => {
        const value = e.target.value;
        setPartySearchInput(value);
        setSelectedParty('');
        partySelectedCodeRef.current = '';
        setFocusedPartySuggestionIndex(-1);
        setShowPartySuggestions(true);
    };

    const handleSelectPartySuggestion = (row) => {
        const code = String(row?.code || '').trim();
        const name = String(row?.name || '').trim();
        if (!code) return;
        setSelectedParty(code);
        setPartySearchInput(name || code);
        partySelectedCodeRef.current = code;
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
        setTimeout(() => {
            try {
                purchaseLedgerRef.current?.focus?.();
            } catch {}
        }, 0);
    };

    const handlePurchaseLedgerInputChange = (e) => {
        const value = e.target.value;
        setPurchaseLedgerSearchInput(value);
        setSelectedPurchaseLedger('');
        purchaseLedgerSelectedCodeRef.current = '';
        setFocusedPurchaseLedgerSuggestionIndex(-1);
        setShowPurchaseLedgerSuggestions(true);
    };

    const handleSelectPurchaseLedgerSuggestion = (row) => {
        const code = String(row?.code || '').trim();
        const name = String(row?.name || '').trim();
        if (!code) return;
        setSelectedPurchaseLedger(code);
        setPurchaseLedgerSearchInput(name || code);
        purchaseLedgerSelectedCodeRef.current = code;
        setShowPurchaseLedgerSuggestions(false);
        setFocusedPurchaseLedgerSuggestionIndex(-1);
        setTimeout(() => {
            try {
                invoiceDateRef.current?.focus?.();
            } catch {}
        }, 0);
    };

    const handlePartyKeyDown = (e) => {
        if (e.key === 'Escape') {
            // #region debug-point F:purchase-party-escape
            reportPurchaseEscDebug('F', 'Party field Escape handler', {
                defaultPrevented: e.defaultPrevented,
                showPartySuggestions,
                focusedPartySuggestionIndex,
                inputValue: String(partySearchInput || '')
            });
            // #endregion
            if (!showPartySuggestions) return;
            e.preventDefault();
            e.stopPropagation();
            setShowPartySuggestions(false);
            setFocusedPartySuggestionIndex(-1);
            return;
        }

        const list = partySuggestionResults;
        if (e.key === ' ' && String(partySearchInput || '').trim() === '') {
            if (!list.length) return;
            e.preventDefault();
            e.stopPropagation();
            setShowPartySuggestions(true);
            setFocusedPartySuggestionIndex(0);
            return;
        }

        if (!list.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showPartySuggestions) {
                setShowPartySuggestions(true);
                setFocusedPartySuggestionIndex(0);
                return;
            }
            setFocusedPartySuggestionIndex(prev => {
                const next = prev < 0 ? 0 : prev + 1;
                return next >= list.length ? list.length - 1 : next;
            });
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!showPartySuggestions) {
                setShowPartySuggestions(true);
                setFocusedPartySuggestionIndex(list.length - 1);
                return;
            }
            setFocusedPartySuggestionIndex(prev => {
                const next = prev < 0 ? list.length - 1 : prev - 1;
                return next < 0 ? 0 : next;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (showPartySuggestions || String(partySearchInput || '').trim() === '') {
                const idx = (focusedPartySuggestionIndex >= 0 && focusedPartySuggestionIndex < list.length) ? focusedPartySuggestionIndex : 0;
                handleSelectPartySuggestion(list[idx]);
                return;
            }
            setTimeout(() => {
                try {
                    purchaseLedgerRef.current?.focus?.();
                } catch {}
            }, 0);
        }
    };

    const handlePurchaseLedgerKeyDown = (e) => {
        if (e.key === 'Escape') {
            // #region debug-point G:purchase-ledger-escape
            reportPurchaseEscDebug('G', 'Purchase Ledger field Escape handler', {
                defaultPrevented: e.defaultPrevented,
                showPurchaseLedgerSuggestions,
                focusedPurchaseLedgerSuggestionIndex,
                inputValue: String(purchaseLedgerSearchInput || '')
            });
            // #endregion
            if (!showPurchaseLedgerSuggestions) return;
            e.preventDefault();
            e.stopPropagation();
            setShowPurchaseLedgerSuggestions(false);
            setFocusedPurchaseLedgerSuggestionIndex(-1);
            return;
        }

        const list = purchaseLedgerSuggestionResults;
        if (e.key === ' ' && String(purchaseLedgerSearchInput || '').trim() === '') {
            if (!list.length) return;
            e.preventDefault();
            e.stopPropagation();
            setShowPurchaseLedgerSuggestions(true);
            setFocusedPurchaseLedgerSuggestionIndex(0);
            return;
        }

        if (!list.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showPurchaseLedgerSuggestions) {
                setShowPurchaseLedgerSuggestions(true);
                setFocusedPurchaseLedgerSuggestionIndex(0);
                return;
            }
            setFocusedPurchaseLedgerSuggestionIndex(prev => {
                const next = prev < 0 ? 0 : prev + 1;
                return next >= list.length ? list.length - 1 : next;
            });
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!showPurchaseLedgerSuggestions) {
                setShowPurchaseLedgerSuggestions(true);
                setFocusedPurchaseLedgerSuggestionIndex(list.length - 1);
                return;
            }
            setFocusedPurchaseLedgerSuggestionIndex(prev => {
                const next = prev < 0 ? list.length - 1 : prev - 1;
                return next < 0 ? 0 : next;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (showPurchaseLedgerSuggestions || String(purchaseLedgerSearchInput || '').trim() === '') {
                const idx = (focusedPurchaseLedgerSuggestionIndex >= 0 && focusedPurchaseLedgerSuggestionIndex < list.length)
                    ? focusedPurchaseLedgerSuggestionIndex
                    : 0;
                if (list[idx]) handleSelectPurchaseLedgerSuggestion(list[idx]);
                return;
            }
            setTimeout(() => {
                try {
                    invoiceDateRef.current?.focus?.();
                } catch {}
            }, 0);
        }
    };

    const fetchItemDetails = async (code, options = {}) => {
        const raw = String(code || '').trim();
        if (!raw) return false;
        try {
            const normalize = (v) => String(v || '').trim();
            const preferredSizeCode = normalize(options?.preferredSizeCode);
            const openSizeChooser = options?.openSizeChooser === true;
            const focusScanItem = options?.focusScanItem === true;
            const token = localStorage.getItem('token');
            // Fetch prices for this item
            let response = null;
            try {
                response = await axios.get(`/api/prices/item/${encodeURIComponent(raw)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch {
                response = null;
            }

            const pricesOk = Boolean(response?.data?.success);
            const prices = pricesOk ? (response.data.prices || []) : [];
            if (pricesOk) {
                setItemPrices(prices);
                
                // Try to find item name
                let itemName = '';
                let itemCode = raw;
                let mrp = '';

                if (prices.length > 0) {
                    itemName = prices[0].itemName;
                    mrp = prices[0].mrp; // Default MRP from first price if available
                } else {
                    // If no prices, search item master to get name
                    const itemResponse = await axios.get(`/api/items/search?query=${encodeURIComponent(raw)}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (itemResponse.data.success && itemResponse.data.items.length > 0) {
                         const lower = raw.toLowerCase();
                         const item = itemResponse.data.items.find(i => String(i?.itemCode || '').trim().toLowerCase() === lower) || itemResponse.data.items[0];
                         itemName = item.itemName;
                         itemCode = item.itemCode;
                    } else {
                        showMessage('Item not found', 'warning');
                        requestAnimationFrame(() => scanInputRef.current?.focus?.());
                        return false;
                    }
                }

                setScanItemName(itemName || '');
                setScanItemCode(itemCode);
                setScanSearchInput(itemName || itemCode);
                setScanMrp(mrp || '');
                setShowSuggestions(false);

                const getAvailableSizesForPrices = () => {
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
                    if (showAll) return sizeMaster;

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
                    const sizes = Array.from(byCode.values());
                    sizes.sort((a, b) => {
                        const ai = orderIndexByCode.has(a.code) ? orderIndexByCode.get(a.code) : Number.POSITIVE_INFINITY;
                        const bi = orderIndexByCode.has(b.code) ? orderIndexByCode.get(b.code) : Number.POSITIVE_INFINITY;
                        if (ai !== bi) return ai - bi;
                        return String(a.name || '').localeCompare(String(b.name || ''));
                    });
                    return sizes;
                };

                const availableSizes = getAvailableSizesForPrices();
                let selectedSize = null;
                if (preferredSizeCode) {
                    selectedSize = availableSizes.find(s => normalize(s?.code).toLowerCase() === preferredSizeCode.toLowerCase()) || null;
                }
                if (!selectedSize && availableSizes.length > 0) {
                    selectedSize = availableSizes[0];
                }

                if (selectedSize) {
                    applyScanSizeSelection(selectedSize, prices, {
                        focusQuantity: false,
                        closeSuggestions: !openSizeChooser,
                        itemCodeOverride: itemCode
                    });
                    if (openSizeChooser || !focusScanItem) {
                        sizeAutoShowAllRef.current = true;
                        setSizeSearchResults(availableSizes);
                        setFocusedSizeSuggestionIndex(Math.max(0, availableSizes.findIndex(s => normalize(s?.code) === normalize(selectedSize?.code))));
                        setShowSizeSuggestions(true);
                    }
                    if (focusScanItem) {
                        requestAnimationFrame(() => {
                            scanInputRef.current?.focus?.();
                            scanInputRef.current?.select?.();
                        });
                    } else {
                        requestAnimationFrame(() => {
                            sizeInputRef.current?.focus?.();
                            sizeInputRef.current?.select?.();
                        });
                    }
                } else {
                    setScanSize('');
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
                    if (focusScanItem) {
                        requestAnimationFrame(() => {
                            scanInputRef.current?.focus?.();
                            scanInputRef.current?.select?.();
                        });
                    } else {
                        sizeAutoShowAllRef.current = true;
                        requestAnimationFrame(() => sizeInputRef.current?.focus?.());
                    }
                }
                return true;
            }
            showMessage('Item not found', 'warning');
            requestAnimationFrame(() => scanInputRef.current?.focus?.());
            return false;
        } catch (error) {
            console.error("Error fetching item details", error);
            showMessage('Item not found', 'warning');
            requestAnimationFrame(() => scanInputRef.current?.focus?.());
            return false;
        }
    };

    const applyScanSizeSelection = useCallback((size, pricesOverride, options = {}) => {
        if (!size) return false;
        const { focusQuantity = true, closeSuggestions = true, itemCodeOverride = '' } = options;
        const prices = Array.isArray(pricesOverride) ? pricesOverride : itemPrices;
        const targetCode = String(size?.code || '').trim();
        const targetName = String(size?.name || '').trim();
        if (!targetCode) return false;

        sizeAutoShowAllRef.current = false;
        setScanSize(targetCode);
        setSizeSearchInput(targetName || targetCode);
        if (closeSuggestions) {
            setShowSizeSuggestions(false);
        }

        const priceInfo = prices.find(p => String(p?.sizeCode || '').trim() === targetCode);
        if (priceInfo) {
            const nextRateRaw = getEffectiveRate(priceInfo);
            setScanRate(nextRateRaw);
            rateTouchedRef.current = false;
            defaultBaseRateRef.current = parseFloat(nextRateRaw) || 0;
            if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
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
                fetchUomMapForScan(itemCodeOverride || scanItemCode, targetCode);
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

        if (focusQuantity) {
            requestAnimationFrame(() => quantityRef.current?.focus?.());
        }
        return true;
    }, [fetchUomMapForScan, getEffectiveRate, itemPrices, scanItemCode]);

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

    const handleSelectSuggestion = async (item) => {
        const preserveEditValues = editingRowIndexRef.current !== null;
        const currentSizeCode = String(scanSize || '').trim();
        if (!preserveEditValues) setScanSize('');
        sizeAutoShowAllRef.current = false;
        if (!preserveEditValues) setSizeSearchInput('');
        setScanRate('');
        rateTouchedRef.current = false;
        defaultBaseRateRef.current = 0;
        if (!preserveEditValues) {
            setScanQtyInput('');
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;
        } else {
            scanAmountTouchedRef.current = false;
        }
        setScanBaseUom('');
        setScanAltUom('');
        setScanFactor('');
        scanUomInfoRef.current = { baseUom: '', options: [] };
        setScanQtyUnitMode('BASE');
        setScanRateUnitMode('BASE');
        setItemPrices([]);

        setScanItemCode(item.itemCode);
        setScanItemName(item.itemName);
        setScanSearchInput(item.itemName);
        setShowSuggestions(false);
        const ok = await fetchItemDetails(item.itemCode, {
            preferredSizeCode: preserveEditValues ? currentSizeCode : '',
            openSizeChooser: preserveEditValues,
            focusScanItem: false
        });
        if (!ok) {
            requestAnimationFrame(() => scanInputRef.current?.focus?.());
        }
        return ok;
    };

    const handleScanKeyDown = async (e) => {
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
                    if (!preserveEditValues) setScanSize('');
                    sizeAutoShowAllRef.current = false;
                    if (!preserveEditValues) setSizeSearchInput('');
                    setScanRate('');
                    rateTouchedRef.current = false;
                    defaultBaseRateRef.current = 0;
                    if (!preserveEditValues) {
                        setScanQtyInput('');
                        setScanAmountInput('');
                        scanAmountTouchedRef.current = false;
                    } else {
                        scanAmountTouchedRef.current = false;
                    }
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    setItemPrices([]);
                    ok = await fetchItemDetails(scanSearchInput, {
                        preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                        openSizeChooser: preserveEditValues,
                        focusScanItem: false
                    });
                }
            } else {
                const preserveEditValues = editingRowIndexRef.current !== null;
                const currentSizeCode = String(scanSize || '').trim();
                if (!preserveEditValues) setScanSize('');
                sizeAutoShowAllRef.current = false;
                if (!preserveEditValues) setSizeSearchInput('');
                setScanRate('');
                rateTouchedRef.current = false;
                defaultBaseRateRef.current = 0;
                if (!preserveEditValues) {
                    setScanQtyInput('');
                    setScanAmountInput('');
                    scanAmountTouchedRef.current = false;
                } else {
                    scanAmountTouchedRef.current = false;
                }
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                scanUomInfoRef.current = { baseUom: '', options: [] };
                setScanQtyUnitMode('BASE');
                setScanRateUnitMode('BASE');
                setItemPrices([]);
                const rawQuery = String(scanSearchInput || '').trim();
                if (rawQuery) {
                    try {
                        const token = localStorage.getItem('token');
                        const response = await axios.get(`/api/items/search?query=${encodeURIComponent(rawQuery)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const items = response?.data?.success ? (response.data.items || []) : [];
                        if (items.length > 0) {
                            ok = await handleSelectSuggestion(items[0]);
                        } else {
                            ok = await fetchItemDetails(rawQuery, {
                                preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                                openSizeChooser: preserveEditValues,
                                focusScanItem: false
                            });
                        }
                    } catch {
                        ok = await fetchItemDetails(rawQuery, {
                            preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                            openSizeChooser: preserveEditValues,
                            focusScanItem: false
                        });
                    }
                } else {
                    ok = false;
                }
            }
            if (!ok) {
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
        if (showAll) return sizeMaster;

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
        const sizes = Array.from(byCode.values());
        sizes.sort((a, b) => {
            const ai = orderIndexByCode.has(a.code) ? orderIndexByCode.get(a.code) : Number.POSITIVE_INFINITY;
            const bi = orderIndexByCode.has(b.code) ? orderIndexByCode.get(b.code) : Number.POSITIVE_INFINITY;
            if (ai !== bi) return ai - bi;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
        return sizes;
    }, [activeSizes, itemPrices, voucherConfig?.showAllSize]);

    useEffect(() => {
        if (!voucherConfigLoaded) return;
        if (!scanItemCode) return;
        if (!scanSize) return;

        const normalizedSelected = String(scanSize || '').trim().toLowerCase();
        if (!normalizedSelected) return;

        const availableSizes = getAvailableSizesForScan();
        const stillAvailable = availableSizes.some(size => String(size?.code || '').trim().toLowerCase() === normalizedSelected);
        if (stillAvailable) return;

        sizeAutoShowAllRef.current = true;
        setScanSize('');
        setSizeSearchInput('');
        setFocusedSizeSuggestionIndex(-1);
        setShowSizeSuggestions(false);
    }, [getAvailableSizesForScan, scanItemCode, scanSize, voucherConfigLoaded, voucherConfig?.showAllSize]);

    const handleSizeInputChange = (e) => {
        const value = e.target.value;
        sizeAutoShowAllRef.current = !value;
        setSizeSearchInput(value);
        setScanSize('');
        setFocusedSizeSuggestionIndex(-1);

        const availableSizes = getAvailableSizesForScan().filter(sizeHasPriceForMethod);
        if (value) {
            const filtered = availableSizes.filter(s =>
                String(s?.name || '').toLowerCase().includes(value.toLowerCase()) ||
                String(s?.code || '').toLowerCase().includes(value.toLowerCase())
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
        const availableSizes = getAvailableSizesForScan().filter(sizeHasPriceForMethod);

        if (sizeAutoShowAllRef.current || !sizeSearchInput) {
            setSizeSearchResults(availableSizes);
            setShowSizeSuggestions(true);
        } else {
            const value = sizeSearchInput;
            const filtered = availableSizes.filter(s =>
                String(s?.name || '').toLowerCase().includes(value.toLowerCase()) ||
                String(s?.code || '').toLowerCase().includes(value.toLowerCase())
            );
            setSizeSearchResults(filtered);
            setShowSizeSuggestions(true);
        }
    };

    useEffect(() => {
        const el = sizeInputRef.current;
        if (!el) return;
        if (document.activeElement !== el) return;

        const availableSizes = getAvailableSizesForScan().filter(sizeHasPriceForMethod);
        const value = String(sizeSearchInput || '').trim();
        const next = sizeAutoShowAllRef.current ? availableSizes : (value
            ? availableSizes.filter(s =>
                String(s?.name || '').toLowerCase().includes(value.toLowerCase()) ||
                String(s?.code || '').toLowerCase().includes(value.toLowerCase())
            )
            : availableSizes);

        setSizeSearchResults(next);
        setShowSizeSuggestions(true);
    }, [getAvailableSizesForScan, sizeHasPriceForMethod, sizeSearchInput, voucherConfig?.showAllSize, itemPrices, activeSizes, effectivePricingMethod]);

    const handlePriceListMethodChange = (e) => {
        const nextMethod = e.target.value;
        setPriceListMethod(nextMethod);
        const priceInfo = itemPrices.find(p => p.sizeCode === scanSize);
        if (priceInfo) {
            const nextBaseRateRaw = getRateForMethod(priceInfo, nextMethod);
            const nextBaseRateNum = parseFloat(nextBaseRateRaw);
            const baseRate = Number.isFinite(nextBaseRateNum) && nextBaseRateNum > 0 ? nextBaseRateNum : 0;
            defaultBaseRateRef.current = baseRate;
            rateTouchedRef.current = false;

            if (scanRateUnitMode === 'ALT') {
                const f = getScanFactorNumber();
                const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
                const selected =
                    scanAltUom
                        ? options.find(o => String(o?.altUom || '').trim().toLowerCase() === String(scanAltUom).trim().toLowerCase()) || null
                        : (options[0] || null);
                const optRateRaw = getAltRateForMethod(selected, nextMethod);
                const optRateNum = parseFloat(optRateRaw);
                const nextDisplayedRate =
                    Number.isFinite(optRateNum) && optRateNum > 0
                        ? optRateNum
                        : (baseRate > 0 && f > 0 ? baseRate * f : 0);
                setScanRate(nextDisplayedRate ? String(Number(nextDisplayedRate).toFixed(2)) : '');
            } else {
                setScanRate(nextBaseRateRaw);
            }
        }
    };

    const handleSelectSize = (size) => {
        applyScanSizeSelection(size, itemPrices, { focusQuantity: true, closeSuggestions: true });
    };

    const handleSizeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0) {
                handleSelectSize(sizeSearchResults[focusedSizeSuggestionIndex]);
            } else {
                const availableSizes = getAvailableSizesForScan().filter(sizeHasPriceForMethod);
                const exactMatch = availableSizes.find(s =>
                    String(s?.code || '').toLowerCase() === sizeSearchInput.toLowerCase() ||
                    String(s?.name || '').toLowerCase() === sizeSearchInput.toLowerCase()
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

            const availableSizes = getAvailableSizesForScan().filter(sizeHasPriceForMethod);
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
            const parsedQty = parseQtyWithUnit(scanQtyInput);
            const enteredQtyNum = parsedQty?.qtyNum ?? 0;
            if (!parsedQty?.ok) {
                showMessage("Invalid Qty format. Use like 2c or 2.5c", 'warning');
                return;
            }
            if (!enteredQtyNum || enteredQtyNum <= 0) {
                const availableSizesForNext = getAvailableSizesForScan();
                const currentCode = String(scanSize || '').trim();
                const currentSizeIndex = availableSizesForNext.findIndex(s => String(s?.code || '').trim() === currentCode);
                const nextSize =
                    currentSizeIndex >= 0
                        ? (availableSizesForNext[currentSizeIndex + 1] || null)
                        : (availableSizesForNext[0] || null);

                if (nextSize?.code) {
                    applyScanSizeSelection(nextSize, itemPrices, { focusQuantity: false, closeSuggestions: true });
                    setScanQtyInput('');
                    setScanAmountInput('');
                    scanAmountTouchedRef.current = false;
                    requestAnimationFrame(() => quantityRef.current?.focus?.());
                } else {
                    setScanItemCode('');
                    setScanItemName('');
                    setScanSearchInput('');
                    setScanSize('');
                    setSizeSearchInput('');
                    setScanRate('');
                    rateTouchedRef.current = false;
                    defaultBaseRateRef.current = 0;
                    setScanQtyInput('');
                    setScanMrp('');
                    setScanAmountInput('');
                    scanAmountTouchedRef.current = false;
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    setItemPrices([]);
                    if (scanInputRef.current) scanInputRef.current.focus();
                }
                return;
            }

            if (parsedQty?.hasUnit) {
                let resolved = resolveUnitToken(parsedQty.unitToken);
                if (!resolved?.ok) {
                    await fetchUomMapForScan(scanItemCode, scanSize);
                    resolved = resolveUnitToken(parsedQty.unitToken);
                    if (!resolved?.ok) {
                        showMessage('Unknown unit code in Qty', 'warning');
                        return;
                    }
                }
                if (resolved.unitMode === 'ALT') {
                    const altUom = String(resolved.resolvedUom || '').trim();
                    const factorStr = resolved.factor !== undefined && resolved.factor !== null ? String(resolved.factor) : '';
                    if (altUom) setScanAltUom(altUom);
                    if (factorStr) setScanFactor(factorStr);
                    setScanQtyUnitMode('ALT');
                    setScanRateUnitMode('ALT');
                    syncRateForUnitMode('ALT');
                } else {
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    syncRateForUnitMode('BASE');
                }
            }

            handleAddItem();
        }
    };

    const handleAddItem = async () => {
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
        const parsedQty = parseQtyWithUnit(scanQtyInput);
        if (!parsedQty?.ok) {
            showMessage("Invalid Qty format. Use like 2c or 2.5c", 'warning');
            return;
        }
        if (!parsedQty?.qtyNum || parsedQty.qtyNum <= 0) {
            showMessage("Please enter valid Quantity", 'warning');
            return;
        }

        const rateEntered = parseFloat(scanRate) || 0;
        const qtyEntered = parsedQty.qtyNum;

        let unitMode = 'BASE';
        let factorNum = 0;
        if (parsedQty?.hasUnit) {
            let resolved = resolveUnitToken(parsedQty.unitToken);
            if (!resolved?.ok) {
                await fetchUomMapForScan(scanItemCode, scanSize);
                resolved = resolveUnitToken(parsedQty.unitToken);
            }
            if (resolved?.ok) {
                unitMode = resolved.unitMode === 'ALT' ? 'ALT' : 'BASE';
                if (unitMode === 'ALT') {
                    const altUom = String(resolved.resolvedUom || '').trim();
                    const factorStr = resolved.factor !== undefined && resolved.factor !== null ? String(resolved.factor) : '';
                    if (altUom) setScanAltUom(altUom);
                    if (factorStr) setScanFactor(factorStr);
                    setScanQtyUnitMode('ALT');
                    setScanRateUnitMode('ALT');
                } else {
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                }
                factorNum = unitMode === 'ALT' ? (parseFloat(resolved.factor) || getScanFactorNumber()) : 0;
            }
        }

        if (unitMode === 'ALT' && !(Number.isFinite(factorNum) && factorNum > 0)) {
            showMessage("Alternate Unit is not configured properly (Factor required)", 'warning');
            return;
        }
        const qtyBaseRaw = unitMode === 'ALT' ? (qtyEntered * factorNum) : qtyEntered;
        const qtyBaseInt = Math.round(qtyBaseRaw);
        if (!(Number.isFinite(qtyBaseRaw) && qtyBaseRaw > 0 && Math.abs(qtyBaseRaw - qtyBaseInt) < 0.000001)) {
            showMessage("Quantity results in fractional base quantity. Please check Alternate Unit factor.", 'warning');
            return;
        }
        const rateBase = unitMode === 'ALT' ? (rateEntered / factorNum) : rateEntered;
        if (!(Number.isFinite(rateEntered) && rateEntered > 0 && Number.isFinite(rateBase) && rateBase > 0)) {
            showMessage("Please enter valid Rate", 'warning');
            return;
        }
        const mrp = parseFloat(scanMrp) || 0;
        const parsedAmount = parseFloat(scanAmountInput);
        const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : (qtyBaseInt * rateBase);

        setGridRows(prev => {
            const makeRow = (base = {}) => ({
                ...base,
                itemCode: scanItemCode,
                itemName: scanItemName,
                size: scanSize,
                rate: rateBase,
                mrp: mrp,
                quantity: qtyBaseInt,
                displayQuantity: qtyEntered,
                qtyUnitMode: unitMode,
                baseUom: scanBaseUom,
                altUom: scanAltUom,
                factor: scanFactor,
                enteredRate: rateEntered,
                amount: amount
            });

            if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < prev.length) {
                const updatedRows = [...prev];
                updatedRows[editingRowIndex] = makeRow(updatedRows[editingRowIndex] || {});
                pendingGridScrollRef.current = true;
                pendingGridScrollIndexRef.current = editingRowIndex;
                return updatedRows;
            }

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
                const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.size === scanSize);
                if (existingIndex >= 0) {
                    const updatedRows = [...prev];
                    const existingRow = updatedRows[existingIndex];
                    const newQuantity = (existingRow.quantity || 0) + qtyBaseInt;
                    const newAmount = newQuantity * rateBase;

                    updatedRows[existingIndex] = {
                        ...existingRow,
                        quantity: newQuantity,
                        displayQuantity: newQuantity,
                        qtyUnitMode: 'BASE',
                        baseUom: scanBaseUom,
                        altUom: scanAltUom,
                        factor: scanFactor,
                        enteredRate: rateBase,
                        amount: newAmount,
                        rate: rateBase,
                        mrp: mrp
                    };
                    pendingGridScrollRef.current = true;
                    pendingGridScrollIndexRef.current = existingIndex;
                    return updatedRows;
                }
            }

            const newRow = makeRow({ id: Date.now() });
            pendingGridScrollRef.current = true;
            pendingGridScrollIndexRef.current = prev.length;
            return [...prev, newRow];
        });

        if (editingRowIndex !== null) {
            setEditingRowIndex(null);
            setScanItemCode('');
            setScanItemName('');
            setScanSearchInput('');
            setScanSize('');
            setSizeSearchInput('');
            setScanRate('');
            rateTouchedRef.current = false;
            defaultBaseRateRef.current = 0;
            setScanQtyInput('');
            setScanMrp('');
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            scanUomInfoRef.current = { baseUom: '', options: [] };
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            setItemPrices([]);
            if (scanInputRef.current) scanInputRef.current.focus();
            return;
        }

        const availableSizesForNext = getAvailableSizesForScan();
        const currentSizeIndex = availableSizesForNext.findIndex(s => s.code === scanSize);
        let nextSize = null;

        if (currentSizeIndex !== -1) {
            for (let i = currentSizeIndex + 1; i < availableSizesForNext.length; i++) {
                nextSize = availableSizesForNext[i];
                break;
            }
        }

        if (nextSize) {
            setScanSize(nextSize.code);
            setSizeSearchInput(nextSize.name);

            const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
            if (priceInfo) {
                const nextRateRaw = getEffectiveRate(priceInfo);
                setScanRate(nextRateRaw);
                rateTouchedRef.current = false;
                defaultBaseRateRef.current = parseFloat(nextRateRaw) || 0;
                if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
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
                    fetchUomMapForScan(scanItemCode, nextSize.code);
                }
            } else {
                setScanRate('');
                setScanMrp('');
                rateTouchedRef.current = false;
                defaultBaseRateRef.current = 0;
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                scanUomInfoRef.current = { baseUom: '', options: [] };
                setScanQtyUnitMode('BASE');
                setScanRateUnitMode('BASE');
            }

            setScanQtyInput('');
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;

            if (quantityRef.current) quantityRef.current.focus();
        } else {
            setScanItemCode('');
            setScanItemName('');
            setScanSearchInput('');
            setScanSize('');
            setSizeSearchInput('');
            setScanRate('');
            rateTouchedRef.current = false;
            defaultBaseRateRef.current = 0;
            setScanQtyInput('');
            setScanMrp('');
            setScanAmountInput('');
            scanAmountTouchedRef.current = false;
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            scanUomInfoRef.current = { baseUom: '', options: [] };
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            setItemPrices([]);
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleDeleteRow = (index) => {
        setEditingRowIndex(prev => (prev === index ? null : prev));
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditRow = async (row, index) => {
        if (!row) return;
        let prices = [];
        try {
            const itemCode = String(row.itemCode || '').trim();
            if (itemCode) {
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/prices/item/${encodeURIComponent(itemCode)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                prices = response?.data?.success ? (response.data.prices || []) : [];
            }
        } catch {
            prices = [];
        }

        setEditingRowIndex(index);
        setItemPrices(Array.isArray(prices) ? prices : []);
        setScanItemCode(row.itemCode || '');
        setScanItemName(row.itemName || '');
        setScanSearchInput(row.itemName || row.itemCode || '');
        setScanSize(row.size || '');
        const sizeName =
            activeSizes.find(s => s.code === row.size)?.name ||
            prices.find(p => String(p?.sizeCode || '').trim() === String(row.size || '').trim())?.sizeName ||
            row.size ||
            '';
        setSizeSearchInput(sizeName);
        const rowFactorNum = row?.factor !== undefined && row?.factor !== null ? parseFloat(row.factor) : 0;
        const rowHasAlt = Boolean(String(row?.altUom || '').trim()) && Number.isFinite(rowFactorNum) && rowFactorNum > 0;
        const rowUnitMode = row?.qtyUnitMode === 'ALT' && rowHasAlt ? 'ALT' : 'BASE';
        const enteredQtyNum =
            row?.displayQuantity !== undefined && row?.displayQuantity !== null
                ? parseFloat(row.displayQuantity) || 0
                : (parseFloat(row?.quantity) || 0);
        const baseRateNum = row?.rate !== undefined && row?.rate !== null ? parseFloat(row.rate) || 0 : 0;
        const enteredRateNum =
            row?.enteredRate !== undefined && row?.enteredRate !== null
                ? parseFloat(row.enteredRate) || 0
                : (rowUnitMode === 'ALT' && rowHasAlt ? baseRateNum * rowFactorNum : baseRateNum);
        const token = getUnitTokenFromUomCode(rowUnitMode === 'ALT' ? row.altUom : row.baseUom);
        setScanRate(enteredRateNum ? String(Number(enteredRateNum).toFixed(2)) : '');
        setScanQtyInput(enteredQtyNum ? `${enteredQtyNum}${token || ''}` : '');
        setScanAmountInput(enteredQtyNum && enteredRateNum ? String(Number(enteredQtyNum * enteredRateNum).toFixed(2)) : '');
        scanAmountTouchedRef.current = false;
        rateTouchedRef.current = false;
        defaultBaseRateRef.current = baseRateNum || 0;
        setScanQtyUnitMode(rowUnitMode);
        setScanRateUnitMode(rowUnitMode);
        setScanBaseUom(row.baseUom || '');
        setScanAltUom(row.altUom || '');
        setScanFactor(row.factor !== undefined && row.factor !== null ? String(row.factor) : '');
        scanUomInfoRef.current = {
            baseUom: String(row.baseUom || '').trim(),
            options: String(row.altUom || '').trim() && parseFloat(row.factor) > 0
                ? [{ altUom: String(row.altUom || '').trim(), factor: String(row.factor) }]
                : []
        };
        setScanMrp(String(row.mrp ?? ''));
        requestAnimationFrame(() => {
            try {
                scanInputRef.current?.focus?.();
                scanInputRef.current?.select?.();
            } catch {}
        });
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
        const resolvedName = String(ledger?.name || name || code).trim();
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
                        ledgerName: resolvedName,
                        perc: percValue,
                        amountAuto,
                        amount: finalAmount.toFixed(2)
                    };
                    return updated;
                }
                const newAmount = (parseFloat(existing.amount) || 0) + finalAmount;
                updated[existingIndex] = {
                    ...existing,
                    ledgerName: resolvedName,
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
                    ledgerName: resolvedName,
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
        const allocatedTotalAtSave = grandTotal + invoiceValueRows.reduce(
            (sum, row) => sum + (parseFloat(row.amount) || 0),
            0
        );
        const numericInvoiceValue = parseFloat(invoiceValue);
        if (!invoiceValue || !Number.isFinite(numericInvoiceValue) || numericInvoiceValue === 0) {
            setInvoiceValue(Number(allocatedTotalAtSave || 0).toFixed(2));
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

        const allocatedTotalAtSave = grandTotal + invoiceValueRows.reduce(
            (sum, row) => sum + (parseFloat(row.amount) || 0),
            0
        );
        const parsedInvoiceValue = parseFloat(invoiceValue);
        const numericInvoiceValue = Number.isFinite(parsedInvoiceValue) && parsedInvoiceValue > 0
            ? parsedInvoiceValue
            : allocatedTotalAtSave;

        // Prepare Payload
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const effectiveStoreCode = String(voucherStoreCode || storeInfo?.storeCode || '').trim();
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
            const response = await axios.post(`${apiBase}/save`, { head, items, ledgers, isDraft }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                try {
                    const key = getLastVoucherDateKeyForStore(effectiveStoreCode);
                    localStorage.setItem(key, invoiceDate);
                    localStorage.setItem(lastVoucherDateGlobalKey, invoiceDate);
                    if (String(userRole || '').trim().toUpperCase() !== 'STORE USER') {
                        setLastVoucherDateAll(invoiceDate);
                    }
                } catch {}
                await Swal.fire({
                    title: 'Success',
                    text: isDraft ? 'Draft Saved Successfully' : `${successName} Saved Successfully`,
                    icon: 'success',
                    timer: 1500
                });
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
                setDraftId(null);
                setSelectedDraftId('');
                fetchDraftVouchers(); // Refresh drafts list
                if (storeInfo?.storeCode) {
                    fetchNextInvoiceNo(storeInfo.storeCode);
                }
                initialScanFocusDoneRef.current = false;
                requestAnimationFrame(() => {
                    try {
                        partyInputRef.current?.focus?.();
                        partyInputRef.current?.select?.();
                    } catch {}
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            const backendMessage = error.response?.data?.message;
            showMessage(backendMessage || `Error saving ${successName}`, 'error');
        }
    };

    const handleSaveDraft = () => {
        processSave(true);
    };

    const handleSubmit = async () => {
        if (isSubmitSavingRef.current) return;
        isSubmitSavingRef.current = true;
        setIsSubmitSaving(true);

        const result = await Swal.fire({
            title: 'Confirm Submission',
            text: "Are you sure you want to submit? Inventory will be updated.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Submit!'
        });
        if (!result.isConfirmed) {
            isSubmitSavingRef.current = false;
            setIsSubmitSaving(false);
            return;
        }

        await processSave(false);
        isSubmitSavingRef.current = false;
        setIsSubmitSaving(false);
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
            const response = await axios.delete(`${apiBase}/${encodeURIComponent(invoiceNo)}`, {
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
        <div className="h-[100dvh] bg-slate-50 p-0 sm:p-2 flex flex-col items-center justify-center font-sans overflow-hidden">
            <div className="w-full h-full sm:max-w-[98%] lg:max-w-[95%] bg-white sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
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
                            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
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
                                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm transition-all hover:shadow-md hover:border-indigo-300 cursor-pointer"
                                    title="Click to change store"
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
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Search Party <span className="text-red-500">*</span></label>
                                <div ref={partySuggestWrapRef} className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        ref={partyInputRef}
                                        type="text"
                                        value={partySearchInput}
                                        onChange={handlePartyInputChange}
                                        onKeyDown={handlePartyKeyDown}
                                        onFocus={() => {
                                            setShowPartySuggestions(false);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                const wrap = partySuggestWrapRef.current;
                                                if (wrap && wrap.contains(document.activeElement)) return;
                                                setShowPartySuggestions(false);
                                                setFocusedPartySuggestionIndex(-1);
                                            }, 0);
                                        }}
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        placeholder="Search Party"
                                    />
                                    {showPartySuggestions && partySuggestionResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {partySuggestionResults.map((row, idx) => (
                                                <div
                                                    key={row.key}
                                                    id={`suggestion-party-${idx}`}
                                                    className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 ${
                                                        idx === focusedPartySuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectPartySuggestion(row);
                                                    }}
                                                >
                                                    <div className="font-medium text-slate-800">{row.name}</div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                                        <span className="font-mono">{row.code}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{row.source}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Purchase Ledger <span className="text-red-500">*</span></label>
                                <div ref={purchaseLedgerSuggestWrapRef} className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Search className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        ref={purchaseLedgerRef}
                                        type="text"
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        value={purchaseLedgerSearchInput}
                                        onChange={handlePurchaseLedgerInputChange}
                                        onKeyDown={handlePurchaseLedgerKeyDown}
                                        onFocus={() => {
                                            setShowPurchaseLedgerSuggestions(false);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                const wrap = purchaseLedgerSuggestWrapRef.current;
                                                if (wrap && wrap.contains(document.activeElement)) return;
                                                setShowPurchaseLedgerSuggestions(false);
                                                setFocusedPurchaseLedgerSuggestionIndex(-1);
                                            }, 0);
                                        }}
                                        placeholder="Search Ledger"
                                    />
                                    {showPurchaseLedgerSuggestions && purchaseLedgerSuggestionResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {purchaseLedgerSuggestionResults.map((row, idx) => (
                                                <div
                                                    key={row.key}
                                                    id={`suggestion-purchase-ledger-${idx}`}
                                                    className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 ${
                                                        idx === focusedPurchaseLedgerSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectPurchaseLedgerSuggestion(row);
                                                    }}
                                                >
                                                    <div className="font-medium text-slate-800">{row.name}</div>
                                                    <div className="text-[11px] text-slate-500">
                                                        <span className="font-mono">{row.code}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 md:gap-6 md:ml-auto">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date <span className="text-red-500">*</span></label>
                                    <DateInputButton
                                        inputRef={invoiceDateRef}
                                        value={invoiceDate}
                                        onChange={setInvoiceDate}
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter') return;
                                            e.preventDefault();
                                            setTimeout(() => {
                                                try {
                                                    partyInvoiceRef.current?.focus?.();
                                                    partyInvoiceRef.current?.select?.();
                                                } catch {}
                                            }, 0);
                                        }}
                                        disabled={isStoreUserBusinessDateLocked}
                                        wrapperClassName="relative w-32 md:w-40"
                                        buttonClassName={`w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm outline-none shadow-sm text-left font-mono ${
                                            isStoreUserBusinessDateLocked
                                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                                : 'bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500'
                                        }`}
                                    />
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
                                    ref={partyInvoiceRef}
                                    type="text"
                                    value={partyInvoiceNo}
                                    onChange={(e) => setPartyInvoiceNo(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        setTimeout(() => {
                                            try {
                                                narrationRef.current?.focus?.();
                                                narrationRef.current?.select?.();
                                            } catch {}
                                        }, 0);
                                    }}
                                    className="w-48 md:w-64 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    placeholder="Enter"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    Narration
                                </label>
                                <input
                                    type="text"
                                    ref={narrationRef}
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        requestAnimationFrame(() => priceListRef.current?.focus?.());
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    placeholder="Enter Narration"
                                />
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Price List :</label>
                                <select
                                    ref={priceListRef}
                                    value={effectivePricingMethod}
                                    onChange={handlePriceListMethodChange}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        setTimeout(() => {
                                            try {
                                                scanInputRef.current?.focus?.();
                                                scanInputRef.current?.select?.();
                                            } catch {}
                                        }, 0);
                                    }}
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
                                type="text"
                                value={scanQtyInput}
                                onChange={async (e) => {
                                    const val = e.target.value;
                                    setScanQtyInput(val);

                                    const parsed = parseQtyWithUnit(val);
                                    if (parsed?.ok && parsed?.hasUnit) {
                                        let resolved = resolveUnitToken(parsed.unitToken);
                                        if (!resolved?.ok && scanItemCode && scanSize) {
                                            await fetchUomMapForScan(scanItemCode, scanSize);
                                            resolved = resolveUnitToken(parsed.unitToken);
                                        }
                                        if (!resolved?.ok) return;

                                        const mode = resolved.unitMode === 'ALT' ? 'ALT' : 'BASE';
                                        setScanQtyUnitMode(mode);
                                        setScanRateUnitMode(mode);

                                        if (mode === 'ALT') {
                                            const altCode = String(resolved.resolvedUom || '').trim();
                                            const f = String(resolved.factor || '').trim();
                                            if (altCode) setScanAltUom(altCode);
                                            if (f) setScanFactor(f);

                                            if (!rateTouchedRef.current) {
                                                const options = Array.isArray(scanUomInfoRef.current?.options) ? scanUomInfoRef.current.options : [];
                                                const selectedOpt = altCode
                                                    ? options.find(o => String(o?.altUom || '').trim().toLowerCase() === altCode.toLowerCase())
                                                    : null;
                                                const optRateRaw = getAltRateForMethod(selectedOpt, effectivePricingMethod);
                                                const optRateNum = parseFloat(optRateRaw);
                                                if (Number.isFinite(optRateNum) && optRateNum > 0) {
                                                    setScanRate(String(Number(optRateNum).toFixed(2)));
                                                    rateTouchedRef.current = false;
                                                } else {
                                                    setScanRate('');
                                                    rateTouchedRef.current = false;
                                                }
                                            }
                                        } else {
                                            setScanAltUom('');
                                            setScanFactor('');
                                            if (!rateTouchedRef.current) {
                                                const baseFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                                                const baseFromCurrent = getBaseRateFromDisplayed(parseFloat(scanRate), scanRateUnitMode || 'BASE');
                                                const baseRate = baseFallback || baseFromCurrent;
                                                if (Number.isFinite(baseRate) && baseRate > 0) {
                                                    setScanRate(String(Number(baseRate).toFixed(2)));
                                                    rateTouchedRef.current = false;
                                                }
                                            }
                                        }
                                        return;
                                    }

                                    if (parsed?.ok && !parsed?.hasUnit) {
                                        setScanQtyUnitMode('BASE');
                                        setScanRateUnitMode('BASE');
                                        setScanAltUom('');
                                        setScanFactor('');
                                        if (!rateTouchedRef.current) {
                                            const baseFallback = Number.isFinite(defaultBaseRateRef.current) ? Number(defaultBaseRateRef.current) : 0;
                                            const baseFromCurrent = getBaseRateFromDisplayed(parseFloat(scanRate), scanRateUnitMode || 'BASE');
                                            const baseRate = baseFallback || baseFromCurrent;
                                            if (Number.isFinite(baseRate) && baseRate > 0) {
                                                setScanRate(String(Number(baseRate).toFixed(2)));
                                                rateTouchedRef.current = false;
                                            }
                                        }
                                    }
                                }}
                                onKeyDown={handleQuantityKeyDown}
                                className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={scanBaseUom ? `Qty (${getUomLabel(scanBaseUom)})` : 'Qty'}
                            />
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate</label>
                            <input 
                                ref={rateRef}
                                type="number"
                                value={scanRate}
                                onChange={(e) => {
                                    rateTouchedRef.current = true;
                                    setScanRate(e.target.value);
                                }}
                                onKeyDown={handleRateKeyDown}
                                disabled={voucherConfig?.isPriceEditable === false}
                                className={`w-full px-2 py-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${
                                    voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                                }`}
                                placeholder={scanRateUnitMode === 'ALT' && scanAltUom ? `0.00 (${scanAltUom})` : (scanBaseUom ? `0.00 (${scanBaseUom})` : '0.00')}
                            />
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
                            <input
                                ref={scanAmountRef}
                                type="number"
                                value={scanAmountInput}
                                onChange={(e) => {
                                    scanAmountTouchedRef.current = true;
                                    setScanAmountInput(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    setTimeout(() => {
                                        try {
                                            addItemBtnRef.current?.focus?.();
                                        } catch {}
                                    }, 0);
                                }}
                                onBlur={() => {
                                    const amt = parseFloat(scanAmountInput);
                                    const parsedQty = parseQtyWithUnit(scanQtyInput);
                                    const qty = parsedQty?.qtyNum ?? 0;
                                    if (Number.isFinite(amt) && amt > 0 && Number.isFinite(qty) && qty > 0) {
                                        scanAmountTouchedRef.current = false;
                                        rateTouchedRef.current = true;
                                        setScanRate((amt / qty).toFixed(2));
                                    }
                                }}
                                className="w-full px-2 py-2 bg-white border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        
                        <div className="col-span-1">
                             <button 
                                ref={addItemBtnRef}
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
                                    const factorNum = row?.factor !== undefined && row?.factor !== null ? parseFloat(row.factor) : 0;
                                    const hasAltName = Boolean(String(row?.altUom || '').trim());
                                    const hasAltConversion = hasAltName && Number.isFinite(factorNum) && factorNum > 0;
                                    const derivedAltQty = hasAltConversion ? (Number(row.quantity || 0) / factorNum) : NaN;
                                    const canUseAltEquivalent =
                                        hasAltConversion &&
                                        Number.isFinite(derivedAltQty) &&
                                        Math.abs(derivedAltQty - Math.round(derivedAltQty)) < 1e-9;
                                    const baseUomLabel = getUomLabel(String(row?.baseUom || '').trim() || 'PCS');
                                    const altUomLabel = hasAltName ? getUomLabel(String(row?.altUom || '').trim()) : '';
                                    const primaryQtyIsAlt =
                                        row?.qtyUnitMode === 'ALT' &&
                                        hasAltConversion &&
                                        row.displayQuantity !== undefined &&
                                        row.displayQuantity !== null;
                                    const primaryQtyValue = primaryQtyIsAlt ? row.displayQuantity : row.quantity;
                                    const secondaryAltQty = canUseAltEquivalent ? derivedAltQty : null;
                                    const primaryQtyUom = primaryQtyIsAlt ? altUomLabel : baseUomLabel;
                                    const primaryRateIsAlt =
                                        String(row?.rateUnitMode || row?.qtyUnitMode || '').trim().toUpperCase() === 'ALT' &&
                                        hasAltConversion &&
                                        row.enteredRate !== undefined &&
                                        row.enteredRate !== null;
                                    const primaryRateValue = primaryRateIsAlt ? row.enteredRate : row.rate;
                                    const secondaryAltRate = canUseAltEquivalent ? (Number(row.rate || 0) * factorNum) : null;
                                    const primaryRateUom = primaryRateIsAlt ? altUomLabel : baseUomLabel;
                                    return (
                                        <tr key={row.id || index} data-row-index={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-3">
                                                <div className="font-medium text-slate-900">{row.itemName}</div>
                                                <div className="text-[11px] text-slate-500">{row.itemCode}</div>
                                            </td>
                                            <td className="py-2 px-3 text-slate-700">{sizeName}</td>
                                            <td className="py-2 px-3 text-right text-slate-800">
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span>{formatVoucherQty(primaryQtyValue)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{primaryQtyUom}</span>
                                                    {primaryQtyIsAlt ? (
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
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-800">
                                                <div className="flex flex-col items-end">
                                                    <span>₹{Number(primaryRateValue || 0).toFixed(2)}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        / {primaryRateUom}
                                                    </span>
                                                    {primaryRateIsAlt ? (
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            ₹{Number(row.rate || 0).toFixed(2)} / {baseUomLabel}
                                                        </span>
                                                    ) : null}
                                                    {!primaryRateIsAlt && hasAltConversion && secondaryAltRate !== null && secondaryAltRate !== undefined ? (
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            ₹{Number(secondaryAltRate || 0).toFixed(2)} / {altUomLabel}
                                                        </span>
                                                    ) : null}
                                                    {!hasAltConversion && hasAltName ? (
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            / {altUomLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
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
                                <VoucherPrintButton
                                    onClick={handlePrintComingSoon}
                                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-slate-300 transition-colors"
                                >
                                    {renderHotkeyLabel('Print', 'P')}
                                </VoucherPrintButton>
                                <button
                                    onClick={handleSaveDraft}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-yellow-600 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                <span>{renderHotkeyLabel('Save Draft', 'F')}</span>
                                </button>
                                
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitSaving}
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
                            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
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
                                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                                    {invoiceValueRows.map((row, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 flex justify-between items-center">
                                                <span className="text-slate-800">{getInvoiceLedgerDisplayName(row.ledgerCode, row.ledgerName)}</span>
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
                                        setInvoiceDate(iso);
                                        setShowDateEntryModal(false);
                                        setTimeout(() => {
                                            try {
                                                partyInvoiceRef.current?.focus?.();
                                                partyInvoiceRef.current?.select?.();
                                            } catch {}
                                        }, 0);
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
                                                onClick={() => applyStoreSelection(s)}
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

const PurchaseEntry = () => (
    <PurchaseLikeEntry
        apiBase="/api/purchase"
        voucherType="PURCHASE"
        lastVoucherKeyBase="purchase"
        title="Purchase Voucher"
        successName="Purchase"
    />
);

export default PurchaseEntry;
