import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ClosingStockReport.css';

const ClosingStockReport = () => {
    const navigate = useNavigate();
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [filters, setFilters] = useState({
        zone: '',
        district: '',
        valuationMethod: 'MRP' // Default
    });
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchZones();
    }, []);

    useEffect(() => {
        if (filters.zone) {
            fetchDistricts(filters.zone);
        } else {
            setDistricts([]);
        }
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

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            const [colsRes, dataRes] = await Promise.all([
                axios.get('/api/reports/closing-stock/columns', { params: filters }),
                axios.get('/api/reports/closing-stock', { params: filters })
            ]);
            setColumns(colsRes.data);
            setData(dataRes.data);
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
                <h1>Closing Stock Report</h1>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <label>Zone:</label>
                    <select 
                        value={filters.zone} 
                        onChange={(e) => setFilters({...filters, zone: e.target.value, district: ''})}
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
                        disabled={!filters.zone}
                    >
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Valuation Method:</label>
                    <select 
                        value={filters.valuationMethod} 
                        onChange={(e) => setFilters({...filters, valuationMethod: e.target.value})}
                    >
                        <option value="Purchase">Purchase Price</option>
                        <option value="Sale">Sale Price</option>
                        <option value="MRP">MRP</option>
                    </select>
                </div>

                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                </button>
                
                <button className="export-btn" onClick={handleExport} disabled={data.length === 0}>
                    Export to Excel
                </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="table-container">
                <table className="report-table">
                    <thead>
                        <tr>
                            <th rowSpan={2}>District</th>
                            <th rowSpan={2}>Store Name</th>
                            {columns.map(col => <th key={col} colSpan={2} className="text-center">{col}</th>)}
                            <th colSpan={2} className="text-center">Total</th>
                        </tr>
                        <tr>
                            {columns.map(col => (
                                <React.Fragment key={col}>
                                    <th className="sub-header">Qty</th>
                                    <th className="sub-header">Amt</th>
                                </React.Fragment>
                            ))}
                            <th className="sub-header">Qty</th>
                            <th className="sub-header">Amt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                <td>{row.district}</td>
                                <td>{row.storeName}</td>
                                {columns.map(col => (
                                    <React.Fragment key={col}>
                                        <td className="text-right">
                                            {(row.categoryQuantities[col] || 0)}
                                        </td>
                                        <td className="text-right">
                                            {(row.categoryAmounts[col] || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                    </React.Fragment>
                                ))}
                                <td className="text-right font-bold">
                                    {row.totalQty}
                                </td>
                                <td className="text-right font-bold">
                                    {row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="text-right font-bold">GRAND TOTAL</td>
                            {columns.map(col => (
                                <React.Fragment key={col}>
                                    <td className="text-right font-bold">
                                        {calculateGrandTotalQty(col)}
                                    </td>
                                    <td className="text-right font-bold">
                                        {calculateGrandTotalAmount(col).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                    </td>
                                </React.Fragment>
                            ))}
                            <td className="text-right font-bold">
                                {calculateTotalQty()}
                            </td>
                            <td className="text-right font-bold">
                                {calculateTotalAmount().toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default ClosingStockReport;
