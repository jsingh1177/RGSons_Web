import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './ClosingStockStoreWise.css';

const ClosingStockStoreWise = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        storeCode: '',
        valuationMethod: 'Purchase', // Default
        viewType: 'QtyValue' // Default: Quantity with Value
    });
    const [reportData, setReportData] = useState(null);
    const [dynamicSizes, setDynamicSizes] = useState([]);

    useEffect(() => {
        console.log('ClosingStockStoreWise loaded - Version 2');
        fetchStores();
    }, []);

    useEffect(() => {
        if (filters.storeCode) {
            fetchReportData();
        } else {
            setReportData(null);
            setDynamicSizes([]);
        }
    }, [filters.storeCode, filters.valuationMethod]);

    const fetchStores = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/stores', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.success) {
                setStores(response.data.stores);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/closing-stock/detailed', {
                params: {
                    storeCode: filters.storeCode,
                    valuationMethod: filters.valuationMethod
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
            processReportData(data);
            setReportData(data);
        } catch (error) {
            console.error('Error fetching report:', error);
            Swal.fire('Error', 'Failed to fetch report data', 'error');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (data) => {
        if (!data || !data.categories) {
            setDynamicSizes([]);
            return;
        }

        // Use sorted sizes from backend if available
        if (data.sortedSizes && data.sortedSizes.length > 0) {
            setDynamicSizes(data.sortedSizes);
            return;
        }

        // Extract all unique sizes from all items across all categories
        // Use Set to maintain insertion order if the API returns items in a consistent order (which it does: size order)
        const sizesSet = new Set();
        data.categories.forEach(cat => {
            cat.items.forEach(item => {
                if (item.sizeName) sizesSet.add(item.sizeName);
            });
        });

        const sizes = Array.from(sizesSet);
        setDynamicSizes(sizes);
    };

    const getSelectedStoreName = () => {
        const store = stores.find(s => s.storeCode === filters.storeCode);
        return store ? store.storeName : '';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    };

    // Helper to group items by name within a category
    const groupItemsByName = (items) => {
        const groups = {};
        items.forEach(item => {
            if (!groups[item.itemName]) {
                groups[item.itemName] = {};
            }
            groups[item.itemName][item.sizeName] = item;
        });
        return groups;
    };

    // Calculation helpers
    const showQty = filters.viewType === 'Qty' || filters.viewType === 'QtyValue';
    const showValue = filters.viewType === 'Value' || filters.viewType === 'QtyValue';
    const colSpanPerSize = (showQty ? 1 : 0) + (showValue ? 1 : 0);

    const getCategorySizeTotal = (items, sizeName) => {
        let totalQty = 0;
        let totalAmt = 0;
        items.forEach(item => {
            if (item.sizeName === sizeName) {
                totalQty += item.qty;
                totalAmt += item.amount;
            }
        });
        return { qty: totalQty, amount: totalAmt };
    };

    const getGrandSizeTotal = (categories, sizeName) => {
        let totalQty = 0;
        let totalAmt = 0;
        if (!categories) return { qty: 0, amount: 0 };
        categories.forEach(cat => {
             cat.items.forEach(item => {
                if (item.sizeName === sizeName) {
                    totalQty += item.qty;
                    totalAmt += item.amount;
                }
             });
        });
        return { qty: totalQty, amount: totalAmt };
    };

    const handleExport = async () => {
        if (!filters.storeCode) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/closing-stock/export', {
                params: {
                    storeCode: filters.storeCode,
                    valuationMethod: filters.valuationMethod
                },
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const storeName = getSelectedStoreName().replace(/[^a-zA-Z0-9]/g, '_');
            link.setAttribute('download', `ClosingStock_${storeName}_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            Swal.fire('Error', 'Failed to export report', 'error');
        }
    };

    return (
        <div className="closing-stock-store-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate('/ho-dashboard')}>
                    ← Back
                </button>
                <h1>
                    Closing Stock: {getSelectedStoreName() || 'Select Store'} As on : {reportData ? formatDate(reportData.reportDate) : formatDate(new Date())}
                </h1>
                <button 
                    className="export-btn" 
                    onClick={handleExport} 
                    disabled={!filters.storeCode || loading}
                >
                    Excel Export
                </button>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <label>Store Name:</label>
                    <select 
                        value={filters.storeCode} 
                        onChange={(e) => setFilters({...filters, storeCode: e.target.value})}
                    >
                        <option value="">Select Store</option>
                        {stores.map(store => (
                            <option key={store.storeCode} value={store.storeCode}>
                                {store.storeName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Calculation Method:</label>
                    <select 
                        value={filters.valuationMethod} 
                        onChange={(e) => setFilters({...filters, valuationMethod: e.target.value})}
                    >
                        <option value="Purchase">Purchase Price</option>
                        <option value="Sale">Sale Price</option>
                        <option value="MRP">MRP</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Select View:</label>
                    <select 
                        value={filters.viewType} 
                        onChange={(e) => setFilters({...filters, viewType: e.target.value})}
                    >
                        <option value="QtyValue">Quantity with Value</option>
                        <option value="Qty">Quantity Only</option>
                        <option value="Value">Value Only</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="report-loading-container-unique">Loading report data...</div>
            ) : !filters.storeCode ? (
                <div className="report-loading-container-unique">Select a store to view the report.</div>
            ) : reportData && reportData.categories ? (
                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="left-align">Item Name & Size</th>
                                {dynamicSizes.map(size => (
                                    <th key={size} colSpan={colSpanPerSize}>{size}</th>
                                ))}
                                <th colSpan={colSpanPerSize}>Total</th>
                            </tr>
                            <tr>
                                {dynamicSizes.map(size => (
                                    <React.Fragment key={size}>
                                        {showQty && <th>Qty</th>}
                                        {showValue && <th>Amount</th>}
                                    </React.Fragment>
                                ))}
                                {showQty && <th>Qty</th>}
                                {showValue && <th>Amount</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.categories.map((category, catIndex) => {
                                const itemGroups = groupItemsByName(category.items);
                                return (
                                    <React.Fragment key={catIndex}>
                                        {/* Category Header */}
                                        <tr className="category-header">
                                            <td colSpan={1 + (dynamicSizes.length * colSpanPerSize) + colSpanPerSize}>
                                                {category.categoryName}
                                            </td>
                                        </tr>
                                        
                                        {/* Items */}
                                        {Object.entries(itemGroups).map(([itemName, sizeMap]) => {
                                            // Calculate row total
                                            let rowTotalQty = 0;
                                            let rowTotalAmt = 0;
                                            dynamicSizes.forEach(size => {
                                                const item = sizeMap[size];
                                                if (item) {
                                                    rowTotalQty += item.qty;
                                                    rowTotalAmt += item.amount;
                                                }
                                            });

                                            return (
                                                <tr key={itemName}>
                                                    <td className="item-name">{itemName}</td>
                                                    {dynamicSizes.map(size => {
                                                        const item = sizeMap[size];
                                                        return (
                                                            <React.Fragment key={size}>
                                                                {showQty && <td>{item ? item.qty : ''}</td>}
                                                                {showValue && <td>{item ? item.amount.toFixed(2) : ''}</td>}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {showQty && <td>{rowTotalQty}</td>}
                                                    {showValue && <td>{rowTotalAmt.toFixed(2)}</td>}
                                                </tr>
                                            );
                                        })}

                                        {/* Category Subtotal */}
                                        <tr className="category-subtotal">
                                            <td className="left-align">{category.categoryName} Total</td>
                                            {dynamicSizes.map(size => {
                                                const total = getCategorySizeTotal(category.items, size);
                                                return (
                                                    <React.Fragment key={size}>
                                                        {showQty && <td>{total.qty}</td>}
                                                        {showValue && <td>{total.amount.toFixed(2)}</td>}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {showQty && <td>{category.totalQty}</td>}
                                            {showValue && <td>{category.totalAmount.toFixed(2)}</td>}
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* Grand Total */}
                            <tr className="grand-total">
                                <td className="left-align">Grand Total</td>
                                {dynamicSizes.map(size => {
                                    const total = getGrandSizeTotal(reportData.categories, size);
                                    return (
                                        <React.Fragment key={size}>
                                            {showQty && <td>{total.qty}</td>}
                                            {showValue && <td>{total.amount.toFixed(2)}</td>}
                                        </React.Fragment>
                                    );
                                })}
                                {showQty && <td>{reportData.grandTotalQty}</td>}
                                {showValue && <td>{reportData.grandTotalAmount.toFixed(2)}</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="report-loading-container-unique">No data found.</div>
            )}
        </div>
    );
};

export default ClosingStockStoreWise;
