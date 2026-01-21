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
    const [invoiceDate, setInvoiceDate] = useState(formatDateForInput(new Date()));
    const [invoiceNo, setInvoiceNo] = useState(''); // Manual Entry for Purchase
    const [narration, setNarration] = useState('');
    const [storeInfo, setStoreInfo] = useState(null);

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

    const grandTotal = totalAmount;

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
                
                // Focus Size Input
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
        
        if (value.length > 1) {
            // Debounce search
            const timer = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(`/api/items/search?query=${value}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data.success) {
                        setSearchResults(response.data.items || []);
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    console.error("Search error", error);
                }
            }, 300);
            return () => clearTimeout(timer);
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
        setScanSize(size.code);
        setSizeSearchInput(size.name);
        setShowSizeSuggestions(false);
        
        // Auto-populate Rate based on Item and Size
        const priceInfo = itemPrices.find(p => p.sizeCode === size.code);
        if (priceInfo) {
            setScanRate(priceInfo.purchasePrice || '');
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
        const amount = rate * qty;
        const mrp = parseFloat(scanMrp) || 0;

        const newRow = {
            itemCode: scanItemCode,
            itemName: scanItemName,
            size: scanSize,
            rate: rate,
            mrp: mrp,
            quantity: qty,
            amount: amount
        };

        setGridRows(prev => [...prev, newRow]);

        // Reset Scan Line
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
    };

    const handleDeleteRow = (index) => {
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        // Validation
        if (!selectedParty) {
            showMessage("Please select a Party", 'warning');
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

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Construct Payload
        const head = {
            invoiceNo,
            invoiceDate: invoiceDate.split('-').reverse().join('-'), // Convert YYYY-MM-DD to DD-MM-YYYY
            partyCode: selectedParty,
            narration,
            storeCode: storeInfo?.storeCode,
            userId: user.id || user.userId,
            purchaseAmount: totalAmount,
            totalAmount: grandTotal
        };

        const items = gridRows.map(row => ({
            itemCode: row.itemCode,
            sizeCode: row.size,
            mrp: row.mrp,
            rate: row.rate,
            quantity: row.quantity,
            amount: row.amount
        }));

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/purchase/save', { head, items }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Purchase Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    // Reset Form
                    setGridRows([]);
                    setInvoiceNo('');
                    setNarration('');
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            showMessage('Error saving purchase', 'error');
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

                        <div className="flex items-center gap-2 w-full">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Narration</label>
                            <input 
                                type="text" 
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                placeholder="Enter Narration"
                            />
                        </div>
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
                                    {sizeSearchResults.map((size, idx) => (
                                        <div 
                                            key={size.code}
                                            id={`suggestion-size-${idx}`}
                                            className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-50 last:border-0 ${
                                                idx === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                            }`}
                                            onClick={() => handleSelectSize(size)}
                                        >
                                            <div className="font-medium text-slate-800">{size.name}</div>
                                        </div>
                                    ))}
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
                                className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
                            <div className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-semibold h-[38px] flex items-center">
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
                <div className="bg-white px-4 py-2 border-t border-slate-200">
                    <div className="grid grid-cols-4 gap-8">
                        <div className="flex justify-between items-center text-slate-600">
                            <span className="text-xs font-semibold">Total Items</span>
                            <span className="text-base font-bold">{gridRows.length}</span>
                        </div>
                        <div className="col-span-2" />
                        <div className="flex items-center justify-between md:justify-end gap-4">
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
            </div>
        </div>
    );
};

export default PurchaseEntry;
