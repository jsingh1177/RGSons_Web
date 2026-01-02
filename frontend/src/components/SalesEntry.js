import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ScanBarcode, Trash2, Save, X, Store, Calendar, User, ArrowLeft, Plus, CheckCircle, AlertCircle, Info } from 'lucide-react';

const SalesEntry = () => {
    const navigate = useNavigate();

    // --- State ---
    // Header
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('New');
    const [storeInfo, setStoreInfo] = useState(null);

    // Grid State
    const [activeSizes, setActiveSizes] = useState([]);
    const [gridRows, setGridRows] = useState([]);

    // Scan Line State
    const [scanSearchInput, setScanSearchInput] = useState(''); // New input state
    const [scanItemCode, setScanItemCode] = useState('');
    const [scanItemName, setScanItemName] = useState('');
    const [scanQuantities, setScanQuantities] = useState({});
    const [scanMrps, setScanMrps] = useState({});
    const [scanClosingStocks, setScanClosingStocks] = useState({});
    const scanInputRef = useRef(null);
    const quantityRefs = useRef({}); // Refs for quantity inputs
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

    // Footer
    const totalAmount = React.useMemo(() => 
        gridRows.reduce((sum, row) => sum + (row.rowTotal || 0), 0), 
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
    const [messageModal, setMessageModal] = useState({ show: false, type: 'info', message: '' });

    // Derived Footer Values
    const otherSaleTotal = Object.values(otherSaleAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalSale = totalAmount + otherSaleTotal;
    const totalExp = Object.values(expensesAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalCollection = totalSale - totalExp;
    const totalTender = Object.values(tenderAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

    // --- Helpers ---
    const showMessage = (message, type = 'info') => {
        setMessageModal({ show: true, type, message });
    };

    const closeMessage = () => {
        setMessageModal(prev => ({ ...prev, show: false }));
    };

    // --- Effects ---
    useEffect(() => {
        fetchParties();
        fetchNextInvoiceNo();
        fetchStoreInfo();
        fetchActiveSizes();
        fetchOtherSaleLedgers();
        fetchExpensesLedgers();
        fetchTenderLedgers();
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

    // --- API Calls ---
    const fetchActiveSizes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/sizes/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActiveSizes(response.data || []);
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

    const fetchParties = async () => {
        try {
            const response = await axios.get('/api/sales/parties');
            setParties(response.data);
        } catch (error) {
            console.error("Error fetching parties", error);
        }
    };

    const fetchNextInvoiceNo = async () => {
        try {
            const response = await axios.get('/api/sales/generate-invoice-no');
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

    const fetchItemPrices = async (itemCode, rowIndex) => {
        if (!itemCode) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/prices/item/${itemCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success && response.data.prices) {
                const pricesMap = {};
                let itemName = '';
                
                response.data.prices.forEach(p => {
                    pricesMap[p.sizeCode] = p.mrp;
                    if (p.itemName) itemName = p.itemName;
                });

                setGridRows(prev => {
                    const newRows = [...prev];
                    const currentRow = newRows[rowIndex];
                    
                    // Recalculate total with new prices
                    let newRowTotal = 0;
                    Object.keys(currentRow.quantities).forEach(sizeCode => {
                        const qty = currentRow.quantities[sizeCode] || 0;
                        const mrp = pricesMap[sizeCode] || 0;
                        newRowTotal += qty * mrp;
                    });

                    newRows[rowIndex] = {
                        ...currentRow,
                        itemName: itemName || currentRow.itemName,
                        mrps: pricesMap,
                        rowTotal: newRowTotal
                    };
                    return newRows;
                });
            }
        } catch (error) {
            console.error("Error fetching item prices", error);
        }
    };

    // --- Handlers ---
    const fetchScanItemDetails = async (code) => {
        if (!code) return;
        try {
            const token = localStorage.getItem('token');
            const [pricesResponse, inventoryResponse] = await Promise.all([
                axios.get(`/api/prices/item/${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get(`/api/inventory/item/${code}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (pricesResponse.data.success && pricesResponse.data.prices) {
                const pricesMap = {};
                let itemName = '';
                
                pricesResponse.data.prices.forEach(p => {
                    pricesMap[p.sizeCode] = p.mrp;
                    if (p.itemName) itemName = p.itemName;
                });

                setScanItemName(itemName);
                setScanItemCode(code); // Ensure code is set
                setScanSearchInput(`${itemName}`); // Update input to show name
                setScanMrps(pricesMap);
            }

            if (inventoryResponse.data.success && inventoryResponse.data.inventory) {
                const closingMap = {};
                inventoryResponse.data.inventory.forEach(inv => {
                    closingMap[inv.sizeCode] = inv.closing;
                });
                setScanClosingStocks(closingMap);
            } else {
                setScanClosingStocks({});
            }
        } catch (error) {
            console.error("Error fetching item details", error);
        }
    };

    const handleScanItemCodeBlur = () => {
        // Delay hiding suggestions to allow click to register
        setTimeout(() => {
            if (suggestionClickedRef.current) {
                suggestionClickedRef.current = false;
                return;
            }
            setShowSuggestions(false);
            if (scanSearchInput && !scanItemCode) {
                // If text entered but no code selected, try to fetch by text (assuming it's a code)
                fetchScanItemDetails(scanSearchInput);
            }
        }, 200);
    };

    const searchTimeoutRef = useRef(null);
    const suggestionClickedRef = useRef(false);

    const handleScanInputChange = (e) => {
        const value = e.target.value;
        setScanSearchInput(value);
        setScanItemCode(''); // Reset code when typing
        setScanItemName('');
        setFocusedSuggestionIndex(-1); // Reset focus on input change
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (value.length > 1) {
            searchTimeoutRef.current = setTimeout(async () => {
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
        } else {
            setSearchResults([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (item) => {
        suggestionClickedRef.current = true;
        setScanItemCode(item.itemCode);
        setScanItemName(item.itemName);
        setScanSearchInput(`${item.itemName}`);
        setShowSuggestions(false);
        fetchScanItemDetails(item.itemCode);
        
        // Focus first quantity input
        if (activeSizes.length > 0) {
            const firstSizeCode = activeSizes[0].code;
            if (quantityRefs.current[firstSizeCode]) {
                setTimeout(() => {
                    quantityRefs.current[firstSizeCode].focus();
                }, 50);
            }
        }
    };

    const handleScanItemKeyDown = (e) => {
        // Handle keyboard navigation for suggestions
        if (showSuggestions && searchResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedSuggestionIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                return;
            }
            if (e.key === 'Enter' && focusedSuggestionIndex >= 0) {
                e.preventDefault();
                handleSelectSuggestion(searchResults[focusedSuggestionIndex]);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleScanItemCodeBlur();
            
            // Focus first quantity input
            if (activeSizes.length > 0) {
                const firstSizeCode = activeSizes[0].code;
                if (quantityRefs.current[firstSizeCode]) {
                    setTimeout(() => {
                        quantityRefs.current[firstSizeCode].focus();
                    }, 50);
                }
            }
        }
    };

    const handleScanQuantityKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            // If not the last size, move to next
            if (index < activeSizes.length - 1) {
                const nextSizeCode = activeSizes[index + 1].code;
                if (quantityRefs.current[nextSizeCode]) {
                    quantityRefs.current[nextSizeCode].focus();
                }
            } else {
                // If last size, add item
                handleAddItem();
            }
        }
    };

    const handleScanQuantityChange = (sizeCode, value) => {
        const qty = parseInt(value) || 0;
        if (qty < 0) return; // Prevent negative values
        setScanQuantities(prev => ({ ...prev, [sizeCode]: qty }));
    };


    const handleOtherSaleChange = (code, value) => {
        if (value === '') {
            setOtherSaleAmounts(prev => ({ ...prev, [code]: '' }));
            return;
        }
        const val = parseFloat(value);
        if (val < 0) return; // Prevent negative values
        setOtherSaleAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleExpenseChange = (code, value) => {
        if (value === '') {
            setExpensesAmounts(prev => ({ ...prev, [code]: '' }));
            return;
        }
        const val = parseFloat(value);
        if (val < 0) return; // Prevent negative values
        setExpensesAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleTenderAmountChange = (code, value) => {
        // Allow empty string for clearing input
        if (value === '') {
             setTenderAmounts(prev => ({ ...prev, [code]: '' }));
             return;
        }

        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return; // Prevent negative values

        // Calculate total of OTHER fields
        const currentOtherTotal = Object.entries(tenderAmounts)
            .filter(([k]) => k !== code)
            .reduce((sum, [_, v]) => sum + (parseFloat(v) || 0), 0);
            
        // Check if new value + others > totalCollection
        if (currentOtherTotal + val > totalCollection + 0.01) {
             showMessage(`Total tender cannot exceed Total Collection (₹${totalCollection.toFixed(2)})`, 'warning');
             return; 
        }

        setTenderAmounts(prev => ({ ...prev, [code]: value }));
    };

    const handleAddItem = () => {
        if (!scanItemCode) {
            showMessage("Please enter an Item Code", 'warning');
            if (scanInputRef.current) scanInputRef.current.focus();
            return;
        }
        
        // Check for quantities
        let hasQty = false;
        Object.keys(scanQuantities).forEach(sizeCode => {
            if ((scanQuantities[sizeCode] || 0) > 0) hasQty = true;
        });

        if (!hasQty) {
            showMessage("Please enter at least one quantity", 'warning');
            return;
        }

        setGridRows(prev => {
            const existingIndex = prev.findIndex(row => row.itemCode === scanItemCode);

            if (existingIndex !== -1) {
                // Update existing row
                const newRows = [...prev];
                const existingRow = newRows[existingIndex];
                
                // Merge quantities and MRPs
                const newQuantities = { ...existingRow.quantities };
                const newMrps = { ...existingRow.mrps, ...scanMrps }; // Update MRPs just in case

                Object.keys(scanQuantities).forEach(sizeCode => {
                    const scanQty = scanQuantities[sizeCode] || 0;
                    if (scanQty > 0) {
                        newQuantities[sizeCode] = (newQuantities[sizeCode] || 0) + scanQty;
                    }
                });

                // Recalculate Total
                let newRowTotal = 0;
                Object.keys(newQuantities).forEach(sizeCode => {
                    const qty = newQuantities[sizeCode] || 0;
                    const mrp = newMrps[sizeCode] || 0;
                    newRowTotal += qty * mrp;
                });

                newRows[existingIndex] = {
                    ...existingRow,
                    itemName: scanItemName || existingRow.itemName,
                    quantities: newQuantities,
                    mrps: newMrps,
                    rowTotal: newRowTotal
                };
                return newRows;
            } else {
                // Add new row
                let rowTotal = 0;
                Object.keys(scanQuantities).forEach(sizeCode => {
                    const qty = scanQuantities[sizeCode] || 0;
                    rowTotal += qty * (scanMrps[sizeCode] || 0);
                });

                const newRow = {
                    id: Date.now(),
                    itemCode: scanItemCode,
                    itemName: scanItemName,
                    quantities: { ...scanQuantities },
                    mrps: { ...scanMrps },
                    rowTotal: rowTotal
                };
                return [...prev, newRow];
            }
        });
        
        // Reset scan line
        setScanItemCode('');
        setScanItemName('');
        setScanSearchInput('');
        setScanQuantities({});
        setScanMrps({});
        setScanClosingStocks({});
        
        if (scanInputRef.current) scanInputRef.current.focus();
    };

    const handleItemCodeChange = (index, value) => {
        setGridRows(prev => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], itemCode: value };
            return newRows;
        });
    };

    const handleItemCodeBlur = (index, value) => {
        if (value) {
            fetchItemPrices(value, index);
        }
    };

    const handleQuantityChange = (rowIndex, sizeCode, value) => {
        const qty = parseInt(value) || 0;
        
        setGridRows(prev => {
            const newRows = [...prev];
            const currentRow = newRows[rowIndex];
            
            const newQuantities = { ...currentRow.quantities, [sizeCode]: qty };
            
            // Recalculate row total
            let newRowTotal = 0;
            activeSizes.forEach(size => {
                const sCode = size.code;
                const q = sCode === sizeCode ? qty : (newQuantities[sCode] || 0);
                const mrp = currentRow.mrps[sCode] || 0;
                newRowTotal += q * mrp;
            });

            newRows[rowIndex] = {
                ...currentRow,
                quantities: newQuantities,
                rowTotal: newRowTotal
            };
            return newRows;
        });
    };

    const handleRemoveRow = (index) => {
        setGridRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!selectedParty) {
            showMessage('Please select a Party Name', 'warning');
            return;
        }

        const itemsPayload = [];
        gridRows.forEach(row => {
            if (!row.itemCode) return;
            
            Object.keys(row.quantities).forEach(sizeCode => {
                const qty = row.quantities[sizeCode];
                if (qty > 0) {
                    itemsPayload.push({
                        itemCode: row.itemCode,
                        sizeCode: sizeCode,
                        mrp: row.mrps[sizeCode] || 0,
                        quantity: qty,
                        amount: qty * (row.mrps[sizeCode] || 0)
                    });
                }
            });
        });

        if (itemsPayload.length === 0) {
            showMessage('Please add at least one item', 'warning');
            return;
        }

        if (!storeInfo || !storeInfo.storeCode) {
            showMessage('Store information missing. Cannot save.', 'error');
            return;
        }

        // Calculate Totals
        const calculateTotal = (map) => Object.values(map).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        
        const totalOtherSale = calculateTotal(otherSaleAmounts);
        const totalExpenses = calculateTotal(expensesAmounts);
        const totalTender = calculateTotal(tenderAmounts);
        const gridTotal = totalAmount;
        const totalCollection = gridTotal + totalOtherSale - totalExpenses;

        // Validate Total Payment vs Collection
        if (totalTender > totalCollection + 0.01) { // Adding small epsilon for float precision
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

        const user = JSON.parse(localStorage.getItem('user') || '{}');

        const payload = {
            invoiceNo,
            invoiceDate,
            partyCode: selectedParty,
            saleAmount: gridTotal, // Previously totalAmount, now mapped to saleAmount
            tenderType: 'Split',
            storeCode: storeInfo.storeCode,
            userId: user.id,
            
            otherSale: totalOtherSale,
            totalExpenses: totalExpenses,
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
        setScanQuantities({});
        setScanMrps({});
        setScanClosingStocks({});
        setOtherSaleAmounts({});
        setExpensesAmounts({});
        setTenderAmounts({});

        setSelectedParty('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        fetchNextInvoiceNo();
        if (scanInputRef.current) scanInputRef.current.focus();
    };

    const handleCancel = () => {
        if (window.confirm('Do you want to cancel this invoice?')) {
            resetForm();
        }
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
                                        type="date" 
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
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
                    <table className="w-full min-w-[1000px] text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-50 shadow-sm">
                            <tr>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center border-b border-slate-200">#</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-56 border-b border-slate-200">Item Details</th>
                                {activeSizes.map(size => (
                                    <th key={size.id} className="py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-20 border-b border-slate-200">
                                        {size.name}
                                    </th>
                                ))}
                                <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-24 border-b border-slate-200">Total</th>
                                <th className="py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 border-b border-slate-200"></th>
                            </tr>
                            
                            {/* Input Row */}
                            <tr className="bg-indigo-50/30 border-b border-indigo-100">
                                <td className="py-2 px-3 text-center text-xs font-bold text-slate-400">
                                    New
                                </td>
                                <td className="py-2 px-3 relative">
                                    <div className="relative">
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ScanBarcode className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <input 
                                            ref={scanInputRef}
                                            type="text" 
                                            className="w-full pl-8 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase h-8"
                                            placeholder="Scan or Search Item"
                                            value={scanSearchInput}
                                            onChange={handleScanInputChange}
                                            onKeyDown={handleScanItemKeyDown}
                                            onBlur={handleScanItemCodeBlur}
                                        />
                                    </div>
                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute left-3 right-3 z-[60] bg-white border border-slate-200 shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
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
                                                    <div className="font-medium text-xs text-slate-700">{item.itemName}</div>
                                                    <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                                        <span>Code: {item.itemCode}</span>
                                                        <span>Price: ₹{item.salePrice}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                    {activeSizes.map((size, index) => (
                                    <td key={size.id} className="py-2 px-2">
                                        <div className="flex flex-col items-center">
                                            <input 
                                                ref={el => quantityRefs.current[size.code] = el}
                                                type="number" 
                                                min="0"
                                                disabled={(scanClosingStocks[size.code] || 0) < 1}
                                                className={`w-full px-1 py-1 text-sm text-center border rounded focus:ring-2 focus:ring-indigo-500 outline-none h-8 ${
                                                    (scanClosingStocks[size.code] || 0) < 1 
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                    : 'bg-white border-slate-300'
                                                }`}
                                                placeholder="0"
                                                value={scanQuantities[size.code] || ''}
                                                onChange={(e) => handleScanQuantityChange(size.code, e.target.value)}
                                                onKeyDown={(e) => handleScanQuantityKeyDown(e, index)}
                                            />
                                            {(scanMrps[size.code] || scanClosingStocks[size.code] !== undefined) && (
                                                <div className="flex flex-col items-center mt-1">
                                                    {scanClosingStocks[size.code] !== undefined && (
                                                        <span className="text-[9px] text-slate-500 font-medium">
                                                            Cl: {scanClosingStocks[size.code]}
                                                        </span>
                                                    )}
                                                    {scanMrps[size.code] && (
                                                        <span className="text-[9px] text-slate-500 font-medium">
                                                            MRP: ₹{scanMrps[size.code]}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                ))}
                                <td className="py-2 px-3 text-right">
                                    {/* Optional Total */}
                                </td>
                                <td className="py-2 px-2 text-center">
                                    <button 
                                        onClick={handleAddItem}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm transition-colors h-8 w-8 flex items-center justify-center mx-auto"
                                        title="Add Item"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gridRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5 + activeSizes.length} className="py-10 text-center text-slate-400 text-sm">
                                        No items added yet. Scan or type an item code to begin.
                                    </td>
                                </tr>
                            ) : gridRows.map((row, index) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="py-1.5 px-3 text-xs text-slate-400 text-center">{index + 1}</td>
                                    <td className="py-1.5 px-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-700">{row.itemName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{row.itemCode}</span>
                                        </div>
                                    </td>
                                    {activeSizes.map(size => (
                                        <td key={size.id} className="py-1.5 px-2 text-center">
                                            <div className="flex flex-col items-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    value={row.quantities[size.code] || ''}
                                                    onChange={(e) => handleQuantityChange(index, size.code, e.target.value)}
                                                />
                                                <span className="text-[9px] text-slate-400 mt-0.5">₹{row.mrps[size.code] || 0}</span>
                                            </div>
                                        </td>
                                    ))}
                                    <td className="py-1.5 px-3 text-right font-bold text-indigo-600 text-xs">
                                        ₹{row.rowTotal.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                        <button 
                                            onClick={() => handleRemoveRow(index)}
                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
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
                {/* Message Modal */}
                {messageModal.show && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                            <div className={`p-4 flex flex-col items-center text-center gap-3 ${
                                messageModal.type === 'success' ? 'bg-green-50' : 
                                messageModal.type === 'error' ? 'bg-red-50' : 
                                'bg-blue-50'
                            }`}>
                                {messageModal.type === 'success' && <CheckCircle className="w-12 h-12 text-green-500" />}
                                {messageModal.type === 'error' && <AlertCircle className="w-12 h-12 text-red-500" />}
                                {(messageModal.type === 'info' || messageModal.type === 'warning') && <Info className="w-12 h-12 text-blue-500" />}
                                
                                <h3 className={`text-lg font-bold ${
                                    messageModal.type === 'success' ? 'text-green-700' : 
                                    messageModal.type === 'error' ? 'text-red-700' : 
                                    'text-blue-700'
                                }`}>
                                    {messageModal.type === 'success' ? 'Success' : 
                                     messageModal.type === 'error' ? 'Error' : 
                                     'Information'}
                                </h3>
                            </div>
                            
                            <div className="p-6">
                                <p className="text-slate-600 text-center text-sm font-medium">
                                    {messageModal.message}
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 flex justify-center border-t border-slate-100">
                                <button 
                                    onClick={closeMessage}
                                    className={`px-6 py-2 rounded-md text-white font-medium shadow-sm transition-colors ${
                                        messageModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                                        messageModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                                        'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    OK
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
