import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, X, Store, Calendar, User, ArrowLeft, Search } from 'lucide-react';

const SalesEntry = () => {
    const navigate = useNavigate();

    // --- State ---
    // Header
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toLocaleDateString('en-GB').split('/').join('-'));
    const [invoiceNo, setInvoiceNo] = useState('New');
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
    const [scanSizeName, setScanSizeName] = useState('');

    const [scanQuantity, setScanQuantity] = useState('');
    const [scanRate, setScanRate] = useState('');
    const [scanMrp, setScanMrp] = useState('');
    const [scanClosingStock, setScanClosingStock] = useState('');
    
    const [itemPrices, setItemPrices] = useState([]); 
    const [itemStock, setItemStock] = useState({});
    const itemStockRef = useRef({});

    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

    const [sizeSearchResults, setSizeSearchResults] = useState([]);
    const [showSizeSuggestions, setShowSizeSuggestions] = useState(false);
    const [focusedSizeSuggestionIndex, setFocusedSizeSuggestionIndex] = useState(-1);

    // Refs
    const scanInputRef = useRef(null);
    const sizeInputRef = useRef(null);
    const quantityRef = useRef(null);
    const rateRef = useRef(null);
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.amount || 0), 0), 
    [gridRows]);

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
            confirmButtonText: 'OK'
        });
    };

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchOtherSaleLedgers();
        fetchExpensesLedgers();
        fetchTenderLedgers();
        fetchVoucherConfig();
    }, []);

    useEffect(() => {
        if (storeInfo?.businessDate) {
            setInvoiceDate(storeInfo.businessDate);
        }
        if (storeInfo?.storeCode) {
            fetchNextInvoiceNo(storeInfo.storeCode);
        }
        if (storeInfo?.partyLed) {
            setSelectedParty(storeInfo.partyLed);
        }
    }, [storeInfo]);

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

    const fetchOtherSaleLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/ledgers/filter?type=Sale&screen=Sale', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOtherSaleLedgers(response.data || []);
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
            setExpensesLedgers(response.data || []);
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
            setTenderLedgers(response.data || []);
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
            const response = await axios.get('/api/sales/parties');
            setParties(response.data);
        } catch (error) {
            console.error("Error fetching parties", error);
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
                const response = await axios.get(`/api/stores/by-user/${user.userName}`);
                if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                    setStoreInfo(response.data.stores[0]);
                }
            } catch (error) {
                console.error("Error fetching store info", error);
            }
        }
    };

    const fetchItemDetails = async (code) => {
        if (!code) return;
        const currentStoreCode = storeInfo?.storeCode;
        if (!currentStoreCode) return;

        try {
            const token = localStorage.getItem('token');
            
            // Parallel fetch: Prices + Stock
            const promises = [
                axios.get(`/api/prices/item/${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get(`/api/inventory/stock/item?storeCode=${currentStoreCode}&itemCode=${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ];

            const results = await Promise.all(promises);
            const pricesResponse = results[0];
            const stockResponse = results[1];

            if (stockResponse && stockResponse.data.success) {
                const stock = stockResponse.data.stock || {};
                setItemStock(stock);
                itemStockRef.current = stock;
            } else {
                setItemStock({});
                itemStockRef.current = {};
            }

            if (pricesResponse.data.success) {
                const prices = pricesResponse.data.prices || [];
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

    const fetchStock = async (itemCode, sizeCode) => {
        const currentStoreCode = storeInfo?.storeCode;
        if (!currentStoreCode || !itemCode || !sizeCode) {
            setScanClosingStock('');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/inventory/stock?storeCode=${currentStoreCode}&itemCode=${itemCode}&sizeCode=${sizeCode}`, {
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

    // --- Handlers ---
    // Item Scan
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
                    
                    if (storeInfo?.storeCode) {
                        url = `/api/inventory/search-available?storeCode=${storeInfo.storeCode}&query=${value}`;
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
        
        const availableSizes = activeSizes.filter(s => (itemStockRef.current[s.code] || 0) > 0);

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
        const availableSizes = activeSizes.filter(s => (itemStockRef.current[s.code] || 0) > 0);
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
        let rate = '';
        let mrp = '';
        if (priceInfo) {
            // Dynamic Pricing Logic
            if (voucherConfig) {
                if (voucherConfig.pricingMethod === 'MRP') {
                    rate = priceInfo.mrp || '';
                } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                    rate = priceInfo.salePrice || '';
                } else if (voucherConfig.pricingMethod === 'PURCHASE_PRICE') {
                    rate = priceInfo.purchasePrice || '';
                } else {
                    rate = priceInfo.mrp || '';
                }
            } else {
                 rate = priceInfo.mrp || ''; // Default to MRP if no config
            }
            mrp = priceInfo.mrp || '';
        }
        setScanRate(rate);
        setScanMrp(mrp);
        
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
                if (exactMatch && (itemStockRef.current[exactMatch.code] || 0) > 0) {
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

    const handleQuantityKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (rateRef.current) rateRef.current.focus();
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
        const val = parseFloat(value);
        if (val < 0) return;
        setOtherSaleAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleExpenseChange = (code, value) => {
        if (value === '') {
            setExpensesAmounts(prev => ({ ...prev, [code]: '' }));
            return;
        }
        const val = parseFloat(value);
        if (val < 0) return;
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

        const qty = parseFloat(scanQuantity) || 0;
        const availableStock = parseFloat(scanClosingStock) || 0;
        
        // Check if adding new quantity exceeds stock (considering existing grid quantity)
        const existingRow = gridRows.find(row => row.itemCode === scanItemCode && row.sizeCode === scanSize);
        const existingQty = existingRow ? existingRow.quantity : 0;
        
        if (existingQty + qty > availableStock) {
            showMessage(`Quantity cannot exceed available stock (${availableStock})`, 'warning');
            return;
        }

        const rate = parseFloat(scanRate) || 0;
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
                    rate: rate,
                    mrp: mrp,
                    closingStock: scanClosingStock
                };
                return updatedRows;
            } else {
                // Add new row
                const amount = rate * qty;
                const newRow = {
                    id: Date.now(),
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    sizeCode: scanSize,
                    sizeName: scanSizeName,
                    rate: rate,
                    mrp: mrp,
                    quantity: qty,
                    amount: amount,
                    closingStock: scanClosingStock
                };
                return [...prev, newRow];
            }
        });

        // Determine next state (Auto-advance Size)
        const currentSizeIndex = activeSizes.findIndex(s => s.code === scanSize);
        let nextSize = null;
        
        if (currentSizeIndex !== -1) {
            for (let i = currentSizeIndex + 1; i < activeSizes.length; i++) {
                const s = activeSizes[i];
                if ((itemStockRef.current[s.code] || 0) > 0) {
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
            
            const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
            let nextRate = '';
            let nextMrp = '';
            if (priceInfo) {
                if (voucherConfig) {
                    if (voucherConfig.pricingMethod === 'MRP') {
                        nextRate = priceInfo.mrp || '';
                    } else if (voucherConfig.pricingMethod === 'SALE_PRICE') {
                        nextRate = priceInfo.salePrice || '';
                    } else if (voucherConfig.pricingMethod === 'PURCHASE_PRICE') {
                        nextRate = priceInfo.purchasePrice || '';
                    } else {
                        nextRate = priceInfo.mrp || '';
                    }
                } else {
                    nextRate = priceInfo.mrp || '';
                }
                nextMrp = priceInfo.mrp || '';
            }
            setScanRate(nextRate);
            setScanMrp(nextMrp);
            
            setScanQuantity('');
            fetchStock(scanItemCode, nextSize.code);
            
            if (quantityRef.current) quantityRef.current.focus();

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
            setItemPrices([]);
            setItemStock({});
            itemStockRef.current = {};
            
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const handleRemoveRow = (index) => {
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!selectedParty) {
            showMessage('Please select a Party Name', 'warning');
            return;
        }

        if (gridRows.length === 0) {
            showMessage('Please add at least one item', 'warning');
            return;
        }

        if (!storeInfo || !storeInfo.storeCode) {
            showMessage('Store information missing. Cannot save.', 'error');
            return;
        }

        // Calculate Totals
        const gridTotal = totalAmount;
        const totalCollection = gridTotal + otherSaleTotal - totalExp;

        // Validate Total Payment vs Collection
        if (totalTender > totalCollection + 0.01) { 
            showMessage(`Total tender (₹${totalTender.toFixed(2)}) cannot exceed Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
            return;
        }

        if (Math.abs(totalTender - totalCollection) > 0.01) {
             showMessage(`Total tender (₹${totalTender.toFixed(2)}) must match Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
             return;
        }

        const otherSaleDetails = Object.entries(otherSaleAmounts)
            .filter(([_, val]) => parseFloat(val) > 0)
            .map(([code, val]) => ({ ledgerCode: code, amount: parseFloat(val) }));

        const expenseDetails = Object.entries(expensesAmounts)
            .filter(([_, val]) => parseFloat(val) > 0)
            .map(([code, val]) => ({ ledgerCode: code, amount: parseFloat(val) }));

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
            saleAmount: gridTotal,
            tenderType: 'Split',
            storeCode: storeInfo.storeCode,
            userId: user.id,
            userName: user.userName,
            
            otherSale: otherSaleTotal,
            totalExpenses: totalExp,
            totalTender: totalTender,

            otherSaleDetails,
            expenseDetails,
            tenderDetails,
            items: itemsPayload
        };

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/sales/save', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showMessage('Invoice saved successfully', 'success');
            resetForm();
        } catch (error) {
            console.error("Error saving invoice", error);
            showMessage('Failed to save invoice', 'error');
        }
    };

    const resetForm = () => {
        setGridRows([]);
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
        
        setOtherSaleAmounts({});
        setExpensesAmounts({});
        setTenderAmounts({});

        setSelectedParty(storeInfo?.partyLed || '');
        setInvoiceNo('New');
        setInvoiceDate(storeInfo?.businessDate || new Date().toLocaleDateString('en-GB').split('/').join('-')); 
        fetchNextInvoiceNo(storeInfo?.storeCode);
        if (scanInputRef.current) scanInputRef.current.focus();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-2 flex flex-col items-center justify-center font-sans">
            <div className="w-full h-[100dvh] sm:h-[95vh] sm:max-w-[98%] lg:max-w-[95%] bg-white sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Header Section */}
                <div className="flex flex-col border-b border-slate-200 bg-white shrink-0">
                    {/* Row 1: Title & Store */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => navigate('/store-dashboard')}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">Sales Voucher</h2>
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

                    {/* Row 2: Controls (Party, Date, Invoice) */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6 px-4 py-3 bg-slate-50/50">
                        {/* Party */}
                        <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Select Party</label>
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
                                    {parties.map(party => (
                                        <option key={party.id} value={party.code}>
                                            {party.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date & Invoice Container */}
                        <div className="flex items-center justify-between gap-4 md:gap-6 md:ml-auto">
                            {/* Date */}
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</label>
                                <div className="relative w-32 md:w-40">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input 
                                        type="text" 
                                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 outline-none shadow-sm cursor-not-allowed"
                                        value={invoiceDate}
                                        readOnly
                                        disabled
                                    />
                                </div>
                            </div>

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

                {/* Grid */}
                <div className="flex-1 overflow-auto bg-white relative">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-50 shadow-sm">
                            <tr>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center border-b border-slate-200">#</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">ITEM DETAILS</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 border-b border-slate-200">SIZE</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 border-b border-slate-200">QTY</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-28 border-b border-slate-200">RATE</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-32 border-b border-slate-200">AMOUNT</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16 text-center border-b border-slate-200">ACTION</th>
                            </tr>
                            
                            {/* Input Row */}
                            <tr className="bg-indigo-50/30 border-b border-indigo-100">
                                <td className="py-2 px-3 text-center text-xs font-bold text-slate-400">●</td>
                                <td className="py-2 px-3 relative">
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
                                <td className="py-2 px-3 relative">
                                    <input 
                                        ref={sizeInputRef}
                                        type="text"
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center transition-all"
                                        placeholder="Size"
                                        value={sizeSearchInput}
                                        onChange={handleSizeInputChange}
                                        onFocus={handleSizeInputFocus}
                                        onKeyDown={handleSizeKeyDown}
                                        disabled={!scanItemCode}
                                    />
                                    {showSizeSuggestions && sizeSearchResults.length > 0 && (
                                        <div className="absolute left-3 right-3 z-[60] bg-white border border-slate-200 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto ring-1 ring-black/5">
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
                                            type="number" 
                                            min="0"
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center font-bold text-slate-700 transition-all"
                                            placeholder="Qty"
                                            value={scanQuantity}
                                            onChange={(e) => setScanQuantity(e.target.value)}
                                            onKeyDown={handleQuantityKeyDown}
                                            disabled={!scanSize}
                                        />
                                        {scanClosingStock !== '' && (
                                            <span className="text-[9px] text-center text-slate-500 mt-0.5">
                                                Stock: {scanClosingStock}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-2 px-3">
                                    <input 
                                        ref={rateRef}
                                        type="number" 
                                        min="0"
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-right transition-all"
                                        placeholder="Rate"
                                        value={scanRate}
                                        onChange={(e) => setScanRate(e.target.value)}
                                        onKeyDown={handleRateKeyDown}
                                        disabled={!scanSize}
                                    />
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-700 text-sm">
                                    {((parseFloat(scanQuantity) || 0) * (parseFloat(scanRate) || 0)).toFixed(2)}
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
                            ) : gridRows.map((row, index) => (
                                <tr key={row.id || index} className="hover:bg-slate-50 transition-colors group">
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
                                        {row.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600 font-mono text-xs">
                                        {row.rate}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-indigo-600">
                                        ₹{row.amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <button 
                                            onClick={() => handleRemoveRow(index)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove Item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
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

                            {/* Column 2: Other Sale */}
                            <div className="w-full md:w-32 order-3 md:order-none">
                                <button 
                                    onClick={() => setShowOtherSaleModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        otherSaleTotal > 0 
                                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                >
                                    {otherSaleTotal > 0 ? `Other Sale: ₹ ${otherSaleTotal.toFixed(2)}` : 'Other Sale'}
                                </button>
                            </div>

                            {/* Column 3: Expenses */}
                            <div className="w-full md:w-32 order-4 md:order-none">
                                <button 
                                    onClick={() => setShowExpensesModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        totalExp > 0 
                                        ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700' 
                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                    {totalExp > 0 ? `Expenses: ₹ ${totalExp.toFixed(2)}` : 'Expenses'}
                                </button>
                            </div>

                            {/* Column 4: Total Collection */}
                            <div className="flex items-center gap-2 justify-center md:justify-start order-2 md:order-none">
                                <span className="text-xs font-bold text-slate-800">Total Collection</span>
                                <div className="text-lg font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    ₹ {totalCollection.toFixed(2)}
                                </div>
                            </div>

                            {/* Column 5: Tender */}
                            <div className="w-full md:w-32 order-5 md:order-none">
                                <button 
                                    onClick={() => setShowTenderModal(true)}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded border transition-colors shadow-sm ${
                                        totalTender > 0 
                                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                >
                                    {totalTender > 0 ? `Tender: ₹ ${totalTender.toFixed(2)}` : 'Tender'}
                                </button>
                            </div>

                            {/* Column 6: Save Invoice */}
                            <div className="w-full md:w-32 order-6 md:order-none">
                                <button 
                                    onClick={handleSave}
                                    className="w-full px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded shadow-sm transition-colors gap-1 text-xs flex items-center justify-center border border-indigo-600"
                                >
                                    <Save className="w-3.5 h-3.5" /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {/* Other Sale Modal */}
                {showOtherSaleModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Other Sale</h3>
                                <button onClick={() => setShowOtherSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {otherSaleLedgers.length > 0 ? (
                                    otherSaleLedgers.map((ledger) => (
                                        <div key={ledger.code} className="space-y-2">
                                            <label className="text-sm font-medium text-slate-600">{ledger.name}</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                                value={otherSaleAmounts[ledger.code] || ''}
                                                onChange={(e) => handleOtherSaleChange(ledger.code, e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active sale ledgers found</div>
                                )}
                                <button 
                                    onClick={() => setShowOtherSaleModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Expenses Modal */}
                {showExpensesModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Expenses</h3>
                                <button onClick={() => setShowExpensesModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {expensesLedgers.length > 0 ? (
                                    expensesLedgers.map((ledger) => (
                                        <div key={ledger.code} className="space-y-2">
                                            <label className="text-sm font-medium text-slate-600">{ledger.name}</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                                                value={expensesAmounts[ledger.code] || ''}
                                                onChange={(e) => handleExpenseChange(ledger.code, e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active expense ledgers found</div>
                                )}
                                <button 
                                    onClick={() => setShowExpensesModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tender Modal */}
                {showTenderModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                                    tenderLedgers.map((ledger) => (
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
                                                type="number" 
                                                min="0"
                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono"
                                                value={tenderAmounts[ledger.code] || ''}
                                                onChange={(e) => handleTenderAmountChange(ledger.code, e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-4">No active tender ledgers found</div>
                                )}
                                <button 
                                    onClick={() => setShowTenderModal(false)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
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

export default SalesEntry;
