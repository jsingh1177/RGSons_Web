import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, X, Store, Calendar, User, ArrowLeft, Search, FileText, Pencil } from 'lucide-react';
import { formatVoucherQty } from './uomDisplay';
import VoucherPrintButton from './VoucherPrintButton';
import { getLastVoucherDateAll, normalizeToIsoDate, setLastVoucherDateAll } from './dateUtils';

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

const SalesEntry = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditMode, setIsEditMode] = useState(false);
    const addModeRef = useRef(true);
    addModeRef.current = !isEditMode;
    const storeCodeParam = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        return String(params.get('storeCode') || '').trim();
    }, [location.search]);
    const storeLocked = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        return String(params.get('lockedStore') || '').toLowerCase() === 'true';
    }, [location.search]);
    const userRole = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}')?.role || '';
        } catch {
            return '';
        }
    }, []);
    const canPickStore = Boolean(String(userRole || '').trim()) && !storeLocked;

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
    const toIsoDate = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            const s = date.trim();
            if (s.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                const [yyyy, mm, dd] = s.split('-');
                return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            }
            if (s.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
                const [dd, mm, yyyy] = s.split('-');
                return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            }
            if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const [dd, mm, yyyy] = s.split('/');
                return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            }
            if (s.match(/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/)) {
                const [ddRaw, monRaw, yyRaw] = s.split('-');
                const months = {
                    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
                };
                const mm = months[String(monRaw).toLowerCase()];
                if (mm) {
                    const dd = String(ddRaw).padStart(2, '0');
                    const yyyy = String(yyRaw).length === 2 ? `20${yyRaw}` : String(yyRaw);
                    return `${yyyy}-${mm}-${dd}`;
                }
            }
        }
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const toDdMmYyyy = (date) => {
        const iso = toIsoDate(date);
        if (!iso) return (date || '');
        const [y, m, d] = iso.split('-');
        return `${d}-${m}-${y}`;
    };

    // Header
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [partySearchInput, setPartySearchInput] = useState('');
    const [showPartySuggestions, setShowPartySuggestions] = useState(false);
    const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);
    const [salesLedgers, setSalesLedgers] = useState([]);
    const [selectedSalesLedger, setSelectedSalesLedger] = useState('');
    const [salesLedgerSearchInput, setSalesLedgerSearchInput] = useState('');
    const [showSalesLedgerSuggestions, setShowSalesLedgerSuggestions] = useState(false);
    const [focusedSalesLedgerSuggestionIndex, setFocusedSalesLedgerSuggestionIndex] = useState(-1);
    const [partySearchLedgers, setPartySearchLedgers] = useState([]);
    const [narration, setNarration] = useState('');
    const lastVoucherDateGlobalKey = 'RG_lastVoucherDate:sale';
    const [invoiceDateInput, setInvoiceDateInput] = useState(() => {
        const isStoreUser = String(userRole || '').trim().toUpperCase() === 'STORE USER';
        if (isStoreUser) return toIsoDate(new Date());
        const stored = getLastVoucherDateAll() || normalizeToIsoDate(localStorage.getItem(lastVoucherDateGlobalKey));
        if (stored) {
            setLastVoucherDateAll(stored);
            return stored;
        }
        return toIsoDate(new Date());
    });
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const isStoreUser = String(userRole || '').trim().toUpperCase() === 'STORE USER';
        if (isStoreUser) return toDdMmYyyy(new Date());
        const stored = getLastVoucherDateAll() || normalizeToIsoDate(localStorage.getItem(lastVoucherDateGlobalKey));
        if (stored) return toDdMmYyyy(stored);
        return toDdMmYyyy(new Date());
    });
    const [invoiceNo, setInvoiceNo] = useState('New');
    const [voucherStoreCode, setVoucherStoreCode] = useState('');
    const [storeInfo, setStoreInfo] = useState(null);
    const isStoreUserBusinessDateLocked =
        String(userRole || '').trim().toUpperCase() === 'STORE USER' &&
        storeInfo?.isDsrDisabled === false;
    const [userStores, setUserStores] = useState([]);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [focusedStoreIndex, setFocusedStoreIndex] = useState(-1);
    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);

    useEffect(() => {
        if (!storeLocked || !storeCodeParam) return;
        setVoucherStoreCode(storeCodeParam);
    }, [storeLocked, storeCodeParam]);

    useEffect(() => {
        const effectiveStoreCode = (isEditMode && voucherStoreCode)
            ? voucherStoreCode
            : (storeLocked && storeCodeParam ? storeCodeParam : voucherStoreCode);
        if (!effectiveStoreCode) return;
        if (storeInfo?.storeCode === effectiveStoreCode) return;

        const all = Array.isArray(userStores) ? userStores : [];
        const found = all.find(s => String(s?.storeCode || '').trim() === String(effectiveStoreCode).trim());
        if (found) {
            setStoreInfo(found);
            return;
        }

        const load = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/stores', token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
                const stores = Array.isArray(res.data) ? res.data : (res.data?.stores || []);
                const match = (stores || []).find(s => String(s?.storeCode || '').trim() === String(effectiveStoreCode).trim());
                if (match) setStoreInfo(match);
            } catch {}
        };
        load();
    }, [isEditMode, storeLocked, storeCodeParam, storeInfo?.storeCode, userStores, voucherStoreCode]);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [gridRows, setGridRows] = useState([]);
    gridHasItemsRef.current = Array.isArray(gridRows) && gridRows.length > 0;

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState('');
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    
    const [sizeSearchInput, setSizeSearchInput] = useState('');
    const [scanSize, setScanSize] = useState('');
    const [scanSizeName, setScanSizeName] = useState('');

    const [scanQuantity, setScanQuantity] = useState('');
    const [scanRate, setScanRate] = useState('');
    const [scanMrp, setScanMrp] = useState('');
    const [scanClosingStock, setScanClosingStock] = useState('');
    const [scanBaseUom, setScanBaseUom] = useState('');
    const [scanAltUom, setScanAltUom] = useState('');
    const [scanFactor, setScanFactor] = useState('');
    const [scanQtyUnitMode, setScanQtyUnitMode] = useState('BASE');
    const [scanRateUnitMode, setScanRateUnitMode] = useState('BASE');
    
    const [itemPrices, setItemPrices] = useState([]); 
    const [itemStock, setItemStock] = useState({});
    const itemStockRef = useRef({});
    const [itemStockStatus, setItemStockStatus] = useState('idle');
    const scanUomInfoRef = useRef({ baseUom: '', options: [] });
    const defaultBaseRateRef = useRef(0);
    const rateTouchedRef = useRef(false);
    const sizeAutoShowAllRef = useRef(false);
    const invoiceDateInputRef = useRef(null);
    const invoiceDateBtnRef = useRef(null);
    const partyInputRef = useRef(null);
    const salesLedgerRef = useRef(null);
    const narrationRef = useRef(null);
    const [showDateEntryModal, setShowDateEntryModal] = useState(false);
    const [dateEntryInput, setDateEntryInput] = useState('');
    const dateEntryInputRef = useRef(null);
    const handleSaveRef = useRef(null);
    const [isSubmitSaving, setIsSubmitSaving] = useState(false);
    const isSubmitSavingRef = useRef(false);
    const footerModalStateRef = useRef({ other: false, exp: false, tender: false });
    const voucherDateInitializedRef = useRef(false);
    const [showPriceListModal, setShowPriceListModal] = useState(false);
    const [priceListModalHref, setPriceListModalHref] = useState('');
    const [priceListModalTitle, setPriceListModalTitle] = useState('Price List');

    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

    const [sizeSearchResults, setSizeSearchResults] = useState([]);
    const [showSizeSuggestions, setShowSizeSuggestions] = useState(false);
    const [focusedSizeSuggestionIndex, setFocusedSizeSuggestionIndex] = useState(-1);

    // Refs
    const scanInputRef = useRef(null);
    const initialScanFocusDoneRef = useRef(false);
    const scanSuggestWrapRef = useRef(null);
    const sizeInputRef = useRef(null);
    const sizeSuggestWrapRef = useRef(null);
    const quantityRef = useRef(null);
    const rateRef = useRef(null);
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);
    const storeSearchInputRef = useRef(null);
    const gridScrollContainerRef = useRef(null);
    const pendingGridScrollRef = useRef(false);
    const pendingGridScrollIndexRef = useRef(null);
    const partySuggestWrapRef = useRef(null);
    const partySelectedCodeRef = useRef('');
    const partyAutoSelectedRef = useRef(false);
    const salesLedgerSuggestWrapRef = useRef(null);
    const salesLedgerSelectedCodeRef = useRef('');
    const salesLedgerAutoSelectedRef = useRef(false);
    const ledMasterNameCacheRef = useRef(new Map());
    const partyNameLookupSeqRef = useRef(0);
    const salesLedgerNameLookupSeqRef = useRef(0);
    const gridRowsRef = useRef([]);
    const scanItemCodeRef = useRef('');
    const scanSearchInputRef = useRef('');
    const editingRowIndexRef = useRef(null);
    const showPriceListModalRef = useRef(false);
    const fetchItemDetailsRequestSeqRef = useRef(0);

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

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);
    const totalQty = React.useMemo(
        () => gridRows.reduce((sum, row) => sum + (parseFloat(row.quantity) || 0), 0),
        [gridRows]
    );

    const tranDateIso = invoiceDateInput;
    const selectedStoreCode = (isEditMode && voucherStoreCode) ? voucherStoreCode : (storeInfo?.storeCode || '');

    // Dynamic Ledger State
    const [otherSaleLedgers, setOtherSaleLedgers] = useState([]);
    const [otherSaleAmounts, setOtherSaleAmounts] = useState({});
    
    const [expensesLedgers, setExpensesLedgers] = useState([]);
    const [expensesAmounts, setExpensesAmounts] = useState({});
    
    const [tenderLedgers, setTenderLedgers] = useState([]);
    const [tenderAmounts, setTenderAmounts] = useState({});

    // Modal State
    const [showOtherSaleModal, setShowOtherSaleModal] = useState(false);
    const [showExpensesModal, setShowExpensesModal] = useState(false);
    const [showTenderModal, setShowTenderModal] = useState(false);
    const otherSaleInputRefs = useRef([]);
    const otherSaleDoneBtnRef = useRef(null);
    const expensesInputRefs = useRef([]);
    const expensesDoneBtnRef = useRef(null);
    const tenderInputRefs = useRef([]);
    const tenderDoneBtnRef = useRef(null);

    // Draft State
    const [drafts, setDrafts] = useState([]);
    const [showDrafts, setShowDrafts] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);

    // Derived Footer Values
    const otherSaleTotal = Object.values(otherSaleAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalSale = totalAmount + otherSaleTotal;
    const totalExp = Object.values(expensesAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalCollection = totalSale - totalExp;
    const totalTender = Object.values(tenderAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

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

    const handleInvoiceDateChange = (isoDate) => {
        if (isStoreUserBusinessDateLocked) return;
        if (!isoDate) return;
        setInvoiceDateInput(isoDate);
        setInvoiceDate(toDdMmYyyy(isoDate));
    };

    const openInvoiceDatePicker = () => {
        if (isStoreUserBusinessDateLocked) return;
        const el = invoiceDateInputRef.current;
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

    const getLastVoucherDateKeyForStore = useCallback((storeCode) => {
        const sc = String(storeCode || '').trim();
        return sc ? `RG_lastVoucherDate:sale:${sc}` : lastVoucherDateGlobalKey;
    }, []);

    const effectivePricingMethod = String(voucherConfig?.pricingMethod || 'MRP').trim().toUpperCase();

    const getRateForMethod = useCallback((priceInfo, method) => {
        if (!priceInfo) return '';
        if (method === 'MRP') return priceInfo.mrp || '';
        if (method === 'SALE_PRICE') return priceInfo.salePrice || '';
        if (method === 'PURCHASE_PRICE') return priceInfo.purchasePrice || '';
        return priceInfo.mrp || '';
    }, []);

    const getAltRateForMethod = useCallback((option, method) => {
        if (!option) return '';
        if (method === 'MRP') return option.mrp ?? '';
        if (method === 'SALE_PRICE') return option.salePrice ?? '';
        if (method === 'PURCHASE_PRICE') return option.purchasePrice ?? '';
        return option.mrp ?? '';
    }, [handlePrintComingSoon, openPriceListModalForSelectedItem, showDateEntryModal, showExpensesModal, showOtherSaleModal, showStoreModal, showTenderModal]);

    const getUomLabel = useCallback((codeRaw) => {
        const code = String(codeRaw || '').trim();
        if (!code) return '';
        const match = (Array.isArray(uoms) ? uoms : []).find(u => String(u?.code || '').trim().toLowerCase() === code.toLowerCase());
        return String(match?.name || code).trim() || code;
    }, [uoms]);

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

    const normalizeUnitToken = useCallback((val) => String(val || '').trim().toLowerCase(), []);

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
            const factorNum = getScanFactorNumber();
            const nextDisplayedRate =
                Number.isFinite(optRateNum) && optRateNum > 0
                    ? optRateNum
                    : (baseRate > 0 && factorNum > 0 ? baseRate * factorNum : 0);

            if (!rateTouchedRef.current || !String(scanRate || '').trim()) {
                setScanRate(nextDisplayedRate > 0 ? String(Number(nextDisplayedRate).toFixed(2)) : '');
                rateTouchedRef.current = false;
            }
            setScanRateUnitMode('ALT');
            return;
        }

        if (!rateTouchedRef.current || !String(scanRate || '').trim()) {
            setScanRate(baseRate > 0 ? String(Number(baseRate).toFixed(2)) : '');
            rateTouchedRef.current = false;
        }
        setScanRateUnitMode('BASE');
    }, [
        effectivePricingMethod,
        getAltRateForMethod,
        getBaseRateFromDisplayed,
        getScanFactorNumber,
        scanAltUom,
        scanRate,
        scanRateUnitMode
    ]);

    const DatePickerField = ({ label, valueDisplay, valueIso }) => (
        <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{label}</label>
            <div className="relative w-32 md:w-40">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <button
                    ref={invoiceDateBtnRef}
                    type="button"
                    onClick={openInvoiceDatePicker}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        e.stopPropagation();
                        requestAnimationFrame(() => scanInputRef.current?.focus?.());
                    }}
                    disabled={isStoreUserBusinessDateLocked}
                    className={`w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm outline-none shadow-sm text-left font-mono ${
                        isStoreUserBusinessDateLocked
                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                            : 'bg-white text-slate-700'
                    }`}
                >
                    {valueDisplay}
                </button>
                <input
                    ref={invoiceDateInputRef}
                    type="date"
                    value={valueIso}
                    onChange={(e) => handleInvoiceDateChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        e.stopPropagation();
                        requestAnimationFrame(() => scanInputRef.current?.focus?.());
                    }}
                    disabled={isStoreUserBusinessDateLocked}
                    className="sr-only"
                />
            </div>
        </div>
    );

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

    const handleModalInputKeyDown = (e, refs, idx, doneRef) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        const next = refs.current?.[idx + 1];
        if (next && typeof next.focus === 'function') {
            next.focus();
            return;
        }
        doneRef?.current?.focus?.();
    };

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchSalesLedgers();
        fetchPartySearchLedgers();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchUoms();
        fetchOtherSaleLedgers();
        fetchExpensesLedgers();
        fetchTenderLedgers();
        fetchVoucherConfig();
    }, []);

    useEffect(() => {
        if (showOtherSaleModal) {
            requestAnimationFrame(() => otherSaleInputRefs.current?.[0]?.focus?.());
        }
    }, [showOtherSaleModal, otherSaleLedgers.length]);

    useEffect(() => {
        if (showExpensesModal) {
            requestAnimationFrame(() => expensesInputRefs.current?.[0]?.focus?.());
        }
    }, [showExpensesModal, expensesLedgers.length]);

    useEffect(() => {
        if (showTenderModal) {
            requestAnimationFrame(() => tenderInputRefs.current?.[0]?.focus?.());
        }
    }, [showTenderModal, tenderLedgers.length]);

    useEffect(() => {
        if (!showOtherSaleModal && !showExpensesModal && !showTenderModal) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (showTenderModal) setShowTenderModal(false);
                else if (showExpensesModal) setShowExpensesModal(false);
                else if (showOtherSaleModal) setShowOtherSaleModal(false);
                return;
            }
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && String(e.key || '').toLowerCase() === 'd') {
                e.preventDefault();
                e.stopPropagation();
                if (showTenderModal) setShowTenderModal(false);
                else if (showExpensesModal) setShowExpensesModal(false);
                else if (showOtherSaleModal) setShowOtherSaleModal(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showOtherSaleModal, showExpensesModal, showTenderModal]);

    // Fetch Drafts when storeInfo is available
    useEffect(() => {
        if (storeInfo?.storeCode) {
            fetchDrafts();
        }
    }, [storeInfo]);

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
                const res = await axios.get(`/api/sales/details/${encodeURIComponent(invoiceNoParam)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.data?.success || !res.data?.data) {
                    return;
                }
                const draft = res.data.data;
                if (mode === 'edit') {
                    handleDraftSelect({
                        invoiceNo: draft.invoiceNo,
                        invoiceDate: draft.invoiceDate,
                        partyCode: draft.partyCode,
                        saleLed: draft.saleLed,
                        storeCode: draft.storeCode,
                        items: draft.items || []
                    });
                } else {
                    const storeCode = String(draft.storeCode || '').trim();
                    if (storeCode) {
                        setVoucherStoreCode(storeCode);
                        const match = (userStores || []).find(s => String(s?.storeCode || '').trim() === storeCode);
                        if (match) setStoreInfo(match);
                    }
                    const iso = toIsoDate(draft.invoiceDate);
                    if (iso) {
                        setInvoiceDateInput(iso);
                        setInvoiceDate(toDdMmYyyy(iso));
                    }
                    setSelectedParty(draft.partyCode || '');
                    salesLedgerAutoSelectedRef.current = false;
                    setSelectedSalesLedger(draft.saleLed || '');
                    setNarration(draft.narration || '');
                    const rows = (draft.items || []).map((item, index) => ({
                        id: index + 1,
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        sizeCode: item.sizeCode,
                        sizeName: item.sizeName,
                        quantity: item.quantity,
                        rate: item.price,
                        mrp: item.mrp,
                        amount: item.amount
                    }));
                    setGridRows(rows);
                    enrichGridRowsWithUom(rows);
                }

                const other = {};
                (draft.otherSaleDetails || []).forEach(e => {
                    if (e?.ledgerCode) other[e.ledgerCode] = e.amount;
                });
                const exp = {};
                (draft.expenseDetails || []).forEach(e => {
                    if (e?.ledgerCode) exp[e.ledgerCode] = e.amount;
                });
                const tender = {};
                (draft.tenderDetails || []).forEach(e => {
                    if (e?.ledgerCode) tender[e.ledgerCode] = e.amount;
                });
                setOtherSaleAmounts(other);
                setExpensesAmounts(exp);
                setTenderAmounts(tender);

                if (mode === 'duplicate') {
                    setSelectedDraft(null);
                    setShowDrafts(false);
                    setInvoiceNo('New');
                    const storeCode = String(draft.storeCode || '').trim();
                    if (storeCode) fetchNextInvoiceNo(storeCode);
                    initialScanFocusDoneRef.current = false;
                    requestAnimationFrame(() => partyInputRef.current?.focus?.());
                } else {
                    setSelectedDraft(null);
                    setShowDrafts(false);
                    initialScanFocusDoneRef.current = false;
                    requestAnimationFrame(() => partyInputRef.current?.focus?.());
                }
            } catch (e) {
                console.error('Error loading invoice', e);
            }
        };
        load();
    }, [location.search]);

    const handleDeleteVoucher = async () => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode !== 'edit' || !invoiceNo || invoiceNo === 'New') return;

        const result = await Swal.fire({
            title: 'Delete Voucher?',
            text: `Sale Invoice No: ${invoiceNo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/sales/${encodeURIComponent(invoiceNo)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data?.success) {
                Swal.fire({ title: 'Deleted', text: response.data.message || 'Voucher deleted', icon: 'success', timer: 1200, showConfirmButton: false }).then(() => {
                    if (isEmbedded()) {
                        requestCloseParentModal();
                        return;
                    }
                    navigate('/sales');
                });
            } else {
                Swal.fire('Error', response.data?.message || 'Failed to delete voucher', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Error deleting voucher', 'error');
        }
    };

    useEffect(() => {
        const refresh = async () => {
            if (!storeInfo?.storeCode || !tranDateIso) return;
            if (!scanItemCode) return;

            try {
                const token = localStorage.getItem('token');
                const stockRes = await axios.get(
                    `/api/inventory/stock/item?storeCode=${storeInfo.storeCode}&itemCode=${scanItemCode}&tranDate=${encodeURIComponent(tranDateIso)}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (stockRes.data?.success) {
                    const stock = stockRes.data.stock || {};
                    setItemStock(stock);
                    itemStockRef.current = stock;
                }

                if (scanSize) {
                    const response = await axios.get(
                        `/api/inventory/stock?storeCode=${storeInfo.storeCode}&itemCode=${scanItemCode}&sizeCode=${scanSize}&tranDate=${encodeURIComponent(tranDateIso)}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (response.data?.success) {
                        setScanClosingStock(response.data.closing || 0);
                    }
                }
            } catch (e) {
                console.error("Error refreshing closing stock for invoice date", e);
            }
        };
        refresh();
    }, [tranDateIso, storeInfo?.storeCode, scanItemCode, scanSize]);

    const fetchDrafts = async () => {
        if (!storeInfo?.storeCode) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/sales/drafts?storeCode=${storeInfo.storeCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDrafts(response.data);
        } catch (error) {
            console.error("Error fetching drafts", error);
        }
    };

    const handleDraftSelect = async (draft) => {
        if (!draft?.invoiceNo) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/sales/details/${encodeURIComponent(draft.invoiceNo)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.data?.success || !res.data?.data) return;
            const data = res.data.data;

            setSelectedDraft(data);
            setInvoiceNo(data.invoiceNo);
            if (data.storeCode) {
                setVoucherStoreCode(data.storeCode);
            }
            const iso = toIsoDate(data.invoiceDate);
            if (iso) setInvoiceDateInput(iso);
            setInvoiceDate(toDdMmYyyy(iso || data.invoiceDate));
            setSelectedParty(data.partyCode);
            salesLedgerAutoSelectedRef.current = false;
            setSelectedSalesLedger(data.saleLed || '');
            setNarration(data.narration || '');

            const rows = (data.items || []).map((item, index) => ({
                id: index + 1,
                itemCode: item.itemCode,
                itemName: item.itemName,
                sizeCode: item.sizeCode,
                sizeName: item.sizeName,
                quantity: item.quantity,
                rate: item.price,
                mrp: item.mrp,
                amount: item.amount
            }));
            setGridRows(rows);
            enrichGridRowsWithUom(rows);

            const other = {};
            (data.otherSaleDetails || []).forEach(e => {
                if (e?.ledgerCode) other[e.ledgerCode] = e.amount;
            });
            const exp = {};
            (data.expenseDetails || []).forEach(e => {
                if (e?.ledgerCode) exp[e.ledgerCode] = e.amount;
            });
            const tender = {};
            (data.tenderDetails || []).forEach(e => {
                if (e?.ledgerCode) tender[e.ledgerCode] = e.amount;
            });
            setOtherSaleAmounts(other);
            setExpensesAmounts(exp);
            setTenderAmounts(tender);

            setShowDrafts(false);
            initialScanFocusDoneRef.current = false;
            requestAnimationFrame(() => partyInputRef.current?.focus?.());
        } catch (error) {
            console.error("Error loading draft details", error);
            showMessage("Error loading draft details", 'error');
        }
    };

    const handleDeleteDraft = async (draft, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const result = await Swal.fire({
            title: 'Delete Draft?',
            text: `Draft Invoice No: ${draft?.invoiceNo}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/sales/drafts/${encodeURIComponent(draft.invoiceNo)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data?.success) {
                setDrafts(prev => prev.filter(d => d.invoiceNo !== draft.invoiceNo));

                if (selectedDraft?.invoiceNo === draft.invoiceNo) {
                    setSelectedDraft(null);
                    resetForm();
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

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode === 'edit') {
            return;
        }
        if (!voucherDateInitializedRef.current && storeInfo?.storeCode) {
            voucherDateInitializedRef.current = true;
            let iso = '';
            if (isStoreUserBusinessDateLocked && storeInfo?.businessDate) {
                iso = toIsoDate(storeInfo.businessDate);
            } else {
                const isStoreUser = String(userRole || '').trim().toUpperCase() === 'STORE USER';
                if (isStoreUser) {
                    iso = toIsoDate(new Date());
                } else {
                    const stored = getLastVoucherDateAll() || normalizeToIsoDate(localStorage.getItem(lastVoucherDateGlobalKey));
                    if (stored) {
                        iso = stored;
                        setLastVoucherDateAll(stored);
                    } else {
                        iso = toIsoDate(new Date());
                    }
                }
            }
            if (iso) {
                setInvoiceDateInput(iso);
                setInvoiceDate(toDdMmYyyy(iso));
            }
        }
        if (storeInfo?.storeCode && (!invoiceNo || invoiceNo === 'New')) {
            fetchNextInvoiceNo(storeInfo.storeCode);
        }
        if (storeInfo?.partyLed) {
            setSelectedParty(storeInfo.partyLed);
        }
    }, [storeInfo, location.search, invoiceNo, getLastVoucherDateKeyForStore]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const mode = params.get('mode');
        if (mode === 'edit') return;
        if (!isStoreUserBusinessDateLocked) return;
        const iso = toIsoDate(storeInfo?.businessDate);
        if (!iso) return;
        if (invoiceDateInput !== iso) setInvoiceDateInput(iso);
        const display = toDdMmYyyy(iso);
        if (invoiceDate !== display) setInvoiceDate(display);
    }, [invoiceDate, invoiceDateInput, isStoreUserBusinessDateLocked, location.search, storeInfo?.businessDate]);

    useEffect(() => {
        if (!addModeRef.current) return;
        if (!invoiceDateInput) return;
        if (String(userRole || '').trim().toUpperCase() === 'STORE USER') return;
        setLastVoucherDateAll(invoiceDateInput);
    }, [invoiceDateInput, userRole]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F2') return;
            e.preventDefault();
            if (isStoreUserBusinessDateLocked) return;
            if (showDateEntryModal) return;
            if (showStoreModal) return;
            if (footerModalStateRef.current.other || footerModalStateRef.current.exp || footerModalStateRef.current.tender) return;
            setDateEntryInput('');
            setShowDateEntryModal(true);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isStoreUserBusinessDateLocked, showDateEntryModal, showStoreModal]);

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
            if (showDateEntryModal || showStoreModal || showOtherSaleModal || showExpensesModal || showTenderModal) return;
            if (footerModalStateRef.current.other || footerModalStateRef.current.exp || footerModalStateRef.current.tender) return;
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
            if (key === 'o') {
                e.preventDefault();
                e.stopPropagation();
                setShowOtherSaleModal(true);
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
                setScanRate('');
                setScanQuantity('');
                setScanMrp('');
                setScanClosingStock('');
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                setScanQtyUnitMode('BASE');
                setScanRateUnitMode('BASE');
                scanUomInfoRef.current = { baseUom: '', options: [] };
                defaultBaseRateRef.current = 0;
                rateTouchedRef.current = false;
                setTimeout(() => scanInputRef.current?.focus?.(), 0);
                return;
            }
            if (key === 'e') {
                e.preventDefault();
                e.stopPropagation();
                setShowExpensesModal(true);
                return;
            }
            if (key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveRef.current === 'function') handleSaveRef.current('DRAFT');
                return;
            }
            if (key === 't') {
                e.preventDefault();
                e.stopPropagation();
                setShowTenderModal(true);
                return;
            }
            if (key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (typeof handleSaveRef.current === 'function') handleSaveRef.current('SUBMITTED');
                return;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

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

    useEffect(() => {
        if (!showStoreModal) return;

        setStoreSearchQuery('');
        const all = Array.isArray(userStores) ? userStores : [];
        const idx = selectedStoreCode ? all.findIndex(s => s?.storeCode === selectedStoreCode) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setTimeout(() => {
            if (storeSearchInputRef.current) storeSearchInputRef.current.focus();
        }, 0);
    }, [showStoreModal, selectedStoreCode, userStores]);

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
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowStoreModal(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showStoreModal]);

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
        if (focusedPartySuggestionIndex >= 0 && showPartySuggestions) {
            const element = document.getElementById(`suggestion-party-${focusedPartySuggestionIndex}`);
            if (element && typeof element.scrollIntoView === 'function') {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedPartySuggestionIndex, showPartySuggestions]);

    useEffect(() => {
        if (focusedSalesLedgerSuggestionIndex >= 0 && showSalesLedgerSuggestions) {
            const element = document.getElementById(`suggestion-sales-ledger-${focusedSalesLedgerSuggestionIndex}`);
            if (element && typeof element.scrollIntoView === 'function') {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedSalesLedgerSuggestionIndex, showSalesLedgerSuggestions]);

    const partyLedgerSuggestionSource = useMemo(() => {
        const list = Array.isArray(partySearchLedgers) ? partySearchLedgers : [];
        const seen = new Set();
        return list.filter(l => {
            const code = String(l?.code ?? '').trim();
            if (!code) return false;
            if (seen.has(code)) return false;
            seen.add(code);
            const status = l?.status;
            const isActive = status == null || status === 1 || status === true;
            return isActive;
        });
    }, [partySearchLedgers]);

    const partySuggestionResults = useMemo(() => {
        const q = String(partySearchInput || '').trim().toLowerCase();

        const list = (Array.isArray(parties) ? parties : [])
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
    }, [partySearchInput, parties, partyLedgerSuggestionSource]);

    const salesLedgerSuggestionResults = useMemo(() => {
        const q = String(salesLedgerSearchInput || '').trim().toLowerCase();

        return (Array.isArray(salesLedgers) ? salesLedgers : [])
            .filter(ledger => {
                if (!q) return true;
                const name = String(ledger?.name || '').toLowerCase();
                const code = String(ledger?.code || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            })
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
            .slice(0, 60)
            .map(ledger => ({
                key: `SL:${ledger.code}`,
                code: String(ledger.code || '').trim(),
                name: String(ledger.name || '').trim()
            }))
            .filter(x => x.code);
    }, [salesLedgerSearchInput, salesLedgers]);

    useEffect(() => {
        const code = String(selectedParty || '').trim();
        if (!code) {
            setPartySearchInput('');
            partySelectedCodeRef.current = '';
            return;
        }
        if (partySelectedCodeRef.current === code) return;

        const partyMatch = (Array.isArray(parties) ? parties : []).find(p => String(p?.code || '').trim() === code);
        const cached = ledMasterNameCacheRef.current?.get?.(code);
        const nextLabel = String(partyMatch?.name || cached || code).trim();
        setPartySearchInput(nextLabel);
        partySelectedCodeRef.current = code;

        if (!partyMatch && !cached) {
            const seq = ++partyNameLookupSeqRef.current;
            (async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/led-masters/by-code/${encodeURIComponent(code)}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
                    const lm = res?.data?.success ? res?.data?.ledMaster : null;
                    const name = String(lm?.name || '').trim();
                    if (!name) return;
                    ledMasterNameCacheRef.current?.set?.(code, name);
                    if (partyNameLookupSeqRef.current !== seq) return;
                    if (String(selectedParty || '').trim() !== code) return;
                    setPartySearchInput(name);
                } catch {}
            })();
        }
    }, [selectedParty, parties]);

    useEffect(() => {
        const code = String(selectedSalesLedger || '').trim();
        if (!code) {
            setSalesLedgerSearchInput('');
            salesLedgerSelectedCodeRef.current = '';
            return;
        }
        if (salesLedgerSelectedCodeRef.current === code) return;

        const salesLedgerMatch = (Array.isArray(salesLedgers) ? salesLedgers : [])
            .find(ledger => String(ledger?.code || '').trim() === code);
        const cached = ledMasterNameCacheRef.current?.get?.(code);
        const nextLabel = String(salesLedgerMatch?.name || cached || code).trim();
        setSalesLedgerSearchInput(nextLabel);
        salesLedgerSelectedCodeRef.current = code;

        if (!salesLedgerMatch && !cached) {
            const seq = ++salesLedgerNameLookupSeqRef.current;
            (async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/led-masters/by-code/${encodeURIComponent(code)}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
                    const lm = res?.data?.success ? res?.data?.ledMaster : null;
                    const name = String(lm?.name || '').trim();
                    if (!name) return;
                    ledMasterNameCacheRef.current?.set?.(code, name);
                    if (salesLedgerNameLookupSeqRef.current !== seq) return;
                    if (String(selectedSalesLedger || '').trim() !== code) return;
                    setSalesLedgerSearchInput(name);
                } catch {}
            })();
        }
    }, [selectedSalesLedger, salesLedgers]);

    useEffect(() => {
        const list = Array.isArray(parties) ? parties : [];
        const currentCode = String(selectedParty || '').trim();
        const isUserEditing =
            String(partySearchInput || '').trim() !== '' ||
            Boolean(showPartySuggestions);
        const storeDefaultRaw = String(storeInfo?.partyLed || '').trim();

        if (currentCode) return;
        if (isUserEditing) return;

        if (storeDefaultRaw) {
            const match = list.find(p => String(p?.code || '').trim() === storeDefaultRaw)
                || list.find(p => String(p?.name || '').trim().toLowerCase() === storeDefaultRaw.toLowerCase());
            const nextCode = String(match?.code || storeDefaultRaw).trim();
            if (nextCode) {
                partyAutoSelectedRef.current = true;
                setSelectedParty(nextCode);
                return;
            }
        }

        const first = list[0];
        const code = String(first?.code || '').trim();
        if (!code) return;
        partyAutoSelectedRef.current = true;
        setSelectedParty(code);
    }, [parties, partySearchInput, selectedParty, showPartySuggestions, storeInfo?.partyLed]);

    useEffect(() => {
        const list = Array.isArray(salesLedgers) ? salesLedgers : [];
        const currentCode = String(selectedSalesLedger || '').trim();
        const currentExists = currentCode && list.some(ledger => String(ledger?.code || '').trim() === currentCode);
        const isUserEditing =
            String(salesLedgerSearchInput || '').trim() !== '' ||
            Boolean(showSalesLedgerSuggestions);

        if (currentCode && !currentExists) {
            salesLedgerAutoSelectedRef.current = false;
            setSelectedSalesLedger('');
            setSalesLedgerSearchInput('');
            salesLedgerSelectedCodeRef.current = '';
            return;
        }

        const storeDefaultRaw = String(storeInfo?.saleLed || '').trim();
        if (currentCode) {
            if (!isUserEditing && salesLedgerAutoSelectedRef.current && storeDefaultRaw) {
                const match = list.find(l => String(l?.code || '').trim() === storeDefaultRaw)
                    || list.find(l => String(l?.name || '').trim().toLowerCase() === storeDefaultRaw.toLowerCase());
                const code = String(match?.code || '').trim();
                if (code && code !== currentCode) {
                    salesLedgerAutoSelectedRef.current = true;
                    setSelectedSalesLedger(code);
                }
            }
            return;
        }

        if (isUserEditing) return;

        if (storeDefaultRaw) {
            const match = list.find(l => String(l?.code || '').trim() === storeDefaultRaw)
                || list.find(l => String(l?.name || '').trim().toLowerCase() === storeDefaultRaw.toLowerCase());
            const code = String(match?.code || '').trim();
            if (code) {
                salesLedgerAutoSelectedRef.current = true;
                setSelectedSalesLedger(code);
                return;
            }
            if (!list.length) {
                const fallbackCode = String(storeDefaultRaw || '').trim();
                if (fallbackCode) {
                    salesLedgerAutoSelectedRef.current = true;
                    setSelectedSalesLedger(fallbackCode);
                    return;
                }
            }
        }

        const first = list[0];
        const code = String(first?.code || '').trim();
        if (!code) return;
        salesLedgerAutoSelectedRef.current = true;
        setSelectedSalesLedger(code);
    }, [selectedSalesLedger, salesLedgers, salesLedgerSearchInput, showSalesLedgerSuggestions, storeInfo?.saleLed]);

    const handlePartyInputChange = (e) => {
        const value = e.target.value;
        setPartySearchInput(value);
        partyAutoSelectedRef.current = false;
        setSelectedParty('');
        partySelectedCodeRef.current = '';
        setFocusedPartySuggestionIndex(-1);
        setShowPartySuggestions(true);
    };

    const handleSelectPartySuggestion = (row) => {
        const code = String(row?.code || '').trim();
        const name = String(row?.name || '').trim();
        if (!code) return;
        partyAutoSelectedRef.current = false;
        setSelectedParty(code);
        setPartySearchInput(name || code);
        partySelectedCodeRef.current = code;
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
        setTimeout(() => {
            try {
                narrationRef.current?.focus?.();
            } catch {}
        }, 0);
    };

    const handleSalesLedgerInputChange = (e) => {
        const value = e.target.value;
        setSalesLedgerSearchInput(value);
        salesLedgerAutoSelectedRef.current = false;
        setSelectedSalesLedger('');
        salesLedgerSelectedCodeRef.current = '';
        setFocusedSalesLedgerSuggestionIndex(-1);
        setShowSalesLedgerSuggestions(true);
    };

    const handleSelectSalesLedgerSuggestion = (row) => {
        const code = String(row?.code || '').trim();
        const name = String(row?.name || '').trim();
        if (!code) return;
        salesLedgerAutoSelectedRef.current = false;
        setSelectedSalesLedger(code);
        setSalesLedgerSearchInput(name || code);
        salesLedgerSelectedCodeRef.current = code;
        setShowSalesLedgerSuggestions(false);
        setFocusedSalesLedgerSuggestionIndex(-1);
        setTimeout(() => {
            try {
                narrationRef.current?.focus?.();
                narrationRef.current?.select?.();
            } catch {}
        }, 0);
    };

    const handlePartyKeyDown = (e) => {
        if (e.key === 'Escape') {
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
                if (list[idx]) handleSelectPartySuggestion(list[idx]);
                requestAnimationFrame(() => salesLedgerRef.current?.focus?.());
                return;
            }
            requestAnimationFrame(() => salesLedgerRef.current?.focus?.());
        }
    };

    const handleSalesLedgerKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (!showSalesLedgerSuggestions) return;
            e.preventDefault();
            e.stopPropagation();
            setShowSalesLedgerSuggestions(false);
            setFocusedSalesLedgerSuggestionIndex(-1);
            return;
        }

        const list = salesLedgerSuggestionResults;
        if (e.key === ' ' && String(salesLedgerSearchInput || '').trim() === '') {
            if (!list.length) return;
            e.preventDefault();
            e.stopPropagation();
            setShowSalesLedgerSuggestions(true);
            setFocusedSalesLedgerSuggestionIndex(0);
            return;
        }

        if (!list.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showSalesLedgerSuggestions) {
                setShowSalesLedgerSuggestions(true);
                setFocusedSalesLedgerSuggestionIndex(0);
                return;
            }
            setFocusedSalesLedgerSuggestionIndex(prev => {
                const next = prev < 0 ? 0 : prev + 1;
                return next >= list.length ? list.length - 1 : next;
            });
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!showSalesLedgerSuggestions) {
                setShowSalesLedgerSuggestions(true);
                setFocusedSalesLedgerSuggestionIndex(list.length - 1);
                return;
            }
            setFocusedSalesLedgerSuggestionIndex(prev => {
                const next = prev < 0 ? list.length - 1 : prev - 1;
                return next < 0 ? 0 : next;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSalesLedgerSuggestions || String(salesLedgerSearchInput || '').trim() === '') {
                const idx = (focusedSalesLedgerSuggestionIndex >= 0 && focusedSalesLedgerSuggestionIndex < list.length)
                    ? focusedSalesLedgerSuggestionIndex
                    : 0;
                if (list[idx]) handleSelectSalesLedgerSuggestion(list[idx]);
                requestAnimationFrame(() => narrationRef.current?.focus?.());
                return;
            }
            requestAnimationFrame(() => narrationRef.current?.focus?.());
        }
    };

    // --- API Calls ---
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

    const fetchOtherSaleLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/filter?type=Sale&screen=Sale', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sortedLedgers = (response.data || []).sort((a, b) => {
                const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
            });
            setOtherSaleLedgers(sortedLedgers);
        } catch (error) {
            console.error("Error fetching other sale ledgers", error);
        }
    };

    const fetchExpensesLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/filter?type=Expense&screen=Sale', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sortedLedgers = (response.data || []).sort((a, b) => {
                const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
            });
            setExpensesLedgers(sortedLedgers);
        } catch (error) {
            console.error("Error fetching expenses ledgers", error);
        }
    };

    const fetchTenderLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/filter?type=Tender&screen=Sale', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sortedLedgers = (response.data || []).sort((a, b) => {
                const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
            });
            setTenderLedgers(sortedLedgers);
        } catch (error) {
            console.error("Error fetching tender ledgers", error);
        }
    };

    const fetchVoucherConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/voucher-config/SALE', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data && response.data.success) {
                setVoucherConfig(response.data.config);
            }
        } catch (error) {
            console.error("Error fetching voucher config", error);
        }
    };

    const fetchParties = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/led-masters/by-group-names', {
                params: { names: 'Sundry Debtors,Sundry Creditors' },
                headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined
            });
            if (response.data && response.data.success) {
                setParties(response.data.ledMasters || []);
            } else {
                setParties([]);
            }
        } catch (error) {
            console.error("Error fetching parties", error);
            setParties([]);
        }
    };

    const fetchSalesLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/led-masters/by-group-names', {
                params: { names: 'Sales Accounts,Purchase Accounts' },
                headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined
            });

            if (response.data?.success) {
                setSalesLedgers(response.data.ledMasters || []);
            } else {
                setSalesLedgers([]);
            }
        } catch (error) {
            console.error("Error fetching sales ledgers", error);
            setSalesLedgers([]);
        }
    };

    const fetchPartySearchLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/ledgers', token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
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

    const fetchNextInvoiceNo = async (storeCode) => {
        try {
            const params = storeCode ? { storeCode } : {};
            const response = await axios.get('/api/sales/generate-invoice-no', { params });
            setInvoiceNo(response.data);
        } catch (error) {
            console.error("Error fetching invoice no", error);
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
                // #region debug-point B:sales-store-bootstrap
                fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"warehouse-store-pill",runId:"pre-fix",hypothesisId:"B",location:"SalesEntry.js:fetchStoreInfo",msg:"[DEBUG] Sales store bootstrap",data:{userName:String(user.userName||""),role:String(user.role||""),mappedCount:Array.isArray(all)?all.length:-1,firstStore:String(all?.[0]?.storeCode||""),storeLocked:Boolean(storeLocked),storeCodeParam:String(storeCodeParam||"")},ts:Date.now()})}).catch(()=>{});
                // #endregion
                setUserStores(all);
                if (all.length > 0) {
                    setStoreInfo(all[0]);
                    if (!storeLocked && !storeCodeParam) {
                        setVoucherStoreCode(String(all[0]?.storeCode || '').trim());
                    }
                } else if (!storeLocked) {
                    setStoreInfo(null);
                    setVoucherStoreCode('');
                }
            } catch (error) {
                console.error("Error fetching store info", error);
            }
        }
    };

    const openStoreModal = useCallback(() => {
        if (!canPickStore) return;
        const all = Array.isArray(userStores) ? userStores : [];
        if (all.length === 0) return;
        setStoreSearchQuery('');
        const idx = selectedStoreCode ? all.findIndex(s => s?.storeCode === selectedStoreCode) : -1;
        setFocusedStoreIndex(idx >= 0 ? idx : (all.length > 0 ? 0 : -1));
        setShowStoreModal(true);
        setTimeout(() => storeSearchInputRef.current?.focus(), 50);
    }, [canPickStore, selectedStoreCode, userStores]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (footerModalStateRef.current.other || footerModalStateRef.current.exp || footerModalStateRef.current.tender) return;
            e.preventDefault();
            e.stopPropagation();
            openStoreModal();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [openStoreModal]);

    const applyStoreSelection = async (store) => {
        if (!store?.storeCode) return;
        if (storeInfo?.storeCode === store.storeCode) {
            setShowStoreModal(false);
            requestAnimationFrame(() => scanInputRef.current?.focus?.());
            return;
        }

        const hasUnsaved =
            (gridRows && gridRows.length > 0) ||
            Object.keys(otherSaleAmounts || {}).length > 0 ||
            Object.keys(expensesAmounts || {}).length > 0 ||
            Object.keys(tenderAmounts || {}).length > 0;

        if (hasUnsaved) {
            const result = await Swal.fire({
                title: 'Change Store?',
                text: 'Current voucher will be cleared.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Change',
                cancelButtonText: 'Cancel',
                customClass: {
                    container: 'z-[10001]'
                }
            });
            if (!result.isConfirmed) return;
        }

        setShowStoreModal(false);
        setVoucherStoreCode(store.storeCode);
        setStoreInfo(store);
        partyAutoSelectedRef.current = false;
        setSelectedParty('');
        setPartySearchInput('');
        partySelectedCodeRef.current = '';
        salesLedgerAutoSelectedRef.current = false;
        setSelectedSalesLedger('');
        setSalesLedgerSearchInput('');
        salesLedgerSelectedCodeRef.current = '';
        requestAnimationFrame(() => partyInputRef.current?.focus?.());
    };

    useEffect(() => {
        if (initialScanFocusDoneRef.current) return;
        if (showStoreModal || showDateEntryModal || showOtherSaleModal || showExpensesModal || showTenderModal || showDrafts) return;
        const effectiveStoreCode = storeInfo?.storeCode || voucherStoreCode;
        if (!effectiveStoreCode) return;
        initialScanFocusDoneRef.current = true;
        requestAnimationFrame(() => partyInputRef.current?.focus?.());
    }, [showStoreModal, showDateEntryModal, showOtherSaleModal, showExpensesModal, showTenderModal, showDrafts, storeInfo?.storeCode, voucherStoreCode]);

    const fetchItemDetails = async (code, options = {}) => {
        const raw = String(code || '').trim();
        if (!raw) return false;
        const currentStoreCode = storeInfo?.storeCode;
        if (!currentStoreCode) return false;
        const normalize = (v) => String(v || '').trim();
        const preferredSizeCode = normalize(options?.preferredSizeCode);
        const preserveQuantity = options?.preserveQuantity === true;
        const openSizeChooser = options?.openSizeChooser === true;
        const focusScanItem = options?.focusScanItem === true;
        const requestSeq = ++fetchItemDetailsRequestSeqRef.current;
        const isLatestRequest = () => fetchItemDetailsRequestSeqRef.current === requestSeq;

        try {
            const token = localStorage.getItem('token');
            const encodedItemCode = encodeURIComponent(raw);
            const pricesPromise = axios.get(`/api/prices/item/${encodedItemCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const stockPromise = axios.get(
                `/api/inventory/stock/item?storeCode=${encodeURIComponent(currentStoreCode)}&itemCode=${encodedItemCode}&tranDate=${encodeURIComponent(tranDateIso)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setItemStock({});
            itemStockRef.current = {};
            setItemStockStatus(currentStoreCode ? 'loading' : 'idle');

            stockPromise.then((stockResponse) => {
                if (!isLatestRequest()) return;
                if (stockResponse && stockResponse.data && stockResponse.data.success) {
                    const stockMap = stockResponse.data.stock || {};
                    setItemStock(stockMap);
                    itemStockRef.current = stockMap;
                    setItemStockStatus('loaded');
                } else {
                    setItemStockStatus(currentStoreCode ? 'error' : 'idle');
                }
            }).catch(() => {
                if (!isLatestRequest()) return;
                setItemStockStatus(currentStoreCode ? 'error' : 'idle');
            });

            const pricesResponse = await pricesPromise;
            if (!isLatestRequest()) return false;

            if (pricesResponse.data.success) {
                const prices = pricesResponse.data.prices || [];
                setItemPrices(prices);
                
                let itemName = '';
                let itemCode = raw;

                if (prices.length > 0) {
                    itemName = prices[0].itemName;
                } else {
                    const itemResponse = await axios.get(`/api/items/search?query=${encodeURIComponent(raw)}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!isLatestRequest()) return false;
                    if (itemResponse.data.success && itemResponse.data.items.length > 0) {
                         const lower = raw.toLowerCase();
                         const item = itemResponse.data.items.find(i => String(i?.itemCode || '').trim().toLowerCase() === lower) || itemResponse.data.items[0];
                         itemName = item.itemName;
                         itemCode = item.itemCode;
                    } else {
                        showMessage('Item not found', 'warning');
                        requestAnimationFrame(() => {
                            try {
                                scanInputRef.current?.focus?.();
                                scanInputRef.current?.select?.();
                            } catch {}
                        });
                        return false;
                    }
                }

                setScanItemName(itemName || '');
                setScanItemCode(itemCode);
                setScanSearchInput(itemName || itemCode);
                setShowSuggestions(false);
                if (!preserveQuantity) setScanQuantity('');
                setScanBaseUom('');
                setScanAltUom('');
                setScanFactor('');
                scanUomInfoRef.current = { baseUom: '', options: [] };
                defaultBaseRateRef.current = 0;
                rateTouchedRef.current = false;
                
                const availableSizesForAuto = getAvailableSizesForScan(prices, null, 'loading');
                let selectedSize = null;
                if (preferredSizeCode) {
                    selectedSize = availableSizesForAuto.find(s => normalize(s?.code).toLowerCase() === preferredSizeCode.toLowerCase()) || null;
                }
                if (!selectedSize && availableSizesForAuto.length > 0) {
                    selectedSize = availableSizesForAuto[0];
                }

                if (selectedSize) {
                    applyScanSizeSelection(selectedSize, prices, null, {
                        focusQuantity: false,
                        closeSuggestions: false,
                        itemCodeOverride: itemCode
                    });
                    sizeAutoShowAllRef.current = true;
                    setSizeSearchResults(availableSizesForAuto);
                    setFocusedSizeSuggestionIndex(
                        Math.max(0, availableSizesForAuto.findIndex(s => normalize(s?.code) === normalize(selectedSize?.code)))
                    );
                    setShowSizeSuggestions(true);
                } else {
                    sizeAutoShowAllRef.current = true;
                    setScanSize('');
                    setScanSizeName('');
                    setSizeSearchInput('');
                    setScanRate('');
                    setScanMrp('');
                    setScanClosingStock('');
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    defaultBaseRateRef.current = 0;
                }

                requestAnimationFrame(() => {
                    if (!isLatestRequest()) return;
                    sizeInputRef.current?.focus?.();
                    sizeInputRef.current?.select?.();
                });
                return true;
            }
            showMessage('Item not found', 'warning');
            requestAnimationFrame(() => {
                try {
                    scanInputRef.current?.focus?.();
                    scanInputRef.current?.select?.();
                } catch {}
            });
            return false;
        } catch (error) {
            console.error("Error fetching item details", error);
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

    const fetchStock = async (itemCode, sizeCode) => {
        const currentStoreCode = storeInfo?.storeCode;
        if (!currentStoreCode || !itemCode || !sizeCode) {
            setScanClosingStock('');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/inventory/stock?storeCode=${encodeURIComponent(currentStoreCode)}&itemCode=${encodeURIComponent(String(itemCode))}&sizeCode=${encodeURIComponent(String(sizeCode))}&tranDate=${encodeURIComponent(tranDateIso)}`, {
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

    const applyScanSizeSelection = useCallback((size, pricesOverride, stockOverride, options = {}) => {
        if (!size) return false;

        const { focusQuantity = true, closeSuggestions = true, itemCodeOverride = '' } = options;
        const prices = Array.isArray(pricesOverride) ? pricesOverride : itemPrices;
        const stockMap = stockOverride && typeof stockOverride === 'object' ? stockOverride : itemStockRef.current;
        const targetCode = String(size?.code || '').trim();
        const targetName = String(size?.name || '').trim();
        if (!targetCode) return false;

        sizeAutoShowAllRef.current = false;
        setScanSize(targetCode);
        setScanSizeName(targetName || targetCode);
        setSizeSearchInput(targetName || targetCode);
        if (closeSuggestions) {
            setShowSizeSuggestions(false);
        }

        const priceInfo = prices.find(p => String(p?.sizeCode || '').trim() === targetCode);
        let rate = '';
        let mrp = '';
        if (priceInfo) {
            rate = getRateForMethod(priceInfo, effectivePricingMethod);
            mrp = priceInfo.mrp || '';
            setScanBaseUom(String(priceInfo.uom || '').trim());
            setScanAltUom(String(priceInfo.altUom || '').trim());
            setScanFactor(priceInfo.factor !== undefined && priceInfo.factor !== null ? String(priceInfo.factor) : '');
            scanUomInfoRef.current = {
                baseUom: String(priceInfo.uom || '').trim(),
                options: String(priceInfo.altUom || '').trim() && parseFloat(priceInfo.factor) > 0
                    ? [{
                        altUom: String(priceInfo.altUom || '').trim(),
                        factor: String(priceInfo.factor),
                        purchasePrice: priceInfo.purchasePrice,
                        salePrice: priceInfo.salePrice,
                        mrp: priceInfo.mrp
                    }]
                    : []
            };
        } else {
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            scanUomInfoRef.current = { baseUom: '', options: [] };
        }

        setScanRate(rate);
        setScanQtyUnitMode('BASE');
        setScanRateUnitMode('BASE');
        defaultBaseRateRef.current = parseFloat(rate) || 0;
        rateTouchedRef.current = false;
        setScanMrp(mrp);
        setScanClosingStock(stockMap?.[targetCode] ?? '');

        if (String(priceInfo?.altUom || '').trim() && parseFloat(priceInfo?.factor) > 0) {
            fetchUomMapForScan(itemCodeOverride || scanItemCode, targetCode);
        }
        fetchStock(itemCodeOverride || scanItemCode, targetCode);

        if (focusQuantity) {
            requestAnimationFrame(() => quantityRef.current?.focus?.());
        }
        return true;
    }, [effectivePricingMethod, fetchStock, fetchUomMapForScan, getRateForMethod, itemPrices, scanItemCode]);

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
            if (rateUnitMode === 'ALT' && canUseAlt && Number.isFinite(rateNum)) {
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
            const sizeCode = String(r?.sizeCode || '').trim();
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
                const sizeCode = String(r?.sizeCode || '').trim();
                const key = itemCode && sizeCode ? `${itemCode}__${sizeCode}` : '';
                const info = key ? infoByKey.get(key) : null;
                const nextBaseUom = String(r?.baseUom || info?.baseUom || '').trim() || '';
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

    // --- Handlers ---
    // Item Scan
    const handleScanInputChange = (e) => {
        const value = e.target.value;
        const preserveEditValues = editingRowIndexRef.current !== null && editingRowIndexRef.current >= 0;
        setScanSearchInput(value);
        setScanItemCode('');
        setScanItemName('');
        setFocusedSuggestionIndex(-1);
        setItemPrices([]);
        setScanSize('');
        setScanSizeName('');
        setSizeSearchInput('');
        setScanRate('');
        if (!preserveEditValues) setScanQuantity('');
        setScanMrp('');
        setScanClosingStock('');
        setScanBaseUom('');
        setScanAltUom('');
        setScanFactor('');
        setScanQtyUnitMode('BASE');
        setScanRateUnitMode('BASE');
        scanUomInfoRef.current = { baseUom: '', options: [] };
        defaultBaseRateRef.current = 0;
        rateTouchedRef.current = false;
        
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
                    
                    if (storeInfo?.storeCode && voucherConfig?.isNegativeInventoryAllowed !== true) {
                        url = `/api/inventory/search-available?storeCode=${storeInfo.storeCode}&query=${value}&tranDate=${encodeURIComponent(tranDateIso)}`;
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

    const handleSelectSuggestion = async (item) => {
        const preserveEditValues = editingRowIndexRef.current !== null && editingRowIndexRef.current >= 0;
        const currentSizeCode = String(scanSize || '').trim();
        if (!preserveEditValues) setScanQuantity('');
        setScanBaseUom('');
        setScanAltUom('');
        setScanFactor('');
        setScanQtyUnitMode('BASE');
        setScanRateUnitMode('BASE');
        scanUomInfoRef.current = { baseUom: '', options: [] };
        defaultBaseRateRef.current = 0;
        rateTouchedRef.current = false;
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
                    const preserveEditValues = editingRowIndexRef.current !== null && editingRowIndexRef.current >= 0;
                    const currentSizeCode = String(scanSize || '').trim();
                    ok = await fetchItemDetails(scanSearchInput, {
                        preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                        preserveQuantity: preserveEditValues,
                        openSizeChooser: preserveEditValues,
                        focusScanItem: false
                    });
                }
            } else {
                const preserveEditValues = editingRowIndexRef.current !== null && editingRowIndexRef.current >= 0;
                const currentSizeCode = String(scanSize || '').trim();
                ok = await fetchItemDetails(scanSearchInput, {
                    preferredSizeCode: preserveEditValues ? currentSizeCode : '',
                    preserveQuantity: preserveEditValues,
                    openSizeChooser: preserveEditValues,
                    focusScanItem: false
                });
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

    const getAvailableSizesForScan = useCallback((pricesArg, stockArg, stockStatusArg) => {
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
            const prices = Array.isArray(pricesArg) ? pricesArg : [];
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
        const effectiveStockStatus = stockStatusArg || itemStockStatus;
        if (!negativeAllowed && effectiveStockStatus === 'loaded') {
            const stock = (stockArg && typeof stockArg === 'object') ? stockArg : {};
            sizes = (Array.isArray(sizes) ? sizes : []).filter(s => (stock[normalize(s?.code)] || 0) > 0);
        }

        return Array.isArray(sizes) ? sizes : [];
    }, [activeSizes, itemStockStatus, voucherConfig?.isNegativeInventoryAllowed, voucherConfig?.showAllSize]);

    useEffect(() => {
        if (!scanItemCode) return;
        if (!scanSize) return;

        const normalizedSelected = String(scanSize || '').trim().toLowerCase();
        if (!normalizedSelected) return;

        const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);
        const stillAvailable = availableSizes.some(size => String(size?.code || '').trim().toLowerCase() === normalizedSelected);
        if (stillAvailable) return;

        sizeAutoShowAllRef.current = true;
        setScanSize('');
        setScanSizeName('');
        setSizeSearchInput('');
        setFocusedSizeSuggestionIndex(-1);
        setShowSizeSuggestions(false);
    }, [
        getAvailableSizesForScan,
        itemPrices,
        itemStockStatus,
        scanItemCode,
        scanSize,
        voucherConfig?.isNegativeInventoryAllowed,
        voucherConfig?.showAllSize
    ]);

    // Size Handlers
    const handleSizeInputChange = (e) => {
        const value = e.target.value;
        sizeAutoShowAllRef.current = !value;
        setSizeSearchInput(value);
        setScanSize('');
        setScanSizeName('');
        setFocusedSizeSuggestionIndex(-1);
        
        const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);

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
        const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);
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

        const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);
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
        itemStock,
        activeSizes
    ]);

    const handleSelectSize = (size) => {
        applyScanSizeSelection(size, itemPrices, itemStockRef.current, { focusQuantity: true, closeSuggestions: true });
    };

    const handleSizeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showSizeSuggestions && focusedSizeSuggestionIndex >= 0) {
                handleSelectSize(sizeSearchResults[focusedSizeSuggestionIndex]);
            } else {
                const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);
                const lower = String(sizeSearchInput || '').toLowerCase();
                const exactMatch = availableSizes.find(s =>
                    String(s?.code || '').toLowerCase() === lower || String(s?.name || '').toLowerCase() === lower
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

            const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current, itemStockStatus);
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

    const handleQuantityKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const parsedQty = parseQtyWithUnit(scanQuantity);
            const enteredQtyNum = parsedQty?.qtyNum ?? 0;
            if (!parsedQty?.ok) {
                showMessage("Invalid Qty format. Use like 2c or 2.5c", 'warning');
                return;
            }
            if (!enteredQtyNum || enteredQtyNum <= 0) {
                const availableSizes = getAvailableSizesForScan(itemPrices, itemStockRef.current);
                const currentSizeIndex = availableSizes.findIndex(s => s.code === scanSize);
                let nextSize = null;
                
                if (currentSizeIndex !== -1) {
                    for (let i = currentSizeIndex + 1; i < availableSizes.length; i++) {
                        nextSize = availableSizes[i];
                        break;
                    }
                }

                if (nextSize) {
                    applyScanSizeSelection(nextSize, itemPrices, itemStockRef.current, { focusQuantity: false, closeSuggestions: true });
                    setScanQuantity('');
                    requestAnimationFrame(() => quantityRef.current?.focus?.());
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
                    setScanBaseUom('');
                    setScanAltUom('');
                    setScanFactor('');
                    setScanQtyUnitMode('BASE');
                    setScanRateUnitMode('BASE');
                    setItemPrices([]);
                    setItemStock({});
                    itemStockRef.current = {};
                    scanUomInfoRef.current = { baseUom: '', options: [] };
                    defaultBaseRateRef.current = 0;
                    rateTouchedRef.current = false;
                    
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

    const handleRateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    // Other Handlers
    const handleOtherSaleChange = (code, value) => {
        if (value === '') {
            setOtherSaleAmounts(prev => ({ ...prev, [code]: '' }));
            return;
        }
        if (value === '-') {
            setOtherSaleAmounts(prev => ({ ...prev, [code]: value }));
            return;
        }
        const val = parseFloat(value);
        if (isNaN(val)) return;
        setOtherSaleAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleExpenseChange = (code, value) => {
        if (value === '') {
            setExpensesAmounts(prev => ({ ...prev, [code]: '' }));
            return;
        }
        if (value === '-') {
            setExpensesAmounts(prev => ({ ...prev, [code]: value }));
            return;
        }
        const val = parseFloat(value);
        if (isNaN(val)) return;
        setExpensesAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleTenderAmountChange = (code, value) => {
        if (value === '') {
             setTenderAmounts(prev => ({ ...prev, [code]: '' }));
             return;
        }
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;

        const currentOtherTotal = Object.entries(tenderAmounts)
            .filter(([k]) => k !== code)
            .reduce((sum, [_, v]) => sum + (parseFloat(v) || 0), 0);
            
        if (currentOtherTotal + val > totalCollection + 0.01) {
             showMessage(`Total tender cannot exceed Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
             return; 
        }

        setTenderAmounts(prev => ({ ...prev, [code]: value }));
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
        const parsedQty = parseQtyWithUnit(scanQuantity);
        if (!parsedQty?.ok) {
            showMessage("Invalid Qty format. Use like 2c or 2.5c", 'warning');
            return;
        }
        if (!parsedQty?.qtyNum || parsedQty.qtyNum <= 0) {
            showMessage("Please enter valid Quantity", 'warning');
            return;
        }

        const qtyEntered = parsedQty.qtyNum;
        let unitMode = scanQtyUnitMode === 'ALT' ? 'ALT' : 'BASE';
        let factorNum = unitMode === 'ALT' ? getScanFactorNumber() : 0;

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
                    factorNum = parseFloat(factorStr) || getScanFactorNumber();
                }
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

        const qty = qtyBaseInt;
        const availableStock = parseFloat(scanClosingStock) || 0;
        
        // Check if adding new quantity exceeds stock (considering existing grid quantity)
        const existingQty = gridRows.reduce((sum, row) => {
            if (row.itemCode === scanItemCode && row.sizeCode === scanSize) {
                return sum + (row.quantity || 0);
            }
            return sum;
        }, 0);
        
        if (voucherConfig?.isNegativeInventoryAllowed !== true && existingQty + qty > availableStock) {
            showMessage(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
            return;
        }

        const rateEntered = parseFloat(scanRate) || 0;
        const rateBase = unitMode === 'ALT' ? (rateEntered / factorNum) : rateEntered;
        const mrp = parseFloat(scanMrp) || 0;
        if (!(Number.isFinite(rateEntered) && rateEntered > 0 && Number.isFinite(rateBase) && rateBase > 0)) {
            showMessage('Amount cannot be 0. Please enter Rate.', 'warning');
            return;
        }
        const amount = qtyBaseRaw * rateBase;

        setGridRows(prev => {
            if (editingRowIndex !== null && editingRowIndex >= 0 && editingRowIndex < prev.length) {
                const otherQtySameKey = prev.reduce((sum, r, idx) => {
                    if (idx === editingRowIndex) return sum;
                    if (r.itemCode === scanItemCode && r.sizeCode === scanSize) return sum + (r.quantity || 0);
                    return sum;
                }, 0);
                if (voucherConfig?.isNegativeInventoryAllowed !== true && otherQtySameKey + qty > availableStock) {
                    showMessage(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
                    return prev;
                }

                const updatedRows = [...prev];
                updatedRows[editingRowIndex] = {
                    ...updatedRows[editingRowIndex],
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    sizeCode: scanSize,
                    sizeName: scanSizeName,
                    rate: rateBase,
                    mrp: mrp,
                    quantity: qty,
                    amount,
                    closingStock: scanClosingStock,
                    displayQuantity: qtyEntered,
                    enteredRate: rateEntered,
                    baseUom: scanBaseUom,
                    altUom: scanAltUom,
                    factor: scanFactor,
                    qtyUnitMode: unitMode,
                    rateUnitMode: unitMode
                };
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
                const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
                if (existingIndex >= 0) {
                    const updatedRows = [...prev];
                    const existingRow = updatedRows[existingIndex];
                    const newQuantity = existingRow.quantity + qty;
                    const newAmount = newQuantity * rateBase;

                    updatedRows[existingIndex] = {
                        ...existingRow,
                        quantity: newQuantity,
                        amount: newAmount,
                        rate: rateBase,
                        mrp: mrp,
                        closingStock: scanClosingStock,
                        displayQuantity: newQuantity,
                        enteredRate: rateBase,
                        baseUom: scanBaseUom,
                        altUom: scanAltUom,
                        factor: scanFactor,
                        qtyUnitMode: 'BASE',
                        rateUnitMode: 'BASE'
                    };
                    pendingGridScrollRef.current = true;
                    pendingGridScrollIndexRef.current = existingIndex;
                    return updatedRows;
                }
            }

            const newRow = {
                id: Date.now(),
                itemCode: scanItemCode,
                itemName: scanItemName,
                sizeCode: scanSize,
                sizeName: scanSizeName,
                rate: rateBase,
                mrp: mrp,
                quantity: qty,
                amount,
                closingStock: scanClosingStock,
                displayQuantity: qtyEntered,
                enteredRate: rateEntered,
                baseUom: scanBaseUom,
                altUom: scanAltUom,
                factor: scanFactor,
                qtyUnitMode: unitMode,
                rateUnitMode: unitMode
            };
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
            setScanSizeName('');
            setSizeSearchInput('');
            setScanRate('');
            setScanQuantity('');
            setScanMrp('');
            setScanClosingStock('');
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            setItemPrices([]);
            setItemStock({});
            itemStockRef.current = {};
            scanUomInfoRef.current = { baseUom: '', options: [] };
            defaultBaseRateRef.current = 0;
            rateTouchedRef.current = false;
            if (scanInputRef.current) scanInputRef.current.focus();
            return;
        }

        // Determine next state (Auto-advance Size)
        const availableSizesForNext = getAvailableSizesForScan(itemPrices, itemStockRef.current);
        const currentSizeIndex = availableSizesForNext.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1) {
            for (let i = currentSizeIndex + 1; i < availableSizesForNext.length; i++) {
                nextSize = availableSizesForNext[i];
                break;
            }
        }

        if (nextSize) {
            // Keep Item, Advance to Next Size
            applyScanSizeSelection(nextSize, itemPrices, itemStockRef.current, { focusQuantity: false, closeSuggestions: true });
            setScanQuantity('');
            requestAnimationFrame(() => quantityRef.current?.focus?.());

        } else {
            // Reset Scan Line
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
            setScanBaseUom('');
            setScanAltUom('');
            setScanFactor('');
            setScanQtyUnitMode('BASE');
            setScanRateUnitMode('BASE');
            setItemPrices([]);
            setItemStock({});
            itemStockRef.current = {};
            scanUomInfoRef.current = { baseUom: '', options: [] };
            defaultBaseRateRef.current = 0;
            rateTouchedRef.current = false;
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleRemoveRow = (index) => {
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
        setScanSize(row.sizeCode || '');
        const resolvedSizeName =
            row.sizeName ||
            prices.find(p => String(p?.sizeCode || '').trim() === String(row.sizeCode || '').trim())?.sizeName ||
            row.sizeCode ||
            '';
        setScanSizeName(resolvedSizeName);
        setSizeSearchInput(resolvedSizeName);
        setScanQuantity(String(row.displayQuantity ?? row.quantity ?? ''));
        setScanRate(String(row.enteredRate ?? row.rate ?? ''));
        setScanMrp(String(row.mrp ?? ''));
        setScanClosingStock(String(row.closingStock ?? ''));
        setScanBaseUom(String(row.baseUom || '').trim());
        setScanAltUom(String(row.altUom || '').trim());
        setScanFactor(row.factor !== undefined && row.factor !== null ? String(row.factor) : '');
        setScanQtyUnitMode(String(row.qtyUnitMode || 'BASE').trim() === 'ALT' ? 'ALT' : 'BASE');
        setScanRateUnitMode(String(row.rateUnitMode || row.qtyUnitMode || 'BASE').trim() === 'ALT' ? 'ALT' : 'BASE');
        defaultBaseRateRef.current = parseFloat(row.rate) || 0;
        rateTouchedRef.current = false;
        if (row.itemCode && row.sizeCode) {
            fetchUomMapForScan(row.itemCode, row.sizeCode);
            fetchStock(row.itemCode, row.sizeCode);
        }
        requestAnimationFrame(() => {
            try {
                scanInputRef.current?.focus?.();
                scanInputRef.current?.select?.();
            } catch {}
        });
    };

    const handleSave = async (status = 'SUBMITTED') => {
        if (!selectedParty) {
            showMessage('Please select a Party Name', 'warning');
            return;
        }

        if (!selectedSalesLedger) {
            showMessage('Please select a Sales Ledger', 'warning');
            return;
        }

        if (gridRows.length === 0) {
            showMessage('Please add at least one item', 'warning');
            return;
        }

        const effectiveStoreCode = String(voucherStoreCode || storeInfo?.storeCode || '').trim();
        if (!effectiveStoreCode) {
            showMessage('Store information missing. Cannot save.', 'error');
            return;
        }

        // Calculate Totals
        const gridTotal = totalAmount;
        const totalCollection = gridTotal + otherSaleTotal - totalExp;

        // Validate Total Payment vs Collection ONLY if SUBMITTED
        if (status === 'SUBMITTED') {
            if (totalTender > totalCollection + 0.01) { 
                showMessage(`Total tender (₹${totalTender.toFixed(2)}) cannot exceed Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
                return;
            }

            if (Math.abs(totalTender - totalCollection) > 0.01) {
                showMessage(`Total tender (₹${totalTender.toFixed(2)}) must match Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
                return;
            }
        }

        const otherSaleDetails = Object.entries(otherSaleAmounts)
            .map(([code, val]) => ({ ledgerCode: code, amount: parseFloat(val) }))
            .filter(e => !isNaN(e.amount) && e.amount !== 0);

        const expenseDetails = Object.entries(expensesAmounts)
            .map(([code, val]) => ({ ledgerCode: code, amount: parseFloat(val) }))
            .filter(e => !isNaN(e.amount) && e.amount !== 0);

        const tenderDetails = Object.entries(tenderAmounts)
            .filter(([_, val]) => parseFloat(val) > 0)
            .map(([code, val]) => ({ ledgerCode: code, amount: parseFloat(val) }));

        const itemsPayload = gridRows.map(row => ({
            itemCode: row.itemCode,
            sizeCode: row.sizeCode,
            mrp: row.mrp || 0,
            price: row.rate || 0,
            quantity: row.quantity,
            amount: row.amount
        }));

        const user = JSON.parse(localStorage.getItem('user') || '{}');

        const payload = {
            invoiceNo,
            invoiceDate,
            partyCode: selectedParty,
            Sale_Led: selectedSalesLedger,
            narration,
            saleAmount: gridTotal,
            tenderType: 'Split',
            storeCode: effectiveStoreCode,
            userId: user.id,
            userName: user.userName,
            status, // Add status to payload
            editMode: isEditMode,
            
            otherSale: otherSaleTotal,
            totalExpenses: totalExp,
            totalTender: totalTender,

            otherSaleDetails,
            expenseDetails,
            tenderDetails,
            items: itemsPayload
        };

        if (status === 'SUBMITTED') {
            if (isSubmitSavingRef.current) return;
            isSubmitSavingRef.current = true;
            setIsSubmitSaving(true);
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/sales/save', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.success) {
                try {
                    const key = getLastVoucherDateKeyForStore(effectiveStoreCode);
                    localStorage.setItem(key, invoiceDateInput);
                    localStorage.setItem(lastVoucherDateGlobalKey, invoiceDateInput);
                    if (String(userRole || '').trim().toUpperCase() !== 'STORE USER') {
                        setLastVoucherDateAll(invoiceDateInput);
                    }
                } catch {}
                if (status === 'DRAFT') {
                    Swal.fire({
                        title: 'Success',
                        text: `Draft Saved Successfully. No: ${response.data.invoiceNo}`,
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        setSelectedDraft(null);
                        setShowDrafts(false);
                        fetchDrafts();
                        resetForm();
                        requestCloseParentModal();
                    });
                } else {
                    Swal.fire({
                        title: 'Success',
                        text: `Invoice Saved Successfully. Invoice No: ${response.data.invoiceNo}`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        requestCloseParentModal();
                    });
                    resetForm();
                }
            } else {
                 showMessage(response.data.message || 'Failed to save invoice', 'error');
            }
        } catch (error) {
            console.error("Error saving invoice", error);
            const errorMsg = error.response?.data?.message || 'Failed to save invoice';
            showMessage(errorMsg, 'error');
        } finally {
            if (status === 'SUBMITTED') {
                isSubmitSavingRef.current = false;
                setIsSubmitSaving(false);
            }
        }
    };

    handleSaveRef.current = handleSave;
    footerModalStateRef.current = {
        other: showOtherSaleModal,
        exp: showExpensesModal,
        tender: showTenderModal
    };

    const resetForm = () => {
        setGridRows([]);
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
        setScanBaseUom('');
        setScanAltUom('');
        setScanFactor('');
        setScanQtyUnitMode('BASE');
        setScanRateUnitMode('BASE');
        setItemPrices([]);
        setItemStock({});
        itemStockRef.current = {};
        scanUomInfoRef.current = { baseUom: '', options: [] };
        defaultBaseRateRef.current = 0;
        rateTouchedRef.current = false;
        
        setOtherSaleAmounts({});
        setExpensesAmounts({});
        setTenderAmounts({});

        setSelectedParty(storeInfo?.partyLed || '');
        setSelectedSalesLedger('');
        setNarration('');
        setInvoiceNo('New');
        let iso = '';
        const isStoreUser = String(userRole || '').trim().toUpperCase() === 'STORE USER';
        const isLocked = isStoreUser && storeInfo?.isDsrDisabled === false;
        if (isLocked && storeInfo?.businessDate) {
            iso = toIsoDate(storeInfo.businessDate);
        } else if (isStoreUser) {
            iso = toIsoDate(new Date());
        } else {
            iso = getLastVoucherDateAll() ||
                normalizeToIsoDate(localStorage.getItem(lastVoucherDateGlobalKey)) ||
                invoiceDateInput ||
                toIsoDate(new Date());
            if (iso) setLastVoucherDateAll(iso);
        }
        setInvoiceDateInput(iso);
        setInvoiceDate(toDdMmYyyy(iso));
        fetchNextInvoiceNo(storeInfo?.storeCode);
        initialScanFocusDoneRef.current = false;
        requestAnimationFrame(() => partyInputRef.current?.focus?.());
    };

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-2 flex flex-col items-center justify-center font-sans">
            <div className="w-full h-[100dvh] sm:h-[95vh] sm:max-w-[98%] lg:max-w-[95%] bg-white sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Header Section */}
                <div className="flex flex-col border-b border-slate-200 bg-white shrink-0 relative z-[100]">
                    {/* Row 1: Title & Store */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">Sales Voucher</h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDrafts(!showDrafts);
                                        if (!showDrafts) fetchDrafts();
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        showDrafts
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    title="Drafts"
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
                                    <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] max-h-96 overflow-y-auto">
                                        {drafts.length === 0 ? (
                                            <div className="p-4 text-center text-slate-500 text-sm">No drafts found</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {drafts.map(draft => (
                                                    <div
                                                        key={draft.invoiceNo}
                                                        onClick={() => handleDraftSelect(draft)}
                                                        className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors group"
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                                                                {draft.invoiceNo}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    {draft.invoiceDate}
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
                                                        <div className="text-xs text-slate-500">
                                                            {draft.partyCode}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {storeInfo && (
                                <button
                                    type="button"
                                    onClick={openStoreModal}
                                    className={`flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm ${
                                        canPickStore && !isEditMode ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all' : 'cursor-default'
                                    }`}
                                    title={canPickStore && !isEditMode ? 'Click to change store' : undefined}
                                >
                                    <div className="bg-indigo-100 p-1 rounded-full">
                                        <Store className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                            {selectedStoreCode}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700 font-sans tracking-tight">
                                            {storeInfo.storeName}
                                        </span>
                                    </div>
                                    {canPickStore && !isEditMode && (
                                        <Search className="w-4 h-4 text-slate-400" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Controls (Party, Date, Invoice) */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6 px-4 py-3 bg-slate-50/50">
                        {/* Party */}
                        <div className="flex flex-col gap-2 w-full md:flex-1 md:max-w-3xl">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Search Party</label>
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
                                <div className="w-full md:w-auto">
                                    <div className="flex items-center gap-2 md:min-w-[260px]">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Sales Ledger</label>
                                        <div ref={salesLedgerSuggestWrapRef} className="relative flex-1">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <Search className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <input
                                                ref={salesLedgerRef}
                                                type="text"
                                                value={salesLedgerSearchInput}
                                                onChange={handleSalesLedgerInputChange}
                                                onKeyDown={handleSalesLedgerKeyDown}
                                                onFocus={() => {
                                                    setShowSalesLedgerSuggestions(false);
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        const wrap = salesLedgerSuggestWrapRef.current;
                                                        if (wrap && wrap.contains(document.activeElement)) return;
                                                        setShowSalesLedgerSuggestions(false);
                                                        setFocusedSalesLedgerSuggestionIndex(-1);
                                                    }, 0);
                                                }}
                                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                placeholder="Search Ledger"
                                            />
                                            {showSalesLedgerSuggestions && salesLedgerSuggestionResults.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {salesLedgerSuggestionResults.map((row, idx) => (
                                                        <div
                                                            key={row.key}
                                                            id={`suggestion-sales-ledger-${idx}`}
                                                            className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 ${
                                                                idx === focusedSalesLedgerSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                            }`}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectSalesLedgerSuggestion(row);
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
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Narration</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    ref={narrationRef}
                                    value={narration}
                                    onChange={(e) => setNarration(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        requestAnimationFrame(() => invoiceDateBtnRef.current?.focus?.());
                                    }}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Date & Invoice Container */}
                        <div className="flex items-center justify-between gap-4 md:gap-6 md:ml-auto">
                            {/* Date */}
                            <DatePickerField label="Date" valueDisplay={invoiceDate} valueIso={tranDateIso} />

                            {/* Invoice No */}
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice No</label>
                                <div className="bg-indigo-50 px-4 py-1.5 rounded border border-indigo-100 text-indigo-700 font-bold text-sm font-mono shadow-sm">
                                    {invoiceNo}
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                const max = filteredUserStores.length - 1;
                                                setFocusedStoreIndex(prev => Math.min(max, Math.max(0, prev < 0 ? 0 : prev + 1)));
                                                return;
                                            }
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                const max = filteredUserStores.length - 1;
                                                setFocusedStoreIndex(prev => Math.max(0, Math.min(max, prev < 0 ? 0 : prev - 1)));
                                                return;
                                            }
                                            if (e.key === 'Enter') {
                                                const idx = focusedStoreIndex;
                                                if (idx >= 0 && filteredUserStores[idx]) {
                                                    e.preventDefault();
                                                    applyStoreSelection(filteredUserStores[idx]);
                                                }
                                            }
                                        }}
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
                                                        : selectedStoreCode === s.storeCode
                                                            ? 'bg-indigo-50 border border-indigo-100'
                                                            : 'hover:bg-slate-50 border border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={`p-2 rounded-lg ${
                                                        idx === focusedStoreIndex || selectedStoreCode === s.storeCode ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'
                                                    }`}>
                                                        <Store className={`w-4 h-4 ${
                                                            idx === focusedStoreIndex || selectedStoreCode === s.storeCode ? 'text-indigo-600' : 'text-slate-400'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-indigo-600">{s.storeCode}</div>
                                                        <div className="text-sm font-bold text-slate-700">{s.storeName}</div>
                                                    </div>
                                                </div>
                                                {selectedStoreCode === s.storeCode && (
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

                {/* Grid */}
                <div ref={gridScrollContainerRef} className="flex-1 overflow-auto bg-white relative">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-50 shadow-sm">
                            <tr>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center border-b border-slate-200">#</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">ITEM DETAILS</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 border-b border-slate-200">SIZE</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 border-b border-slate-200">QTY</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36 border-b border-slate-200">RATE</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-40 border-b border-slate-200">AMOUNT</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16 text-center border-b border-slate-200">ACTION</th>
                            </tr>
                            
                            {/* Input Row */}
                            <tr className="bg-indigo-50/30 border-b border-indigo-100">
                                <td className="py-2 px-3 text-center text-xs font-bold text-slate-400">●</td>
                                <td ref={scanSuggestWrapRef} className="py-2 px-3 relative">
                                    <div className="relative">
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Search className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input 
                                            ref={scanInputRef}
                                            type="text" 
                                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium uppercase transition-all"
                                            placeholder="Scan or Search Item..."
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
                                        />
                                    </div>
                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute left-3 right-3 z-[60] bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto ring-1 ring-black/5">
                                            {searchResults.map((item, index) => (
                                                <div 
                                                    key={item.itemCode}
                                                    id={`suggestion-item-${index}`}
                                                    className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 ${
                                                        index === focusedSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectSuggestion(item);
                                                    }}
                                                >
                                                    <div className="font-medium text-sm text-slate-700">{item.itemName}</div>
                                                    <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                                        <span>Code: {item.itemCode}</span>
                                                        <span>Price: ₹{item.salePrice}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td ref={sizeSuggestWrapRef} className="py-2 px-3 relative">
                                    <input 
                                        ref={sizeInputRef}
                                        type="text"
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center transition-all"
                                        placeholder="Size"
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
                                        disabled={!scanItemCode}
                                    />
                                    {showSizeSuggestions && sizeSearchResults.length > 0 && (
                                        <div className="absolute left-3 right-3 z-[60] bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto ring-1 ring-black/5">
                                            {sizeSearchResults.map((size, index) => {
                                                const stock = itemStockRef.current[size.code] !== undefined ? itemStockRef.current[size.code] : 0;
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
                                                    key={size.id}
                                                    id={`suggestion-size-${index}`}
                                                    className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 text-center flex items-center justify-between group ${
                                                        index === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectSize(size);
                                                    }}
                                                >
                                                    <div className="text-sm text-slate-700">{size.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        STK ({invoiceDate}): <span className={stock > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{stock}</span>
                                                        {' | '}
                                                        Price: {priceDisplay}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </td>
                                <td className="py-2 px-3">
                                    <div className="flex flex-col">
                                        <input 
                                            ref={quantityRef}
                                            type="text"
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center font-bold text-slate-700 transition-all"
                                            placeholder={scanBaseUom ? `Qty (${scanBaseUom}${scanAltUom ? `/${scanAltUom}` : ''})` : 'Qty'}
                                            value={scanQuantity}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setScanQuantity(val);

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
                                                        const factorStr = resolved.factor !== undefined && resolved.factor !== null ? String(resolved.factor) : '';
                                                        if (altCode) setScanAltUom(altCode);
                                                        if (factorStr) setScanFactor(factorStr);
                                                        syncRateForUnitMode('ALT');
                                                    } else {
                                                        syncRateForUnitMode('BASE');
                                                    }
                                                    return;
                                                }

                                                if (parsed?.ok && !parsed?.hasUnit) {
                                                    setScanQtyUnitMode('BASE');
                                                    setScanRateUnitMode('BASE');
                                                    syncRateForUnitMode('BASE');
                                                }
                                            }}
                                            onKeyDown={handleQuantityKeyDown}
                                            disabled={!scanSize}
                                        />
                                        {scanClosingStock !== '' && (
                                            <span className="text-[9px] text-center text-slate-500 mt-0.5">
                                                Stock ({invoiceDate}): {scanClosingStock}{scanBaseUom ? ` ${scanBaseUom}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-2 px-3">
                                    <input 
                                        ref={rateRef}
                                        type="number" 
                                        min="0"
                                        className={`w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-right transition-all ${
                                            voucherConfig?.isPriceEditable === false ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                                        }`}
                                        placeholder={scanRateUnitMode === 'ALT' && scanAltUom ? `Rate / ${scanAltUom}` : (scanBaseUom ? `Rate / ${scanBaseUom}` : 'Rate')}
                                        value={scanRate}
                                        onChange={(e) => {
                                            setScanRate(e.target.value);
                                            rateTouchedRef.current = true;
                                        }}
                                        onKeyDown={handleRateKeyDown}
                                        disabled={!scanSize || voucherConfig?.isPriceEditable === false}
                                    />
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-700 text-sm">
                                    {((parseQtyWithUnit(scanQuantity)?.qtyNum || 0) * (parseFloat(scanRate) || 0)).toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                    <button 
                                        onClick={handleAddItem}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-1.5 shadow-sm transition-colors"
                                        title="Add Item"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gridRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-10 text-center text-slate-400 text-sm">
                                        No items added yet. Scan or search for an item to begin.
                                    </td>
                                </tr>
                            ) : gridRows.map((row, index) => {
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
                                    String(row?.rateUnitMode || row?.qtyUnitMode || '').trim().toUpperCase() === 'ALT' &&
                                    hasAltConversion &&
                                    row.enteredRate !== undefined &&
                                    row.enteredRate !== null;
                                const primaryRateValue = primaryRateIsAlt ? row.enteredRate : (row.rate ?? row.enteredRate);
                                const secondaryAltRate = hasAltConversion ? (Number(row.rate || 0) * factorNum) : null;
                                const primaryRateUom = primaryRateIsAlt ? altUomLabel : baseUomLabel;
                                return (
                                <tr key={row.id || index} data-row-index={index} className="hover:bg-slate-50 transition-colors group">
                                    <td className="py-2 px-3 text-xs text-slate-400 text-center">{index + 1}</td>
                                    <td className="py-2 px-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700">{row.itemName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{row.itemCode}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                                            {row.sizeName}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 text-center font-medium text-slate-700">
                                        <div className="flex flex-col items-center">
                                            <span>{formatVoucherQty(primaryQtyValue)}</span>
                                            {primaryQtyUom ? (
                                                <span className="text-[10px] text-slate-400 font-mono">{primaryQtyUom}</span>
                                            ) : null}
                                            {primaryQtyIsAlt && baseUomLabel ? (
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {formatVoucherQty(row.quantity)} {baseUomLabel}
                                                </span>
                                            ) : null}
                                            {!primaryQtyIsAlt && row.altUom ? (
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {row.factor !== undefined && row.factor !== null && parseFloat(row.factor) > 0
                                                        ? `${formatVoucherQty(secondaryAltQty)} ${altUomLabel}`
                                                        : `${altUomLabel}`}
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600 font-mono text-xs">
                                        <div className="flex flex-col items-end">
                                            <span>{primaryRateValue}</span>
                                            {primaryRateUom ? (
                                                <span className="text-[10px] text-slate-400">/ {primaryRateUom}</span>
                                            ) : null}
                                            {primaryRateIsAlt && baseUomLabel ? (
                                                <span className="text-[10px] text-slate-400">
                                                    ₹{Number(row.rate || 0).toFixed(2)} / {baseUomLabel}
                                                </span>
                                            ) : null}
                                            {!primaryRateIsAlt && row.altUom ? (
                                                <span className="text-[10px] text-slate-400">
                                                    {row.factor !== undefined && row.factor !== null && parseFloat(row.factor) > 0
                                                        ? `₹${Number(secondaryAltRate || 0).toFixed(2)} / ${altUomLabel}`
                                                        : `/ ${altUomLabel}`}
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-indigo-600">
                                        ₹{row.amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => handleEditRow(row, index)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                title="Edit Item"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(index)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                title="Remove Item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="bg-white px-4 py-2 border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex flex-col gap-2">
                        {/* Main Footer Grid */}
                        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-between">
                            
                            {/* Column 1: Grand Total */}
                            <div className="flex items-center gap-2 justify-center md:justify-start order-1 md:order-none">
                                <span className="text-xs font-semibold text-slate-600">Grand Total</span>
                                <div className="text-xl font-bold text-slate-800">
                                    ₹ {totalAmount.toFixed(2)}
                                </div>
                            </div>

                            {/* Column 1b: Total Qty */}
                            <div className="flex items-center gap-2 justify-center md:justify-start order-2 md:order-none">
                                <span className="text-xs font-semibold text-slate-600">Total Qty</span>
                                <div className="text-xl font-bold text-slate-800">
                                    {totalQty}
                                </div>
                            </div>

                            {/* Column 2: Other Sale */}
                            <div className="w-full md:w-32 order-4 md:order-none">
                                <button 
                                    onClick={() => setShowOtherSaleModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        otherSaleTotal !== 0 
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                >
                                    {renderHotkeyLabel(
                                        otherSaleTotal !== 0 ? `Other Sale: ₹ ${otherSaleTotal.toFixed(2)}` : 'Other Sale',
                                        'O'
                                    )}
                                </button>
                            </div>

                            {/* Column 3: Expenses */}
                            <div className="w-full md:w-32 order-5 md:order-none">
                                <button 
                                    onClick={() => setShowExpensesModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        totalExp !== 0 
                                        ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700' 
                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                    {renderHotkeyLabel(totalExp !== 0 ? `Expenses: ₹ ${totalExp.toFixed(2)}` : 'Expenses', 'E')}
                                </button>
                            </div>

                            {/* Column 4: Total Collection */}
                            <div className="flex items-center gap-2 justify-center md:justify-start order-2 md:order-none">
                                <span className="text-xs font-bold text-slate-800">Total Collection</span>
                                <div className="text-lg font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    ₹ {totalCollection.toFixed(2)}
                                </div>
                            </div>

                            {/* Column 5: Print */}
                            <div className="w-full md:w-32 order-5 md:order-none">
                                <VoucherPrintButton
                                    onClick={handlePrintComingSoon}
                                    className="w-full px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded shadow-sm transition-colors gap-1 text-xs flex items-center justify-center border border-slate-300"
                                >
                                    {renderHotkeyLabel('Print', 'P')}
                                </VoucherPrintButton>
                            </div>

                            {/* Column 6: Save Draft */}
                            <div className="w-full md:w-32 order-5 md:order-none">
                                <button
                                    onClick={() => handleSave('DRAFT')}
                                    className="w-full px-2 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded shadow-sm transition-colors gap-1 text-xs flex items-center justify-center border border-slate-600"
                                    title="Save as Draft"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{renderHotkeyLabel('Save Draft', 'F')}</span>
                                </button>
                            </div>

                            {/* Column 7: Tender */}
                            <div className="w-full md:w-32 order-6 md:order-none">
                                <button 
                                    onClick={() => setShowTenderModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        totalTender > 0 
                                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                >
                                    {renderHotkeyLabel(totalTender > 0 ? `Tender: ₹ ${totalTender.toFixed(2)}` : 'Tender', 'T')}
                                </button>
                            </div>

                            {/* Column 8: Delete (Edit Mode) */}
                            {isEditMode && (
                                <div className="w-full md:w-32 order-7 md:order-none">
                                    <button
                                        onClick={handleDeleteVoucher}
                                        className="w-full px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded shadow-sm transition-colors gap-1 text-xs flex items-center justify-center border border-rose-600"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            )}

                            {/* Column 9: Submit */}
                            <div className="w-full md:w-32 order-8 md:order-none">
                                <button
                                    onClick={() => handleSave('SUBMITTED')}
                                    disabled={isSubmitSaving}
                                    className="w-full px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shadow-sm transition-colors gap-1 text-xs flex items-center justify-center border border-indigo-600"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{renderHotkeyLabel('Submit', 'S')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
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
                                        handleInvoiceDateChange(iso);
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

                {/* Other Sale Modal */}
                {showOtherSaleModal && createPortal(
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Other Sale"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) setShowOtherSaleModal(false);
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Other Sale</h3>
                                <button onClick={() => setShowOtherSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {otherSaleLedgers.length > 0 ? (
                                    <div className={otherSaleLedgers.length > 3 ? "space-y-4 max-h-72 overflow-y-auto pr-2" : "space-y-4"}>
                                        {otherSaleLedgers.map((ledger, idx) => (
                                            <div key={ledger.code} className="space-y-2">
                                                <label className="text-sm font-medium text-slate-600">{ledger.name}</label>
                                                <input 
                                                    ref={(el) => { otherSaleInputRefs.current[idx] = el; }}
                                                    type="number" 
                                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                                    value={otherSaleAmounts[ledger.code] || ''}
                                                    onChange={(e) => handleOtherSaleChange(ledger.code, e.target.value)}
                                                    onKeyDown={(e) => handleModalInputKeyDown(e, otherSaleInputRefs, idx, otherSaleDoneBtnRef)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active sale ledgers found</div>
                                )}
                                <button 
                                    ref={otherSaleDoneBtnRef}
                                    type="button"
                                    onClick={() => setShowOtherSaleModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                                >
                                    {renderHotkeyLabel('Done', 'D')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Expenses Modal */}
                {showExpensesModal && createPortal(
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Expenses"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) setShowExpensesModal(false);
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Expenses</h3>
                                <button onClick={() => setShowExpensesModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {expensesLedgers.length > 0 ? (
                                    <div className={expensesLedgers.length > 3 ? "space-y-4 max-h-72 overflow-y-auto pr-2" : "space-y-4"}>
                                        {expensesLedgers.map((ledger, idx) => (
                                            <div key={ledger.code} className="space-y-2">
                                                <label className="text-sm font-medium text-slate-600">{ledger.name}</label>
                                                <input 
                                                    ref={(el) => { expensesInputRefs.current[idx] = el; }}
                                                    type="number" 
                                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                                    value={expensesAmounts[ledger.code] || ''}
                                                    onChange={(e) => handleExpenseChange(ledger.code, e.target.value)}
                                                    onKeyDown={(e) => handleModalInputKeyDown(e, expensesInputRefs, idx, expensesDoneBtnRef)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active expense ledgers found</div>
                                )}
                                <button 
                                    ref={expensesDoneBtnRef}
                                    type="button"
                                    onClick={() => setShowExpensesModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                                >
                                    {renderHotkeyLabel('Done', 'D')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Tender Modal */}
                {showTenderModal && createPortal(
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Tender"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) setShowTenderModal(false);
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Tender</h3>
                                <button onClick={() => setShowTenderModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="p-3 bg-slate-50 rounded border border-slate-200 mb-4">
                                    <div className="grid grid-cols-2 gap-4 text-center divide-x divide-slate-200">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Collection</div>
                                            <div className="text-lg font-bold text-slate-800">₹ {totalCollection.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Remaining</div>
                                            <div className={`text-lg font-bold ${totalCollection - totalTender < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹ {Math.max(0, totalCollection - totalTender).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {tenderLedgers.length > 0 ? (
                                    <div className={tenderLedgers.length > 3 ? "space-y-4 max-h-72 overflow-y-auto pr-2" : "space-y-4"}>
                                        {tenderLedgers.map((ledger, idx) => (
                                            <div key={ledger.code} className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-slate-600">{ledger.name}</label>
                                                    <button 
                                                        onClick={() => {
                                                            const currentOtherTotal = Object.entries(tenderAmounts)
                                                                .filter(([k]) => k !== ledger.code)
                                                                .reduce((sum, [_, v]) => sum + (parseFloat(v) || 0), 0);
                                                            const remaining = Math.max(0, totalCollection - currentOtherTotal);
                                                            handleTenderAmountChange(ledger.code, remaining.toFixed(2));
                                                        }}
                                                        className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                                    >
                                                        Fill Remaining
                                                    </button>
                                                </div>
                                                <input 
                                                    ref={(el) => { tenderInputRefs.current[idx] = el; }}
                                                    type="number" 
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono"
                                                    value={tenderAmounts[ledger.code] || ''}
                                                    onChange={(e) => handleTenderAmountChange(ledger.code, e.target.value)}
                                                    onKeyDown={(e) => handleModalInputKeyDown(e, tenderInputRefs, idx, tenderDoneBtnRef)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active tender ledgers found</div>
                                )}
                                <button 
                                    ref={tenderDoneBtnRef}
                                    type="button"
                                    onClick={() => setShowTenderModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                                >
                                    {renderHotkeyLabel('Done', 'D')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            </div>
        </div>
    );
};

export default SalesEntry;
