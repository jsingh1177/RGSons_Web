import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download } from 'lucide-react';
import './ClosingStockReport.css';

const CLOSING_STOCK_REPORT_STATE_KEY = 'closingStockReportState:v1';

const loadClosingStockReportState = () => {
    try {
        const raw = sessionStorage.getItem(CLOSING_STOCK_REPORT_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const saveClosingStockReportState = (state) => {
    try {
        sessionStorage.setItem(CLOSING_STOCK_REPORT_STATE_KEY, JSON.stringify(state));
    } catch {}
};

const getDefaultFilters = () => ({
    zone: '',
    district: '',
    storeCode: '',
    viewType: 'QtyValue',
    date: new Date().toISOString().slice(0, 10)
});

const ClosingStockReport = () => {
    const navigate = useNavigate();
    const tableContainerRef = useRef(null);
    const dateRef = useRef(null);
    const restoredStateRef = useRef(null);
    const autoRefreshDoneRef = useRef(false);
    const searchActionRef = useRef(null);
    const exportActionRef = useRef(null);
    const autoSearchOnFilterChangeInitRef = useRef(false);
    if (restoredStateRef.current === null) {
        restoredStateRef.current = loadClosingStockReportState();
    }
    const [zones, setZones] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [stores, setStores] = useState([]);
    const [filters, setFilters] = useState(() => {
        const storedFilters = restoredStateRef.current?.filters;
        if (!storedFilters) return getDefaultFilters();
        return { ...getDefaultFilters(), ...storedFilters };
    });
    const filtersRef = useRef(filters);
    const [columns, setColumns] = useState(() => restoredStateRef.current?.columns || []);
    const [data, setData] = useState(() => restoredStateRef.current?.data || []);
    const [detailedData, setDetailedData] = useState(() => restoredStateRef.current?.detailedData || null);
    const [didSearch, setDidSearch] = useState(() => restoredStateRef.current?.didSearch || false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => {
        fetchZones();
        fetchStores();
    }, []);

    useEffect(() => {
        fetchDistricts(filters.zone);
    }, [filters.zone]);

    useEffect(() => {
        saveClosingStockReportState({
            filters,
            columns,
            data,
            detailedData,
            didSearch
        });
    }, [filters, columns, data, detailedData, didSearch]);

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

    const handleSearch = useCallback(async () => {
        setDidSearch(true);
        setLoading(true);
        setError('');
        setData([]);
        setDetailedData(null);
        
        try {
            const activeFilters = filtersRef.current;
            if (activeFilters.storeCode) {
                // Detailed Report
                const response = await axios.get('/api/reports/closing-stock/detailed', { 
                    params: { 
                        storeCode: activeFilters.storeCode,
                        date: activeFilters.date
                    } 
                });
                setDetailedData(response.data);
            } else {
                // Matrix Report
                const [colsRes, dataRes] = await Promise.all([
                    axios.get('/api/reports/closing-stock/columns', { params: activeFilters }),
                    axios.get('/api/reports/closing-stock', { params: activeFilters })
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
    }, []);
    searchActionRef.current = handleSearch;

    useEffect(() => {
        if (autoRefreshDoneRef.current) return;
        if (!restoredStateRef.current?.didSearch) return;
        autoRefreshDoneRef.current = true;
        handleSearch();
    }, [handleSearch]);

    useEffect(() => {
        if (!filters?.date) return;
        if (!autoSearchOnFilterChangeInitRef.current) {
            autoSearchOnFilterChangeInitRef.current = true;
            return;
        }
        searchActionRef.current?.();
    }, [filters?.storeCode, filters?.date]);

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
    exportActionRef.current = handleExport;

    useEffect(() => {
        const onKeyDown = (e) => {
            if (!e.altKey) return;
            const k = String(e.key || '').toLowerCase();
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
            if (k === 's') {
                e.preventDefault();
                searchActionRef.current?.();
                return;
            }
            if (k === 'p') {
                e.preventDefault();
                exportActionRef.current?.();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

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

    const toDdMmYyyy = (iso) => {
        if (!iso) return '';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return String(iso);
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const openDatePicker = () => {
        const el = dateRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') {
            try {
                el.showPicker();
                return;
            } catch {}
        }
        try {
            el.focus();
            el.click();
        } catch {}
    };

    const matrixSelectableRowKeys = useMemo(() => {
        return (data || []).map((row, idx) => {
            const district = String(row?.district || '').trim();
            const store = String(row?.storeName || '').trim();
            return `m:${district}:${store}:${idx}`;
        });
    }, [data]);

    const detailedSelectableRowKeys = useMemo(() => {
        if (!detailedData?.categories) return [];
        const keys = [];
        detailedData.categories.forEach((cat, catIdx) => {
            (cat.items || []).forEach((item, itemIdx) => {
                keys.push(`d:${catIdx}:${itemIdx}`);
            });
        });
        return keys;
    }, [detailedData]);

    const selectableRowKeys = detailedData ? detailedSelectableRowKeys : matrixSelectableRowKeys;

    const selectableRowIndexByKey = useMemo(() => {
        const map = new Map();
        selectableRowKeys.forEach((k, idx) => map.set(k, idx));
        return map;
    }, [selectableRowKeys]);

    const detailedColCount = useMemo(() => {
        const qtyCols = filters.viewType === 'Qty' || filters.viewType === 'QtyValue' ? 1 : 0;
        const valueCols = filters.viewType === 'Value' || filters.viewType === 'QtyValue' ? 2 : 0;
        return 2 + qtyCols + valueCols;
    }, [filters.viewType]);

    useEffect(() => {
        setSelectedRowKeys(new Set());
        setFocusedRowIndex(selectableRowKeys.length > 0 ? 0 : -1);
    }, [selectableRowKeys]);

    useEffect(() => {
        const el = tableContainerRef.current;
        if (!el) return;
        if (focusedRowIndex < 0 || focusedRowIndex >= selectableRowKeys.length) return;
        const rowKey = selectableRowKeys[focusedRowIndex];
        const tr = el.querySelector(`tr[data-row-key="${rowKey}"]`);
        if (tr && typeof tr.scrollIntoView === 'function') {
            try {
                tr.scrollIntoView({ block: 'nearest' });
            } catch {}
        }
    }, [focusedRowIndex, selectableRowKeys]);

    const toggleSelectedRow = (rowKey) => {
        if (!rowKey) return;
        setSelectedRowKeys(prev => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const handleReportTableKeyDown = (e) => {
        const el = tableContainerRef.current;
        if (!el) return;

        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            el.scrollLeft -= 80;
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            el.scrollLeft += 80;
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectableRowKeys.length === 0) return;
            setFocusedRowIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectableRowKeys.length === 0) return;
            setFocusedRowIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1);
                return next;
            });
            return;
        }
        if (e.key === ' ') {
            e.preventDefault();
            if (selectableRowKeys.length === 0) return;
            const idx = focusedRowIndex;
            if (idx < 0 || idx >= selectableRowKeys.length) return;
            toggleSelectedRow(selectableRowKeys[idx]);
        }
    };
    
    return (
        <div className="report-container stock-ledger-container closing-stock-district-wise-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Closing Stock - District Wise</h1>
                <div className="stock-ledger-header-actions">
                    <div className="stock-ledger-header-date-inline">
                        <span className="stock-ledger-header-date-caption">As on Date</span>
                        <div className="date-picker-wrapper stock-ledger-header-date">
                            <Calendar className="date-picker-icon" size={18} />
                            <button
                                type="button"
                                className="date-picker-button"
                                onClick={openDatePicker}
                                disabled={loading}
                            >
                                {filters.date ? toDdMmYyyy(filters.date) : ''}
                            </button>
                            <input
                                ref={dateRef}
                                type="date"
                                className="date-picker-native"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <button
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleExport}
                        disabled={loading || (!data.length && !detailedData)}
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </header>

            <div className="filters-section">

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
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div
                ref={tableContainerRef}
                className="table-container"
                tabIndex={0}
                onKeyDown={handleReportTableKeyDown}
                onClick={() => tableContainerRef.current?.focus()}
            >
                {detailedData ? (
                    <div className="detailed-report">
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
                                        <tr className="category-header">
                                            <td colSpan={detailedColCount} className="font-bold">{catGroup.categoryName}</td>
                                        </tr>
                                        {catGroup.items.map((item, iIdx) => (
                                            <tr
                                                key={`${idx}-${iIdx}`}
                                                data-row-key={`d:${idx}:${iIdx}`}
                                                className={[
                                                    selectedRowKeys.has(`d:${idx}:${iIdx}`) ? 'row-selected' : '',
                                                    focusedRowIndex === selectableRowIndexByKey.get(`d:${idx}:${iIdx}`) ? 'row-focused' : ''
                                                ].filter(Boolean).join(' ')}
                                                onMouseDown={() => {
                                                    const next = selectableRowIndexByKey.get(`d:${idx}:${iIdx}`);
                                                    if (next === undefined) return;
                                                    setFocusedRowIndex(next);
                                                }}
                                                onClick={() => toggleSelectedRow(`d:${idx}:${iIdx}`)}
                                            >
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
                                        <tr className="category-subtotal">
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
                                <tr className="grand-total">
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
                                <tr
                                    key={idx}
                                    data-row-key={`m:${String(row?.district || '').trim()}:${String(row?.storeName || '').trim()}:${idx}`}
                                    className={[
                                        selectedRowKeys.has(`m:${String(row?.district || '').trim()}:${String(row?.storeName || '').trim()}:${idx}`) ? 'row-selected' : '',
                                        focusedRowIndex === selectableRowIndexByKey.get(`m:${String(row?.district || '').trim()}:${String(row?.storeName || '').trim()}:${idx}`) ? 'row-focused' : ''
                                    ].filter(Boolean).join(' ')}
                                    onMouseDown={() => {
                                        const key = `m:${String(row?.district || '').trim()}:${String(row?.storeName || '').trim()}:${idx}`;
                                        const next = selectableRowIndexByKey.get(key);
                                        if (next === undefined) return;
                                        setFocusedRowIndex(next);
                                    }}
                                    onClick={() => toggleSelectedRow(`m:${String(row?.district || '').trim()}:${String(row?.storeName || '').trim()}:${idx}`)}
                                >
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
