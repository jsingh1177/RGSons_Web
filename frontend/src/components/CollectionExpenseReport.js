import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './CollectionExpenseReport.css';

const CollectionExpenseReport = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [zone, setZone] = useState('');
    const [district, setDistrict] = useState('');
    const [reportData, setReportData] = useState([]);
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState({ tenders: [], expenses: [], sales: [] });

    useEffect(() => {
        // Set default dates (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        
        fetchZones();
        fetchDistricts();
        fetchColumns();
    }, []);

    const fetchColumns = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/columns', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setColumns(response.data);
            }
        } catch (error) {
            console.error('Error fetching columns:', error);
        }
    };

    const fetchZones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/zones', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setZones(response.data);
            } else {
                setZones([]);
            }
        } catch (error) {
            console.error('Error fetching zones:', error);
            setZones([]);
        }
    };

    const fetchDistricts = async (selectedZone = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/districts', {
                params: { zone: selectedZone },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(response.data)) {
                setDistricts(response.data);
            } else {
                setDistricts([]);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
            setDistricts([]);
        }
    };

    const handleZoneChange = (e) => {
        const selectedZone = e.target.value;
        setZone(selectedZone);
        setDistrict(''); // Reset district when zone changes
        fetchDistricts(selectedZone);
    };

    const fetchReportData = async () => {
        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Please select both start and end dates'
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense', {
                params: { startDate, endDate, zone, district },
                headers: { Authorization: `Bearer ${token}` }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch report data'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Please select both start and end dates'
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/reports/collection-expense/export', {
                params: { startDate, endDate, zone, district },
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Check if response is actually JSON (error)
            if (response.data.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorData.message || 'Failed to download report'
                        });
                    } catch (e) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to download report'
                        });
                    }
                };
                reader.readAsText(response.data);
                return;
            }

            // Create filename: CnEXpReport_<storecode>_<datetime>
            // Attempt to get store code from user details in localStorage, default to "HO"
            let storeCode = 'HO';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user && user.storeCode) {
                        storeCode = user.storeCode;
                    }
                }
            } catch (e) {
                console.warn('Could not parse user info for filename', e);
            }

            const now = new Date();
            // Format: YYYYMMDD_HHmmss
            const dateStr = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');
                
            const filename = `CnEXpReport_${storeCode}_${dateStr}.xlsx`;

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Error downloading report:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to download report'
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    };

    // Calculate totals dynamically
    const calculateTotal = (key, type) => {
        return reportData.reduce((sum, row) => {
            let map;
            if (type === 'tender') map = row.tenders;
            else if (type === 'expense') map = row.expenses;
            else if (type === 'sale') map = row.sales;
            else map = {};
            
            return sum + (map[key] || 0);
        }, 0);
    };

    const calculateRowTotal = (row, type) => {
        const cols = type === 'sale' ? columns.sales : (type === 'expense' ? columns.expenses : columns.tenders);
        if (!cols || !row) return 0;
        
        let map;
        if (type === 'sale') map = row.sales;
        else if (type === 'expense') map = row.expenses;
        else if (type === 'tender') map = row.tenders;
        
        if (!map) return 0;

        return cols.reduce((sum, col) => sum + (map[col] || 0), 0);
    };

    const calculateGroupTotal = (type) => {
        return reportData.reduce((sum, row) => sum + calculateRowTotal(row, type), 0);
    };

    const totalColumnsCount = 2 + 
        (columns.sales && columns.sales.length > 0 ? columns.sales.length + 1 : 0) + 
        (columns.expenses.length > 0 ? columns.expenses.length + 1 : 0) + 
        (columns.tenders.length > 0 ? columns.tenders.length + 1 : 0);

    return (
        <div className="collection-report-container">
            <div className="report-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate('/ho-dashboard')}>
                        ← Back
                    </button>
                    <h1>Collection & Expense Report</h1>
                </div>
            </div>

            <div className="filter-section">
                <div className="filter-group">
                    <label>Start Date</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                    />
                </div>
                <div className="filter-group">
                    <label>End Date</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                    />
                </div>
                <div className="filter-group">
                    <label>Zone</label>
                    <select value={zone} onChange={handleZoneChange}>
                        <option value="">All Zones</option>
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>District</label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <button 
                    className="search-btn" 
                    onClick={fetchReportData}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Search'}
                </button>
                <button 
                    className="search-btn" 
                    onClick={handleDownload}
                    style={{ marginLeft: '10px', backgroundColor: '#28a745' }}
                    disabled={loading}
                >
                    Download Excel
                </button>
            </div>

            <div className="table-container">
                <table className="report-table">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ width: '150px' }}>District</th>
                            <th rowSpan="2" style={{ width: '200px' }}>Store Name</th>
                            {columns.sales && columns.sales.length > 0 && (
                                <th colSpan={columns.sales.length + 1} className="header-group">SALE</th>
                            )}
                            {columns.expenses.length > 0 && (
                                <th colSpan={columns.expenses.length + 1} className="header-group">EXPENSES</th>
                            )}
                            {columns.tenders.length > 0 && (
                                <th colSpan={columns.tenders.length + 1} className="header-group">TENDER</th>
                            )}
                        </tr>
                        <tr>
                            {columns.sales && columns.sales.length > 0 && (
                                <>
                                    {columns.sales.map(col => (
                                        <th key={`head-sale-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                            {columns.expenses.length > 0 && (
                                <>
                                    {columns.expenses.map(col => (
                                        <th key={`head-expense-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                            {columns.tenders.length > 0 && (
                                <>
                                    {columns.tenders.map(col => (
                                        <th key={`head-tender-${col}`} className="header-group">{col.toUpperCase()}</th>
                                    ))}
                                    <th className="header-group total-header">TOTAL</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.length > 0 ? (
                            <>
                                {reportData.map((row, index) => (
                                    <tr key={index}>
                                        <td>{row.district}</td>
                                        <td>{row.storeName}</td>
                                        {columns.sales && columns.sales.length > 0 && (
                                            <>
                                                {columns.sales.map(col => (
                                                    <td key={`cell-sale-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.sales ? row.sales[col] : 0)}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'sale'))}
                                                </td>
                                            </>
                                        )}
                                        {columns.expenses.length > 0 && (
                                            <>
                                                {columns.expenses.map(col => (
                                                    <td key={`cell-expense-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.expenses[col])}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'expense'))}
                                                </td>
                                            </>
                                        )}
                                        {columns.tenders.length > 0 && (
                                            <>
                                                {columns.tenders.map(col => (
                                                    <td key={`cell-tender-${index}-${col}`} className="amount-cell">
                                                        {formatCurrency(row.tenders[col])}
                                                    </td>
                                                ))}
                                                <td className="amount-cell total-cell">
                                                    {formatCurrency(calculateRowTotal(row, 'tender'))}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                <tr className="total-row">
                                    <td colSpan="2" style={{ textAlign: 'right' }}>Total:</td>
                                    {columns.sales && columns.sales.length > 0 && (
                                        <>
                                            {columns.sales.map(col => (
                                                <td key={`total-sale-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'sale'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('sale'))}
                                            </td>
                                        </>
                                    )}
                                    {columns.expenses.length > 0 && (
                                        <>
                                            {columns.expenses.map(col => (
                                                <td key={`total-expense-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'expense'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('expense'))}
                                            </td>
                                        </>
                                    )}
                                    {columns.tenders.length > 0 && (
                                        <>
                                            {columns.tenders.map(col => (
                                                <td key={`total-tender-${col}`} className="amount-cell">
                                                    {formatCurrency(calculateTotal(col, 'tender'))}
                                                </td>
                                            ))}
                                            <td className="amount-cell total-cell">
                                                {formatCurrency(calculateGroupTotal('tender'))}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <td colSpan={totalColumnsCount} className="no-data">
                                    {loading ? 'Loading report data...' : 'No data found for selected criteria'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="report-footer-notes">
                 <p>* SALE columns show sale amounts (Dynamically loaded from Ledgers).</p>
                 <p>* EXPENSE columns show deducted amounts (Dynamically loaded from Ledgers).</p>
                 <p>* TENDER columns show collection amounts (Dynamically loaded from Ledgers).</p>
            </div>
        </div>
    );
};

export default CollectionExpenseReport;
