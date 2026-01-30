import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft } from 'lucide-react';
import './DailySaleReport.css';

const DailySaleReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isViewMode, setIsViewMode] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [storeInfo, setStoreInfo] = useState({ code: '', name: '' });
    const [allStores, setAllStores] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [sizes, setSizes] = useState([]);
    const [brands, setBrands] = useState([]);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [saleLedgers, setSaleLedgers] = useState([]);
    const [expenseLedgers, setExpenseLedgers] = useState([]);
    const [tenderLedgers, setTenderLedgers] = useState([]);
    const [tranLedgers, setTranLedgers] = useState([]);
    const [salesData, setSalesData] = useState({});
    const [dsrData, setDsrData] = useState({});
    const [dsrStatus, setDsrStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const showMessage = (message, type = 'info') => {
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: type,
            confirmButtonText: 'OK'
        });
    };

    // Helper to format date for API (ensure dd-mm-yyyy)
    const formatDateForApi = (dateStr) => {
        if (!dateStr) return '';
        // If already dd-mm-yyyy, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            return dateStr;
        }
        // If yyyy-mm-dd, convert to dd-mm-yyyy
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    // Fetch sales data for current store and business date (from Tran_Item)
    const fetchSalesData = async () => {
        try {
            const token = localStorage.getItem('token');
            // Use selectedDate if available, else business date, else today
            let isoDate;
            if (selectedDate) {
                isoDate = selectedDate;
            } else if (storeInfo.businessDate) {
                isoDate = storeInfo.businessDate;
            } else {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                isoDate = `${yyyy}-${mm}-${dd}`;
            }
            if (!storeInfo.code) return;
            
            const apiDate = formatDateForApi(isoDate);
            const response = await axios.get(`/api/sales/items/by-store-date?store=${encodeURIComponent(storeInfo.code)}&date=${apiDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Aggregate data
            const salesMap = {};
            (response.data || []).forEach(item => {
                if (!salesMap[item.itemCode]) {
                    salesMap[item.itemCode] = {};
                }
                if (!salesMap[item.itemCode][item.sizeCode]) {
                    salesMap[item.itemCode][item.sizeCode] = { quantity: 0, amount: 0, mrp: 0 };
                }
                salesMap[item.itemCode][item.sizeCode].quantity += (item.quantity || 0);
                salesMap[item.itemCode][item.sizeCode].amount += (item.amount || 0);
                if (item.mrp) {
                    salesMap[item.itemCode][item.sizeCode].mrp = item.mrp;
                }
            });
            setSalesData(salesMap);
        } catch (error) {
            console.error("Error fetching sales data", error);
        }
    };

    // Fetch Tran Ledgers data for current store and business date
    const fetchTranLedgers = async () => {
        try {
            const token = localStorage.getItem('token');
            let isoDate;
            if (selectedDate) {
                isoDate = selectedDate;
            } else if (storeInfo.businessDate) {
                isoDate = storeInfo.businessDate;
            } else {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                isoDate = `${yyyy}-${mm}-${dd}`;
            }
            if (!storeInfo.code) return;
            
            const apiDate = formatDateForApi(isoDate);
            const response = await axios.get(`/api/sales/ledgers/by-store-date?store=${encodeURIComponent(storeInfo.code)}&date=${apiDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTranLedgers(response.data || []);
        } catch (error) {
            console.error("Error fetching tran ledgers", error);
        }
    };

    // Fetch DSR Status
    const fetchDsrStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            let isoDate;
            if (selectedDate) {
                isoDate = selectedDate;
            } else if (storeInfo.businessDate) {
                isoDate = storeInfo.businessDate;
            } else {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                isoDate = `${yyyy}-${mm}-${dd}`;
            }
            if (!storeInfo.code) return;
            
            const apiDate = formatDateForApi(isoDate);
            const response = await axios.get(`/api/dsr/status?store=${encodeURIComponent(storeInfo.code)}&date=${apiDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDsrStatus(response.data || '');
        } catch (error) {
            console.error("Error fetching DSR status", error);
        }
    };

    // Fetch DSR data for current store and business date
    const fetchDsrData = async () => {
        try {
            const token = localStorage.getItem('token');
            let isoDate;
            if (selectedDate) {
                isoDate = selectedDate;
            } else if (storeInfo.businessDate) {
                isoDate = storeInfo.businessDate;
            } else {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                isoDate = `${yyyy}-${mm}-${dd}`;
            }
            if (!storeInfo.code) return;
            const apiDate = formatDateForApi(isoDate);
            const response = await axios.get(`/api/dsr/by-store-date?store=${encodeURIComponent(storeInfo.code)}&date=${apiDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const map = {};
            (response.data || []).forEach(row => {
                const ic = row.itemCode;
                const sc = row.sizeCode;
                if (!map[ic]) map[ic] = {};
                map[ic][sc] = {
                    opening: row.opening || 0,
                    inward: row.inward || 0,
                    outward: row.outward || 0,
                    closing: row.closing || 0,
                    mrp: row.mrp || 0
                };
            });
            setDsrData(map);
        } catch (error) {
            console.error("Error fetching DSR data", error);
        }
    };

    useEffect(() => {
        if (location.state?.mode === 'view') {
            setIsViewMode(true);
        }
    }, [location.state]);

    useEffect(() => {
        // Fetch store info
        const fetchStoreInfo = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const token = localStorage.getItem('token');
                
                // Set user role
                const role = user.role || '';
                setUserRole(role);
                
                let initialStore = null;

                if (role === 'SUPPER' || role === 'HO_USER' || role === 'HO USER') {
                    // Fetch all stores for selection
                    const response = await axios.get('/api/stores', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data.success && response.data.stores) {
                        setAllStores(response.data.stores);
                        if (response.data.stores.length > 0) {
                            initialStore = response.data.stores[0];
                        }
                    }
                } 
                
                // If no store selected yet (or not SUPPER/HO), fetch assigned stores
                if (!initialStore && user.userName) {
                    const response = await axios.get(`/api/stores/by-user/${user.userName}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                        initialStore = response.data.stores[0];
                    }
                }

                if (initialStore) {
                    setStoreInfo({
                        id: initialStore.id,
                        code: initialStore.storeCode,
                        name: initialStore.storeName,
                        businessDate: initialStore.businessDate
                    });
                    // Use business_date for header display if available
                    if (initialStore.businessDate) {
                        if (/^\d{2}-\d{2}-\d{4}$/.test(initialStore.businessDate)) {
                            setCurrentDate(initialStore.businessDate.replace(/-/g, '/'));
                            const [d, m, y] = initialStore.businessDate.split('-');
                            setSelectedDate(`${y}-${m}-${d}`);
                        } else {
                            const bd = new Date(initialStore.businessDate);
                            const bdFormatted = bd.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                            setCurrentDate(bdFormatted);
                            setSelectedDate(initialStore.businessDate);
                        }
                    } else {
                        // Fallback to today's date if business date not set
                        const today = new Date();
                        const formattedDate = today.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        setCurrentDate(formattedDate);
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const dd = String(today.getDate()).padStart(2, '0');
                        setSelectedDate(`${yyyy}-${mm}-${dd}`);
                    }
                }
            } catch (error) {
                console.error("Error fetching store info", error);
            }
        };

        // Fetch sizes
        const fetchSizes = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/sizes/active', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const sortedSizes = (response.data || []).sort((a, b) => {
                    const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
                    const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    return a.name.localeCompare(b.name);
                });
                setSizes(sortedSizes);
            } catch (error) {
                console.error("Error fetching sizes", error);
            }
        };

        // Fetch brands
        const fetchBrands = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/brands/active', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data.success) {
                    const sortedBrands = (response.data.brands || []).sort((a, b) => a.name.localeCompare(b.name));
                    setBrands(sortedBrands);
                }
            } catch (error) {
                console.error("Error fetching brands", error);
            }
        };

        // Fetch items
        const fetchItems = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/items', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data.success) {
                    // Filter active items
                    const activeItems = (response.data.items || []).filter(item => item.status === true);
                    setItems(activeItems);
                }
            } catch (error) {
                console.error("Error fetching items", error);
            }
        };

        // Fetch categories
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/categories/active', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data.success) {
                    const sortedCategories = (response.data.categories || []).sort((a, b) => a.name.localeCompare(b.name));
                    setCategories(sortedCategories);
                }
            } catch (error) {
                console.error("Error fetching categories", error);
            }
        };

        // Fetch Sale Ledgers
        const fetchSaleLedgers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/ledgers/filter?type=Sale&screen=Sale', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSaleLedgers(response.data || []);
            } catch (error) {
                console.error("Error fetching sale ledgers", error);
            }
        };

        // Fetch Expense Ledgers
        const fetchExpenseLedgers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/ledgers/filter?type=Expense&screen=Sale', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setExpenseLedgers(response.data || []);
            } catch (error) {
                console.error("Error fetching expense ledgers", error);
            }
        };

        // Fetch Tender Ledgers
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

        fetchStoreInfo();
        fetchSizes();
        fetchBrands();
        fetchCategories();
        fetchSaleLedgers();
        fetchExpenseLedgers();
        fetchTenderLedgers();
        fetchItems();
        // Initial sales will be fetched when store info becomes available
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!storeInfo.code) return;
            
            setLoading(true);
            try {
                await Promise.all([
                    fetchDsrData(),
                    fetchSalesData(),
                    fetchTranLedgers(),
                    fetchDsrStatus()
                ]);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [storeInfo.code, selectedDate]);

    // Calculate Grand Totals
    const grandTotals = React.useMemo(() => {
        const totals = {};
        sizes.forEach(size => {
            totals[size.code] = {
                opening: 0, inward: 0, outward: 0, total: 0, closing: 0, sale: 0, amount: 0
            };
        });

        items.forEach(item => {
             // Check if item belongs to an active brand
             const brandIsActive = brands.some(b => b.code === item.brandCode);
             if (!brandIsActive) return;

             sizes.forEach(size => {
                 const d = dsrData[item.itemCode]?.[size.code];
                 const s = salesData[item.itemCode]?.[size.code];

                 const opening = d?.opening || 0;
                 const inward = d?.inward || 0;
                 const outward = d?.outward || 0;
                 const saleQty = s?.quantity || 0;
                 const saleAmount = s?.amount || 0;
                 
                 const total = opening + inward - outward;
                 // Closing logic: (Opening + Received) - (Transfer + Sale)
                 const closing = (opening + inward) - (outward + saleQty);

                 if (totals[size.code]) {
                     totals[size.code].opening += opening;
                     totals[size.code].inward += inward;
                     totals[size.code].outward += outward;
                     totals[size.code].total += total;
                     totals[size.code].closing += closing;
                     totals[size.code].sale += saleQty;
                     totals[size.code].amount += saleAmount;
                 }
             });
        });
        return totals;
    }, [items, brands, sizes, dsrData, salesData]);

    const { categoryTotals, totalSaleAmount } = React.useMemo(() => {
        const catTotals = {};
        let totalSale = 0;

        items.forEach(item => {
             const catCode = item.categoryCode;
             if (!catCode) return;
             
             const itemSales = salesData[item.itemCode];
             if (itemSales) {
                 let itemAmt = 0;
                 Object.values(itemSales).forEach(s => {
                     itemAmt += (s.amount || 0);
                 });
                 if (itemAmt !== 0) {
                     catTotals[catCode] = (catTotals[catCode] || 0) + itemAmt;
                     totalSale += itemAmt;
                 }
             }
        });
        return { categoryTotals: catTotals, totalSaleAmount: totalSale };
    }, [items, salesData]);

    const { ledgerTotals, expenseTotals, totalExpense, tenderTotals, totalTender, saleTotals, totalOtherSale } = React.useMemo(() => {
        const totals = {};
        const expTotals = {};
        const tndTotals = {};
        const slTotals = {};
        let expTotal = 0;
        let tndTotal = 0;
        let slTotal = 0;
        tranLedgers.forEach(l => {
            if (l.ledgerCode && l.amount != null) {
                const amt = Number(l.amount) || 0;
                totals[l.ledgerCode] = (totals[l.ledgerCode] || 0) + amt;
                if (l.type === 'Expense') {
                    expTotals[l.ledgerCode] = (expTotals[l.ledgerCode] || 0) + amt;
                    expTotal += amt;
                }
                if (l.type === 'Tender') {
                    tndTotals[l.ledgerCode] = (tndTotals[l.ledgerCode] || 0) + amt;
                    tndTotal += amt;
                }
                if (l.type === 'Sale' || l.type === 'Other Sale') {
                    slTotals[l.ledgerCode] = (slTotals[l.ledgerCode] || 0) + amt;
                    slTotal += amt;
                }
            }
        });
        return { ledgerTotals: totals, expenseTotals: expTotals, totalExpense: expTotal, tenderTotals: tndTotals, totalTender: tndTotal, saleTotals: slTotals, totalOtherSale: slTotal };
    }, [tranLedgers]);

    const handleDsrChange = (itemCode, sizeCode, field, value) => {
        const val = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(val)) return;

        setDsrData(prevData => {
            const newData = { ...prevData };
            if (!newData[itemCode]) newData[itemCode] = {};
            if (!newData[itemCode][sizeCode]) newData[itemCode][sizeCode] = { opening: 0, inward: 0, outward: 0, closing: 0, mrp: 0 };
            
            newData[itemCode][sizeCode] = {
                ...newData[itemCode][sizeCode],
                [field]: val
            };
            return newData;
        });
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            const details = [];
            
            // Iterate through items and sizes to build details
            items.forEach(item => {
                sizes.forEach(size => {
                    const d = dsrData[item.itemCode]?.[size.code];
                    const s = salesData[item.itemCode]?.[size.code];
                    
                    if (d || s) {
                        details.push({
                            itemCode: item.itemCode,
                            sizeCode: size.code,
                            inward: d?.inward || 0,
                            outward: d?.outward || 0,
                            sale: s?.quantity || 0
                        });
                    }
                });
            });

            const payload = {
                storeCode: storeInfo.code,
                dsrDate: formatDateForApi(selectedDate || storeInfo.businessDate || currentDate),
                userName: user.userName || user.userId || 'system',
                details: details
            };

            await axios.post('/api/dsr/save', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Close Store after successful save
            if (storeInfo.id) {
                try {
                    const storeResp = await axios.get(`/api/stores/${storeInfo.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (storeResp.data && storeResp.data.success && storeResp.data.store) {
                        const updatedStore = {
                            ...storeResp.data.store,
                            openStatus: false
                        };
                        
                        await axios.put(`/api/stores/${storeInfo.id}`, updatedStore, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    }
                } catch (closeError) {
                    console.error('Error closing store:', closeError);
                }
            }
            
            showMessage('DSR Submitted and Store Closed Successfully', 'success');
            navigate('/store-dashboard');
        } catch (error) {
            console.error('Error saving DSR', error);
            showMessage('Error saving DSR', 'error');
        }
    };

    const handlePrint = () => {
        const input = document.querySelector('.dsr-container');
        if (!input) return Promise.resolve();

        return html2canvas(input, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: input.scrollWidth,
            windowHeight: input.scrollHeight,
            onclone: (documentClone) => {
                const wrapper = documentClone.querySelector('.dsr-table-wrapper');
                if (wrapper) {
                    wrapper.style.overflow = 'visible';
                    wrapper.style.maxHeight = 'none';
                    wrapper.style.height = 'auto';
                    wrapper.style.display = 'block'; // Ensure it takes full height
                }
                const container = documentClone.querySelector('.dsr-container');
                if (container) {
                    container.style.height = 'auto';
                    container.style.minHeight = 'auto';
                    container.style.overflow = 'visible';
                    container.style.width = 'fit-content';
                }
            }
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            // Fit to width
            const ratio = pdfWidth / imgWidth;
            const imgHeightInPdf = imgHeight * ratio;
            
            // If it's taller than the page, scale to fit height instead
            let finalRatio = ratio;
            if (imgHeightInPdf > pdfHeight) {
                finalRatio = pdfHeight / imgHeight;
            }

            const finalWidth = imgWidth * finalRatio;
            const finalHeight = imgHeight * finalRatio;

            // Center horizontally if scaled by height
            const x = (pdfWidth - finalWidth) / 2;
            const y = 0; // Top aligned

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            pdf.save(`DailySaleReport_${currentDate || 'Report'}.pdf`);
        });
    };

    const handleBack = () => {
        if (location.state?.from) {
            navigate(location.state.from);
        } else {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const role = user.role || '';
            if (role === 'SUPPER' || role === 'HO_USER' || role === 'HO USER') {
                navigate('/ho-dashboard');
            } else {
                navigate('/store-dashboard');
            }
        }
    };

    return (
        <div className="dsr-container">
            <div className="dsr-header-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                        onClick={handleBack}
                        style={{ 
                            padding: '4px', 
                            borderRadius: '50%', 
                            border: 'none', 
                            background: 'transparent', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={location.state?.from === '/ho-dashboard' ? "Back to HO Dashboard" : "Back to Dashboard"}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ArrowLeft size={24} color="#333" />
                    </button>
                    <h2>DAILY SALE STATEMENT IMFL SHOP &nbsp;<span className="header-value">{storeInfo.code} {storeInfo.name}</span></h2>
                </div>
                {isViewMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {(userRole === 'SUPPER' || userRole === 'HO_USER' || userRole === 'HO USER') && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <h2>STORE &nbsp;</h2>
                                <select 
                                    value={storeInfo.code}
                                    onChange={(e) => {
                                        const selected = allStores.find(s => s.storeCode === e.target.value);
                                        if (selected) {
                                            setStoreInfo({
                                                id: selected.id,
                                                code: selected.storeCode,
                                                name: selected.storeName,
                                                businessDate: selected.businessDate
                                            });
                                        }
                                    }}
                                    style={{
                                        fontSize: '1rem',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        marginRight: '15px'
                                    }}
                                >
                                    {allStores.map(store => (
                                        <option key={store.id} value={store.storeCode}>
                                            {store.storeCode} - {store.storeName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <h2>DATE &nbsp;</h2>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ 
                                    fontSize: '1.2rem', 
                                    fontWeight: 'bold', 
                                    border: '1px solid #ccc', 
                                    borderRadius: '4px',
                                    padding: '2px 5px',
                                    color: '#333' 
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <h2>DATE &nbsp;<span className="header-value">{currentDate}</span></h2>
                )}
            </div>
            
            <div className="dsr-table-wrapper">
                <table className="dsr-table">
                    <thead>
                        <tr>
                            <th rowSpan="3" className="col-brand">BRAND NAME</th>
                            <th colSpan={sizes.length} className="section-header">OPENING BALANCE</th>
                            <th colSpan={sizes.length} className="section-header">RECEIVED</th>
                            <th colSpan={sizes.length} className="section-header">TRANSFER</th>
                            <th colSpan={sizes.length} className="section-header">CLOSING BALANCE</th>
                            <th colSpan={sizes.length} className="section-header">SALE</th>
                            <th colSpan={sizes.length} className="section-header">RATE</th>
                            <th colSpan={sizes.length} className="section-header">AMOUNT</th>
                            <th rowSpan="3" className="col-remarks">REMARKS</th>
                        </tr>
                        <tr>
                            <th colSpan={sizes.length} className="number-header">1</th>
                            <th colSpan={sizes.length} className="number-header">2</th>
                            <th colSpan={sizes.length} className="number-header">3</th>
                            <th colSpan={sizes.length} className="number-header">4</th>
                            <th colSpan={sizes.length} className="number-header">5</th>
                            <th colSpan={sizes.length} className="number-header">6</th>
                            <th colSpan={sizes.length} className="number-header">7</th>
                        </tr>
                        <tr>
                            {/* Repeat sizes 7 times */}
                            {[...Array(7)].map((_, groupIdx) => (
                                sizes.map((size) => (
                                    <th key={`h-${groupIdx}-${size.id}`} className="size-header">{size.name}</th>
                                ))
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {brands.map((brand) => {
                            // Find items for this brand
                            const brandItems = items.filter(item => item.brandCode === brand.code);
                            
                            // If no items, do not display the brand
                            if (brandItems.length === 0) {
                                return null;
                            }

                            return (
                                <React.Fragment key={brand.id || brand.code}>
                                    {/* Brand Header Row */}
                                    <tr className="category-row">
                                        <td className="category-cell">{brand.name}</td>
                                        <td colSpan={sizes.length * 7 + 1}></td>
                                    </tr>
                                    
                                    {/* Item Rows */}
                                    {brandItems.map((item) => (
                                        <tr key={item.id}>
                                            <td className="brand-cell">{item.itemName}</td>
                                            
                                            {sizes.map((size) => {
                                                const v = dsrData[item.itemCode]?.[size.code]?.opening;
                                                return <td key={`op-${size.id}`} className="data-cell">{v > 0 ? v : ''}</td>;
                                            })}
                                            {sizes.map((size) => {
                                                const v = dsrData[item.itemCode]?.[size.code]?.inward;
                                                return (
                                                    <td key={`rec-${size.id}`} className="data-cell">
                                                        <input 
                                                            type="text" 
                                                            className="dsr-input"
                                                            value={v > 0 ? v : ''} 
                                                            onChange={(e) => handleDsrChange(item.itemCode, size.code, 'inward', e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {sizes.map((size) => {
                                                const v = dsrData[item.itemCode]?.[size.code]?.outward;
                                                return (
                                                    <td key={`tr-${size.id}`} className="data-cell">
                                                        <input 
                                                            type="text" 
                                                            className="dsr-input"
                                                            value={v > 0 ? v : ''} 
                                                            onChange={(e) => handleDsrChange(item.itemCode, size.code, 'outward', e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {/* CLOSING BALANCE (5) */}
                                            {sizes.map((size) => {
                                                const d = dsrData[item.itemCode]?.[size.code];
                                                const s = salesData[item.itemCode]?.[size.code];
                                                
                                                const opening = d?.opening || 0;
                                                const inward = d?.inward || 0;
                                                const outward = d?.outward || 0;
                                                const sale = s?.quantity || 0;
                                                
                                                // Logic (Opening + Receive) - (transafer + Sale)
                                                const closing = (opening + inward) - (outward + sale);
                                                
                                                return <td key={`cb-${size.id}`} className="data-cell">{closing !== 0 ? closing : ''}</td>;
                                            })}

                                            {/* SALE (Quantity) */}
                                            {sizes.map((size) => {
                                                const data = salesData[item.itemCode]?.[size.code];
                                                const qty = data?.quantity;
                                                return (
                                                    <td key={`sale-${size.id}`} className="data-cell">
                                                        {qty > 0 ? qty : ''}
                                                    </td>
                                                );
                                            })}

                                            {/* RATE (from DSR MRP) */}
                                            {sizes.map((size) => {
                                                const mrp = dsrData[item.itemCode]?.[size.code]?.mrp;
                                                return <td key={`rate-${size.id}`} className="data-cell">{mrp > 0 ? mrp : ''}</td>;
                                            })}

                                            {/* AMOUNT (Amount) */}
                                            {sizes.map((size) => {
                                                const data = salesData[item.itemCode]?.[size.code];
                                                const amount = data?.amount;
                                                return (
                                                    <td key={`amt-${size.id}`} className="data-cell">
                                                        {amount > 0 ? amount : ''}
                                                    </td>
                                                );
                                            })}

                                            <td></td> {/* Remarks */}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="grand-total-row">
                            <td className="category-cell" style={{ fontWeight: 'bold' }}>GRAND TOTAL</td>
                            
                            {/* OPENING BALANCE */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.opening;
                                return <td key={`gt-op-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            {/* RECEIVED */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.inward;
                                return <td key={`gt-in-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            {/* TRANSFER */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.outward;
                                return <td key={`gt-out-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            {/* CLOSING BALANCE */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.closing;
                                return <td key={`gt-cl-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            {/* SALE */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.sale;
                                return <td key={`gt-sale-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            {/* RATE (Empty) */}
                            {sizes.map((size) => (
                                <td key={`gt-rate-${size.id}`} className="data-cell"></td>
                            ))}

                            {/* AMOUNT */}
                            {sizes.map((size) => {
                                const v = grandTotals[size.code]?.amount;
                                return <td key={`gt-amt-${size.id}`} className="data-cell" style={{ fontWeight: 'bold' }}>{v !== 0 ? v : ''}</td>;
                            })}

                            <td></td> {/* Remarks */}
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            {/* Footer Section */}
            <div className="dsr-footer-section">
                {/* Block 1: CATEGORY WISE SALE */}
                <div className="dsr-footer-block">
                    <div style={{flex: 1}}>
                        <table className="dsr-footer-table" style={{borderBottom: 'none'}}>
                            <thead>
                                <tr>
                                    <th colSpan="2">CATEGORY WISE SALE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.filter(category => categoryTotals[category.code]).map((category) => (
                                    <tr key={category.id || category.code}>
                                        <td>{category.name}</td>
                                        <td className="amount-col">{categoryTotals[category.code] || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <table className="dsr-footer-table" style={{marginTop: '-1px'}}>
                        <tbody>
                            <tr>
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>TOTAL</td>
                                <td className="amount-col">{totalSaleAmount || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>


                {/* Block 2: OTHER SALE */}
                <div className="dsr-footer-block">
                    <div style={{flex: 1}}>
                        <table className="dsr-footer-table" style={{borderBottom: 'none'}}>
                            <thead>
                                <tr>
                                    <th colSpan="2">OTHER SALE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {saleLedgers.map((ledger) => (
                                    <tr key={ledger.id || ledger.code}>
                                        <td>{ledger.name}</td>
                                        <td className="amount-col">{saleTotals[ledger.code] || ''}</td>
                                    </tr>
                                ))}
                                {saleLedgers.length === 0 && (
                                    <>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <table className="dsr-footer-table" style={{marginTop: '-1px'}}>
                        <tbody>
                            <tr>
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>TOTAL</td>
                                <td className="amount-col">{totalOtherSale || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Block 3: SHOP EXPENSES */}
                <div className="dsr-footer-block">
                    <div style={{flex: 1}}>
                        <table className="dsr-footer-table" style={{borderBottom: 'none'}}>
                            <thead>
                                <tr>
                                    <th colSpan="2">SHOP EXPENSES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseLedgers.map((ledger) => (
                                    <tr key={ledger.id || ledger.code}>
                                        <td>{ledger.name}</td>
                                        <td className="amount-col">{expenseTotals[ledger.code] || ''}</td>
                                    </tr>
                                ))}
                                {/* Fill remaining space if needed or just leave dynamic */}
                                {expenseLedgers.length === 0 && (
                                    <>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <table className="dsr-footer-table" style={{marginTop: '-1px'}}>
                        <tbody>
                            <tr>
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>TOTAL</td>
                                <td className="amount-col">{totalExpense || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Block 4: COLLECTION DETAIL */}
                <div className="dsr-footer-block">
                    <div style={{flex: 1}}>
                        <table className="dsr-footer-table" style={{borderBottom: 'none'}}>
                            <thead>
                                <tr>
                                    <th colSpan="2">COLLECTION DETAIL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenderLedgers.map((ledger) => (
                                    <tr key={ledger.id || ledger.code}>
                                        <td>{ledger.name}</td>
                                        <td className="amount-col">{tenderTotals[ledger.code] || ''}</td>
                                    </tr>
                                ))}
                                {tenderLedgers.length === 0 && (
                                    <>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                        <tr><td>&nbsp;</td><td className="amount-col"></td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <table className="dsr-footer-table" style={{marginTop: '-1px'}}>
                        <tbody>
                            <tr>
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>TOTAL</td>
                                <td className="amount-col">{totalTender || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Block 5: CHECKING REPORT */}
                <div className="dsr-footer-block checking-report">
                    <table className="dsr-footer-table" style={{height: '100%'}}>
                        <thead>
                            <tr>
                                <th>CHECKING REPORT</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{height: '100%', verticalAlign: 'top'}}>
                                    {/* Large empty area */}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="dsr-actions" data-html2canvas-ignore="true">
                <button 
                    type="button" 
                    className="dsr-submit-btn" 
                    onClick={handlePrint} 
                    disabled={loading || dsrStatus !== 'SUBMITTED'}
                    style={{
                        marginRight: '10px', 
                        backgroundColor: (loading || dsrStatus !== 'SUBMITTED') ? '#ccc' : '#007bff', 
                        cursor: (loading || dsrStatus !== 'SUBMITTED') ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Loading...' : 'Print'}
                </button>
                {!isViewMode && (
                    <button 
                        type="button" 
                        className="dsr-submit-btn" 
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            backgroundColor: loading ? '#ccc' : '',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Loading...' : 'Submit'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailySaleReport;
