import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ScanBarcode, Trash2, Save, X, ArrowLeft, Plus, Store, Calendar, User, Search } from 'lucide-react';

const PurchaseEntry = () => {
    const navigate = useNavigate();

    // --- State ---
    // Helper to format date as YYYY-MM-DD for input
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return ''; // Invalid date
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Header
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [purchaseLedgers, setPurchaseLedgers] = useState([]);
    const [selectedPurchaseLedger, setSelectedPurchaseLedger] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(formatDateForInput(new Date()));
    const [invoiceNo, setInvoiceNo] = useState(''); // Manual Entry for Purchase
    const [narration, setNarration] = useState('');
    const [storeInfo, setStoreInfo] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);

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
    const sizeInputRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    
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
    const [invoiceScanAmount, setInvoiceScanAmount] = useState('');
    const [showInvoiceLedgerSuggestions, setShowInvoiceLedgerSuggestions] = useState(false);
    const [focusedInvoiceLedgerIndex, setFocusedInvoiceLedgerIndex] = useState(-1);

    const invoiceScanLedgerRef = useRef(null);
    const invoiceScanAmountRef = useRef(null);

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

    const invoiceValueNumber = parseFloat(invoiceValue);
    const displayInvoiceValue =
        !invoiceValue || isNaN(invoiceValueNumber) ? grandTotal : invoiceValueNumber;

    // --- Helpers ---
    const showMessage = (message, type = 'info') => {
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: type,
            confirmButtonText: 'OK'
        });
    };

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchPurchaseLedgers();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchVoucherConfig();
        fetchInvoiceValueLedgers();
    }, []);

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
                if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                    setStoreInfo(response.data.stores[0]);
                    if (response.data.stores[0].businessDate) {
                        // Handle potential DD-MM-YYYY format from backend
                        let dateStr = response.data.stores[0].businessDate;
                        if (dateStr && dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
                            const [day, month, year] = dateStr.split('-');
                            dateStr = `${year}-${month}-${day}`;
                        }
                        setInvoiceDate(dateStr);
                    }
                }
            } catch (error) {
                console.error("Error fetching store info", error);
            }
        }
    };

    const fetchVoucherConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/voucher-config/PURCHASE', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setVoucherConfig(response.data.config);
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

    const handleSelectSize = (size) => {
        if (!size) return;
        setScanSize(size.code);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        // Auto-populate Rate based on Item and Size
        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
        if (priceInfo) {
            let rate = priceInfo.purchasePrice || '';
            
            // Dynamic Pricing based on Voucher Config
            if (voucherConfig) {
                if (voucherConfig.pricingMethod === 'MRP') {
                    rate = priceInfo.mrp || '';
                } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                    rate = priceInfo.salePrice || '';
                } else if (voucherConfig.pricingMethod === 'PURCHASE_PRICE') {
                    rate = priceInfo.purchasePrice || '';
                }
            }
            
            setScanRate(rate);
            if (priceInfo.mrp) setScanMrp(priceInfo.mrp);
        } else {
            setScanRate(''); // Clear rate if no price found
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
                return updatedRows;
            } else {
                const amount = rate * qty;
                const newRow = {
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    size: scanSize,
                    rate: rate,
                    mrp: mrp,
                    quantity: qty,
                    amount: amount
                };
                return [...prev, newRow];
            }
        });

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
                let nextRate = priceInfo.purchasePrice || '';
                if (voucherConfig) {
                    if (voucherConfig.pricingMethod === 'MRP') {
                        nextRate = priceInfo.mrp || '';
                    } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                        nextRate = priceInfo.salePrice || '';
                    } else if (voucherConfig.pricingMethod === 'PURCHASE_PRICE') {
                        nextRate = priceInfo.purchasePrice || '';
                    }
                }
                setScanRate(nextRate);
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
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteInvoiceRow = (index) => {
        setInvoiceValueRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleInvoiceScanLedgerChange = (e) => {
        const value = e.target.value;
        setInvoiceScanLedgerInput(value);
        setInvoiceScanLedgerCode('');
        setShowInvoiceLedgerSuggestions(true);
        setFocusedInvoiceLedgerIndex(-1);
    };

    const handleSelectInvoiceScanLedger = (ledger) => {
        setInvoiceScanLedgerInput(ledger.name);
        setInvoiceScanLedgerCode(ledger.code);
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
            const filtered = availableInvoiceLedgers.filter(l => {
                const query = invoiceScanLedgerInput.toLowerCase();
                if (!query) return true;
                return (l.name && l.name.toLowerCase().includes(query)) ||
                       (l.code && l.code.toLowerCase().includes(query));
            });
            if (filtered.length === 0) return;
            setShowInvoiceLedgerSuggestions(true);
            setFocusedInvoiceLedgerIndex(prev => {
                if (prev === -1) return e.key === 'ArrowDown' ? 0 : filtered.length - 1;
                if (e.key === 'ArrowDown') {
                    return (prev + 1) % filtered.length;
                }
                return (prev - 1 + filtered.length) % filtered.length;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const query = invoiceScanLedgerInput.toLowerCase();
            const filtered = availableInvoiceLedgers.filter(l => {
                if (!query) return true;
                return (l.name && l.name.toLowerCase().includes(query)) ||
                       (l.code && l.code.toLowerCase().includes(query));
            });
            if (filtered.length > 0) {
                const index = focusedInvoiceLedgerIndex >= 0 && focusedInvoiceLedgerIndex < filtered.length
                    ? focusedInvoiceLedgerIndex
                    : 0;
                handleSelectInvoiceScanLedger(filtered[index]);
                return;
            }
            if (invoiceScanAmountRef.current) {
                invoiceScanAmountRef.current.focus();
            }
        }
    };

    const handleInvoiceScanAmountChange = (e) => {
        setInvoiceScanAmount(e.target.value);
    };

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

        setInvoiceValueRows(prev => {
            const existingIndex = prev.findIndex(r => r.ledgerCode === code);
            if (existingIndex >= 0) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                const newAmount = (parseFloat(existing.amount) || 0) + rawAmount;
                updated[existingIndex] = { ...existing, amount: newAmount.toFixed(2) };
                return updated;
            }
            return [
                ...prev,
                { ledgerCode: code, ledgerName: name, amount: rawAmount.toFixed(2) }
            ];
        });

        setInvoiceScanLedgerInput('');
        setInvoiceScanLedgerCode('');
        setInvoiceScanAmount('');
        setShowInvoiceLedgerSuggestions(false);
        setFocusedInvoiceLedgerIndex(-1);

        if (invoiceScanLedgerRef.current) {
            invoiceScanLedgerRef.current.focus();
        }
    };

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

    const handleOpenInvoiceModal = () => {
        // Do not auto-populate invoiceValue or add default ledger
        setShowInvoiceValueModal(true);
    };

    const handleSave = async () => {
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
        if (!narration || !narration.trim()) {
            showMessage("Please enter Narration", 'warning');
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

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const head = {
            invoiceNo,
            invoiceDate: invoiceDate.split('-').reverse().join('-'),
            partyCode: selectedParty,
            purLed: selectedPurchaseLedger,
            narration,
            storeCode: storeInfo?.storeCode,
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
            const response = await axios.post('/api/purchase/save', { head, items, ledgers }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Purchase Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    setGridRows([]);
                    setInvoiceNo('');
                    setNarration('');
                    setInvoiceValue('');
                    setInvoiceValueRows([]);
                    setInvoiceScanLedgerInput('');
                    setInvoiceScanLedgerCode('');
                    setInvoiceScanAmount('');
                    setShowInvoiceLedgerSuggestions(false);
                    setFocusedInvoiceLedgerIndex(-1);
                    setSelectedPurchaseLedger('');
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

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-2 flex flex-col items-center justify-center font-sans">
            <div className="w-full h-[100dvh] sm:h-[95vh] sm:max-w-[98%] lg:max-w-[95%] bg-white sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col border-b border-slate-200 bg-white">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => navigate('/ho-dashboard')}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">Purchase Voucher</h2>
                        </div>
                        {storeInfo && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm">
                                <div className="bg-indigo-100 p-1 rounded-full">
                                    <Store className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">
                                        {storeInfo.storeCode}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 font-sans tracking-tight">
                                        {storeInfo.storeName}
                                    </span>
                                </div>
                            </div>
                        )}
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
                                            type="date" 
                                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice No <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="w-32 md:w-40 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        placeholder="Enter"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full" />
                    </div>
                </div>

                {/* Real Input Row with proper sizing */}
                 <div className="px-4 py-2 border-b border-slate-100 bg-white">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-3 relative">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Code / Name</label>
                            <div className="relative">
                                <ScanBarcode className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    ref={scanInputRef}
                                    type="text"
                                    value={scanSearchInput}
                                    onChange={handleScanInputChange}
                                    onKeyDown={handleScanKeyDown}
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
                                            onClick={() => handleSelectSuggestion(item)}
                                        >
                                            <div className="font-medium text-slate-800">{item.itemName}</div>
                                            <div className="text-[11px] text-slate-500">{item.itemCode}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="col-span-2 relative">
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
                                            key={size.code}
                                            id={`suggestion-size-${idx}`}
                                            className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 flex items-center justify-between group ${
                                                idx === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                            onClick={() => handleSelectSize(size)}
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
                                className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <div className="flex-1 overflow-auto bg-white px-4 pb-2">
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
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
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
                                    Narration <span className="text-red-500">*</span>
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
                                    {displayInvoiceValue > 0
                                        ? `Invoice Value: ₹ ${displayInvoiceValue.toFixed(2)}`
                                        : 'Invoice Value'}
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grand Total</span>
                                <span className="text-xl font-bold text-slate-800">₹{grandTotal.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded shadow-sm flex items-center gap-2 border border-indigo-600 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save Purchase
                            </button>
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
                                    <div className="flex-1 relative">
                                        <input
                                            ref={invoiceScanLedgerRef}
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Ledger Name"
                                            value={invoiceScanLedgerInput}
                                            onChange={handleInvoiceScanLedgerChange}
                                            onKeyDown={handleInvoiceScanLedgerKeyDown}
                                            onFocus={() => setShowInvoiceLedgerSuggestions(true)}
                                        />
                                        {showInvoiceLedgerSuggestions && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                                {availableInvoiceLedgers
                                                    .filter(l => {
                                                        const query = invoiceScanLedgerInput.toLowerCase();
                                                        if (!query) return true;
                                                        return (l.name && l.name.toLowerCase().includes(query)) ||
                                                               (l.code && l.code.toLowerCase().includes(query));
                                                    })
                                                    .map((ledger, index) => (
                                                        <div
                                                            key={ledger.code}
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
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseEntry;
