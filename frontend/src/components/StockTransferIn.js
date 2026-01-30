import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Trash2, Save, ArrowLeft, Store, Calendar, Search, FileText } from 'lucide-react';

const StockTransferIn = () => {
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
    const [toStore, setToStore] = useState(''); // Current Logged in Store
    const [fromStore, setFromStore] = useState(''); // Received From
    
    const [stiDate, setStiDate] = useState(formatDateForInput(new Date()));
    const [stiNumber, setStiNumber] = useState('New');
    
    const [selectedSto, setSelectedSto] = useState(''); // STO Number
    const [stoDate, setStoDate] = useState('');
    const [pendingStos, setPendingStos] = useState([]);
    
    const [narration, setNarration] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

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
    const sizeInputRef = useRef(null);
    const rateRef = useRef(null);
    const quantityRef = useRef(null);
    
    const scanDebounceRef = useRef(null);
    const scanAbortControllerRef = useRef(null);

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
        if (user.userName) {
            fetchUserStore(user.userName);
        }
    }, []);

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

    // --- API Calls ---
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
            const response = await axios.get(`/api/stores/by-user/${userName}`);
            if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                const userStore = response.data.stores[0].storeCode;
                setToStore(userStore);
                // Fetch next STI number immediately when store is found
                fetchNextStiNumber(userStore);
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
            setScanRate(priceInfo.purchasePrice || ''); 
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
                    price: mrp,
                    quantity: qty,
                    amount: amount
                };
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
                setScanRate(priceInfo.purchasePrice || ''); 
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
            const response = await axios.post('/api/sti/save', { head, items }, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Stock Transfer In Saved Successfully',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    // Reset Form
                    setGridRows([]);
                    setStiNumber('New');
                    if (toStore) fetchNextStiNumber(toStore);
                    setSelectedSto('');
                    setFromStore('');
                    setNarration('');
                    setPendingStos(prev => prev.filter(s => s.stoNumber !== selectedSto));
                });
            } else {
                showMessage(response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error("Save error", error);
            showMessage('Error saving stock transfer', 'error');
        }
    };

    // Filter Pending STOs based on From Store
    const filteredStos = fromStore 
        ? pendingStos.filter(sto => sto.fromStore === fromStore)
        : pendingStos;

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
                            <h2 className="text-lg font-bold text-slate-800">Stock Transfer In</h2>
                        </div>
                        
                        {currentStoreInfo && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm ml-4">
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
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6">
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
                                        disabled
                                        className="pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed focus:outline-none transition-all shadow-sm"
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
                    <div className="col-span-4 py-2 border-r border-indigo-100 px-2 relative">
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
                            disabled
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-center text-slate-400 cursor-not-allowed focus:outline-none shadow-sm"
                        />
                        {showSizeSuggestions && sizeSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto min-w-[120px]">
                                {sizeSearchResults.map((size, index) => (
                                    <div
                                        id={`suggestion-size-${index}`}
                                        key={size.id}
                                        onClick={() => handleSelectSize(size)}
                                        className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group ${
                                            index === focusedSizeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{size.name}</span>
                                        {size.shortOrder > 0 && (
                                            <span className="text-[10px] text-slate-400 font-mono">#{size.shortOrder}</span>
                                        )}
                                    </div>
                                ))}
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
                            disabled
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-center text-slate-400 cursor-not-allowed focus:outline-none shadow-sm"
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
                            disabled
                            className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-right text-slate-400 cursor-not-allowed focus:outline-none shadow-sm"
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
                            disabled
                            className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-400 rounded-lg shadow-sm cursor-not-allowed transition-all"
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
                                <span>Save Transfer In</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockTransferIn;
