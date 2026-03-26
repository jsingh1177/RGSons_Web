import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './PurchaseSummaryReport.css';

const PurchaseSummaryReport = () => {
    const navigate = useNavigate();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [district, setDistrict] = useState('');
    const [storeCode, setStoreCode] = useState('');

    const [districts, setDistricts] = useState([]);
    const [stores, setStores] = useState([]);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/reports/purchase-summary/districts', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDistricts(res.data || []);
            } catch (e) {
                setDistricts([]);
            }
        };

        const fetchStores = async () => {
            try {
                const res = await axios.get('/api/stores');
                if (res.data && res.data.success) {
                    const sorted = (res.data.stores || []).slice().sort((a, b) => {
                        const nameA = `${a.storeCode || ''} ${a.storeName || ''}`.trim();
                        const nameB = `${b.storeCode || ''} ${b.storeName || ''}`.trim();
                        return nameA.localeCompare(nameB);
                    });
                    setStores(sorted);
                } else {
                    setStores([]);
                }
            } catch (e) {
                setStores([]);
            }
        };

        fetchDistricts();
        fetchStores();
    }, []);

    const availableStores = useMemo(() => {
        if (!district) return stores;
        return stores.filter(s => (s.district || '') === district);
    }, [district, stores]);

    const formatAmount = (value) => {
        const n = Number(value || 0);
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleSearch = async () => {
        if (!startDate || !endDate) {
            Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
            return;
        }

        setLoading(true);
        setData([]);
        try {
            const token = localStorage.getItem('token');
            const params = {
                startDate,
                endDate,
                district: district || undefined,
                storeCode: storeCode || undefined
            };
            const res = await axios.get('/api/reports/purchase-summary', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data || []);
        } catch (e) {
            Swal.fire('Error', 'Failed to fetch Purchase Summary Report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!startDate || !endDate) {
            Swal.fire('Warning', 'Please select both From Date and To Date', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const params = {
                startDate,
                endDate,
                district: district || undefined,
                storeCode: storeCode || undefined
            };

            const response = await axios.get('/api/reports/purchase-summary/export', {
                params,
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `PurchaseSummary_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            Swal.fire('Error', 'Failed to export report', 'error');
        }
    };

    const onDistrictChange = (value) => {
        setDistrict(value);
        if (value) {
            const storeOk = stores.some(s => s.storeCode === storeCode && (s.district || '') === value);
            if (!storeOk) setStoreCode('');
        }
    };

    return (
        <div className="psr-container">
            <div className="psr-header">
                <h2>Purchase Summary Report</h2>
                <div className="psr-header-actions">
                    <button className="psr-btn secondary" onClick={() => navigate('/ho-reports')}>
                        Back to Reports
                    </button>
                    <button className="psr-btn secondary" onClick={() => navigate('/ho-dashboard')}>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            <div className="psr-filters">
                <div className="psr-field">
                    <label>From Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="psr-field">
                    <label>To Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                <div className="psr-field">
                    <label>District</label>
                    <select value={district} onChange={(e) => onDistrictChange(e.target.value)}>
                        <option value="">All</option>
                        {districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <div className="psr-field">
                    <label>Store</label>
                    <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
                        <option value="">All</option>
                        {availableStores.map(s => (
                            <option key={s.id || s.storeCode} value={s.storeCode}>
                                {s.storeCode} - {s.storeName}
                            </option>
                        ))}
                    </select>
                </div>

                <button className="psr-btn primary" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                </button>

                <button className="psr-btn export" onClick={handleExport} disabled={loading}>
                    Export to Excel
                </button>
            </div>

            <div className="psr-table-wrap">
                <table className="psr-table">
                    <thead>
                        <tr>
                            <th>Store Code</th>
                            <th>Store name</th>
                            <th>Date</th>
                            <th>Bill Number</th>
                            <th>Supplier Name</th>
                            <th className="text-right">Total Quantity</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="psr-empty">
                                    {loading ? 'Loading report data...' : 'No data found for selected criteria'}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr key={`${row.billNumber || row.invoiceNo || idx}-${idx}`}>
                                    <td>{row.storeCode}</td>
                                    <td>{row.storeName}</td>
                                    <td>{row.date}</td>
                                    <td>{row.billNumber}</td>
                                    <td>{row.supplierName}</td>
                                    <td className="text-right">{(row.totalQuantity || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-right">{formatAmount(row.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseSummaryReport;
