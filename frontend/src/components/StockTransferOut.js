import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Calendar, Search } from 'lucide-react';

const StockTransferOut = () => {
    const navigate = useNavigate();

    // --- State ---
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Header
    const [stores, setStores] = useState([]);
    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [stoDate, setStoDate] = useState(formatDateForInput(new Date()));
    const [stoNumber, setStoNumber] = useState('');
    const [narration, setNarration] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [voucherConfig, setVoucherConfig] = useState(null);
    const [isDateDisabled, setIsDateDisabled] = useState(false);

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
    
    const [scanRate, setScanRate] = useState(''); // Transfer Rate (Input)
    const [scanQuantity, setScanQuantity] = useState('');
    const [scanMrp, setScanMrp] = useState('');
    const [scanClosingStock, setScanClosingStock] = useState('');
    
    const [itemPrices, setItemPrices] = useState([]); 
    const [itemStock, setItemStock] = useState({}); // Store stock for all sizes of selected item
    const itemStockRef = useRef({});
    
    const scanInputRef = useRef(null);
    const sizeInputRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    
    // Header Refs
    const fromStoreRef = useRef(null);
    const toStoreRef = useRef(null);
    const dateRef = useRef(null);
    const stoNumberRef = useRef(null);

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

    // --- Effects ---
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
        fetchStores();
        fetchActiveSizes();
        fetchVoucherConfig();
    }, []);

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
                const storeInfo = response.data.stores[0];
                const userStore = storeInfo.storeCode;
                setFromStore(userStore);
                fetchNextStoNumber(userStore);

                // Check role and set business date
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.role === 'STORE USER') {
                    if (storeInfo.businessDate) {
                        let bDate = storeInfo.businessDate;
                        // Handle DD-MM-YYYY format
                        if (bDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
                            const [d, m, y] = bDate.split('-');
                            bDate = `${y}-${m}-${d}`;
                        }
                        setStoDate(bDate);
                        setIsDateDisabled(true);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching user store", error);
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
                     axios.get(`/api/inventory/stock/item?storeCode=${fromStore}&itemCode=${code}`, {
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
                
                if (sizeInputRef.current) sizeInputRef.current.focus();
            }
        } catch (error) {
            console.error("Error fetching item details", error);
        }
    };

    // --- Handlers ---
    
    const fetchStock = async (itemCode, sizeCode) => {
        if (!fromStore || !itemCode || !sizeCode) {
            setScanClosingStock('');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/inventory/stock?storeCode=${fromStore}&itemCode=${itemCode}&sizeCode=${sizeCode}`, {
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
                    if (fromStore) {
                        url = `/api/inventory/search-available?storeCode=${fromStore}&query=${value}`;
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
        setScanSize(size.code);
        setScanSizeName(size.name);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
        if (priceInfo) {
            let rate = priceInfo.purchasePrice || '';
            if (voucherConfig && voucherConfig.transferAtPrice === 'MRP') {
                rate = priceInfo.mrp || '';
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
                const newAmount = newQuantity * rate; // Recalculate amount with new total quantity and current rate
                
                updatedRows[existingIndex] = {
                    ...existingRow,
                    quantity: newQuantity,
                    amount: newAmount,
                    rate: rate, // Update rate to latest entered rate
                    price: rate, // Update price to latest entered rate
                    closingStock: scanClosingStock
                };
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
                    price: rate, // Map Rate to Price
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
            // Find next size with positive stock
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
            
            // Update Rate/MRP for new size if available in loaded prices
            const priceInfo = itemPrices.find(p => p.sizeCode === nextSize.code);
            if (priceInfo) {
                setScanRate(priceInfo.purchasePrice || ''); 
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

    const handleDeleteRow = (index) => {
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
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
        if (!narration) {
            showMessage("Please enter Narration", 'warning');
            return;
        }
        if (gridRows.length === 0) {
            showMessage("Please add items", 'warning');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Construct Payload
        const head = {
            stoNumber,
            date: stoDate.split('-').reverse().join('-'), // Convert YYYY-MM-DD to DD-MM-YYYY
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
            price: row.rate, // Send Rate as Price
            quantity: row.quantity,
            amount: row.amount
        }));

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/sto/save', { head, items }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Stock Transfer Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    // Reset Form
                    setGridRows([]);
                    setStoNumber('');
                    setToStore('');
                    setNarration('');
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            showMessage('Error saving stock transfer', 'error');
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
                                onClick={() => {
                                    if (currentUser?.role === 'STORE USER') {
                                        navigate('/store-dashboard');
                                    } else {
                                        navigate('/ho-dashboard');
                                    }
                                }}
                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-800">Stock Transfer Out</h2>
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
                                            fetchNextStoNumber(val);
                                            if (val === toStore) {
                                                setToStore('');
                                            }
                                        }}
                                        onKeyDown={handleFromStoreKeyDown}
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
                                        disabled={isDateDisabled}
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
                    <div className="col-span-4 py-2 border-r border-indigo-100 px-2 relative">
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
                                placeholder="Scan or Search Item..."
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                                autoComplete="off"
                            />
                            {showSuggestions && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                    {searchResults.map((item, index) => (
                                        <div
                                            id={`suggestion-item-${index}`}
                                            key={item.itemCode}
                                            onClick={() => handleSelectSuggestion(item)}
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
                    <div className="col-span-1 py-2 border-r border-indigo-100 px-2 relative">
                            <input
                            ref={sizeInputRef}
                            type="text"
                            value={sizeSearchInput}
                            onChange={handleSizeInputChange}
                            onFocus={handleSizeInputFocus}
                            onKeyDown={handleSizeKeyDown}
                            placeholder="Size"
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                        {showSizeSuggestions && sizeSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                    {sizeSearchResults.map((size, index) => {
                                        const stock = itemStock[size.code] !== undefined ? itemStock[size.code] : 0;
                                        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
                                        const priceDisplay = priceInfo ? (priceInfo.mrp || priceInfo.purchasePrice || '0') : 'N/A';

                                        return (
                                        <div
                                            id={`suggestion-size-${index}`}
                                            key={size.id}
                                            onClick={() => handleSelectSize(size)}
                                            className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group ${
                                                index === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{size.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    STK: <span className={stock > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{stock}</span> 
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
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-center text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        />
                        {scanClosingStock !== '' && (
                            <div className="text-[9px] text-center text-slate-500 font-bold mt-0.5">
                                Stock: <span className={scanClosingStock > 0 ? "text-emerald-600" : "text-rose-500"}>{scanClosingStock}</span>
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
                            className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
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
                            className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Grid Body */}
                <div className="flex-1 overflow-y-auto bg-white relative">
                    {gridRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 gap-0 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm text-slate-700 group">
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
                                        Stk: {row.closingStock}
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
                                    onClick={() => handleDeleteRow(index)}
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
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    placeholder="Enter narration..."
                                />
                            </div>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Qty</span>
                                <span className="text-xl font-bold text-slate-700">
                                    {gridRows.reduce((sum, row) => sum + (row.quantity || 0), 0)}
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
                            
                            <button 
                                onClick={handleSave}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Save className="w-5 h-5" />
                                <span>Save Transfer</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockTransferOut;
