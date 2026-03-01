import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ClosingStockReport.css';

const ClosingStockReport = () => {
    const navigate = useNavigate();
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [stores, setStores] = useState([]);
    const [filters, setFilters] = useState({
        zone: '',
        district: '',
        storeCode: '',
        valuationMethod: 'Purchase', // Default per requirement
        viewType: 'QtyValue', // Options: Qty, Value, QtyValue
        date: new Date().toISOString().slice(0, 10)
    });
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState([]);
    const [detailedData, setDetailedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchZones();
        fetchStores();
    }, []);

    useEffect(() => {
        fetchDistricts(filters.zone);
    }, [filters.zone]);

    const fetchZones = async () => {
        try {
            const response = await axios.get('/api/reports/closing-stock/zones');
            if (response.data) {
                 setZones(response.data);
            }
        } catch (err) {
            console.error("Error fetching zones", err);
        }
    };

    const fetchDistricts = async (zone) => {
        try {
            const response = await axios.get(`/api/reports/closing-stock/districts?zone=${zone || ''}`);
            if (response.data) {
                setDistricts(response.data);
            }
        } catch (err) {
            console.error("Error fetching districts", err);
        }
    };

    const fetchStores = async () => {
        try {
            const response = await axios.get('/api/stores');
            if (response.data && response.data.success) {
                setStores(response.data.stores);
            }
        } catch (err) {
            console.error("Error fetching stores", err);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setData([]);
        setDetailedData(null);
        
        try {
            if (filters.storeCode) {
                // Detailed Report
                const response = await axios.get('/api/reports/closing-stock/detailed', { 
                    params: { 
                        storeCode: filters.storeCode,
                        valuationMethod: filters.valuationMethod
                    } 
                });
                setDetailedData(response.data);
            } else {
                // Matrix Report
                const [colsRes, dataRes] = await Promise.all([
                    axios.get('/api/reports/closing-stock/columns', { params: filters }),
                    axios.get('/api/reports/closing-stock', { params: filters })
                ]);
                setColumns(colsRes.data);
                setData(dataRes.data);
            }
        } catch (err) {
            setError('Failed to fetch report data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await axios.get('/api/reports/closing-stock/export', {
                params: filters,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ClosingStockReport_${new Date().toISOString().slice(0,10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Export failed", err);
            alert("Export failed");
        }
    };

    const calculateGrandTotalQty = (col) => {
        return data.reduce((sum, row) => sum + (row.categoryQuantities[col] || 0), 0);
    };

    const calculateGrandTotalAmount = (col) => {
        return data.reduce((sum, row) => sum + (row.categoryAmounts[col] || 0), 0);
    };
    
    const calculateTotalQty = () => {
        return data.reduce((sum, row) => sum + row.totalQty, 0);
    }
    
    const calculateTotalAmount = () => {
        return data.reduce((sum, row) => sum + row.totalAmount, 0);
    }

    return (
        <div className="report-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate('/ho-dashboard')}>
                    ← Back
                </button>
                <h1>Closing Stock - District Wise</h1>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <label>As on Date:</label>
                    <input 
                        type="date" 
                        value={filters.date}
                        onChange={(e) => setFilters({...filters, date: e.target.value})}
                    />
                </div>

                <div className="filter-group">
                    <label>Zone:</label>
                    <select 
                        value={filters.zone} 
                        onChange={(e) => setFilters({...filters, zone: e.target.value, district: ''})}
                        disabled={!!filters.storeCode}
                    >
                        <option value="">All Zones</option>
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>District:</label>
                    <select 
                        value={filters.district} 
                        onChange={(e) => setFilters({...filters, district: e.target.value})}
                        disabled={!!filters.storeCode || !filters.zone}
                    >
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
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
                        <option value="Qty">Quantity Only</option>
                        <option value="Value">Value Only</option>
                        <option value="QtyValue">Quantity With Value</option>
                    </select>
                </div>

                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                </button>
                
                <button className="export-btn" onClick={handleExport} disabled={(!data.length && !detailedData)}>
                    Export to Excel
                </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="table-container">
                {detailedData ? (
                    <div className="detailed-report">
                        <div className="report-title-section" style={{marginBottom: '15px'}}>
                            <h2 style={{fontSize: '18px', fontWeight: 'bold'}}>Store: {detailedData.storeName}</h2>
                            <h3 style={{fontSize: '16px'}}>District: {detailedData.district} | Date: {filters.date}</h3>
                        </div>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Size</th>
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="text-right">Qty</th>}
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="text-right">Rate</th>}
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="text-right">Amount</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {detailedData.categories.map((catGroup, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="category-header-row">
                                            <td colSpan={5} className="font-bold bg-gray-100" style={{backgroundColor: '#f0f0f0', fontWeight: 'bold'}}>{catGroup.categoryName}</td>
                                        </tr>
                                        {catGroup.items.map((item, iIdx) => (
                                            <tr key={`${idx}-${iIdx}`}>
                                                <td>{item.itemName}</td>
                                                <td>{item.sizeName}</td>
                                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">{item.qty}</td>
                                                }
                                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">{item.rate?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                                }
                                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                    <td className="text-right">{item.amount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                                }
                                            </tr>
                                        ))}
                                        <tr className="category-subtotal-row" style={{fontWeight: 'bold', borderTop: '2px solid #ddd'}}>
                                            <td colSpan={2} className="text-right">Subtotal {catGroup.categoryName}:</td>
                                            {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">{catGroup.totalQty}</td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right"></td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">{catGroup.totalAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                            }
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{fontSize: '16px', fontWeight: 'bold', borderTop: '3px solid #000'}}>
                                    <td colSpan={2} className="text-right">GRAND TOTAL</td>
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right">{detailedData.grandTotalQty}</td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right"></td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right">{detailedData.grandTotalAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    }
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th rowSpan={2}>District</th>
                                <th rowSpan={2}>Store Name</th>
                                {columns.map(col => <th key={col} colSpan={filters.viewType === 'QtyValue' ? 2 : 1} className="text-center">{col}</th>)}
                                <th colSpan={filters.viewType === 'QtyValue' ? 2 : 1} className="text-center">Total</th>
                            </tr>
                            <tr>
                                {columns.map(col => (
                                    <React.Fragment key={col}>
                                        {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="sub-header">Qty</th>}
                                        {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="sub-header">Amt</th>}
                                    </React.Fragment>
                                ))}
                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && <th className="sub-header">Qty</th>}
                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && <th className="sub-header">Amt</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.district}</td>
                                    <td>{row.storeName}</td>
                                    {columns.map(col => (
                                        <React.Fragment key={col}>
                                            {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">
                                                    {(row.categoryQuantities[col] || 0)}
                                                </td>
                                            }
                                            {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                                <td className="text-right">
                                                    {(row.categoryAmounts[col] || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                                </td>
                                            }
                                        </React.Fragment>
                                    ))}
                                    {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right font-bold">
                                            {row.totalQty}
                                        </td>
                                    }
                                    {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                        <td className="text-right font-bold">
                                            {row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                    }
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="text-right font-bold">GRAND TOTAL</td>
                                {columns.map(col => (
                                    <React.Fragment key={col}>
                                        {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                            <td className="text-right font-bold">
                                                {calculateGrandTotalQty(col)}
                                            </td>
                                        }
                                        {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                            <td className="text-right font-bold">
                                                {calculateGrandTotalAmount(col).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                            </td>
                                        }
                                    </React.Fragment>
                                ))}
                                {(filters.viewType === 'Qty' || filters.viewType === 'QtyValue') && 
                                    <td className="text-right font-bold">
                                        {calculateTotalQty()}
                                    </td>
                                }
                                {(filters.viewType === 'Value' || filters.viewType === 'QtyValue') && 
                                    <td className="text-right font-bold">
                                        {calculateTotalAmount().toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                    </td>
                                }
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ClosingStockReport;
