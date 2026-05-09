import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Download, X } from 'lucide-react';
import './ClosingStockReport.css';
import './PurchaseSummaryReport.css';

const PurchaseSummaryReport = () => {
    const navigate = useNavigate();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [district, setDistrict] = useState('');
    const [storeCode, setStoreCode] = useState('');
    const [partyCode, setPartyCode] = useState('');

    const [districts, setDistricts] = useState([]);
    const [stores, setStores] = useState([]);
    const [parties, setParties] = useState([]);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const tableContainerRef = useRef(null);
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
    const [voucherModalOpen, setVoucherModalOpen] = useState(false);
    const [voucherModalHref, setVoucherModalHref] = useState('');
    const [voucherModalTitle, setVoucherModalTitle] = useState('');
    const [districtSearchInput, setDistrictSearchInput] = useState('');
    const [districtSearchResults, setDistrictSearchResults] = useState([]);
    const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
    const [focusedDistrictSuggestionIndex, setFocusedDistrictSuggestionIndex] = useState(-1);
    const [partySearchInput, setPartySearchInput] = useState('');
    const [partySearchResults, setPartySearchResults] = useState([]);
    const [showPartySuggestions, setShowPartySuggestions] = useState(false);
    const [focusedPartySuggestionIndex, setFocusedPartySuggestionIndex] = useState(-1);
    const [storeSearchInput, setStoreSearchInput] = useState('');
    const [storeSearchResults, setStoreSearchResults] = useState([]);
    const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
    const [focusedStoreSuggestionIndex, setFocusedStoreSuggestionIndex] = useState(-1);
    const districtSearchWrapRef = useRef(null);
    const partySearchWrapRef = useRef(null);
    const storeSearchWrapRef = useRef(null);

    useEffect(() => {
        const toIsoLocalDate = (d) => {
            if (!d) return '';
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(toIsoLocalDate(firstDay));
        setEndDate(toIsoLocalDate(today));
    }, []);

    const toDdMmYyyy = (iso) => {
        if (!iso) return '';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return String(iso);
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const openStartDatePicker = () => {
        const el = startDateRef.current;
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

    const openEndDatePicker = () => {
        const el = endDateRef.current;
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

        const fetchParties = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/parties', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.success) {
                    const all = Array.isArray(res.data.parties) ? res.data.parties : [];
                    const filtered = all.filter(p => {
                        const t = String(p?.type || '').toLowerCase();
                        return !t || t === 'supplier' || t === 'vendor';
                    });
                    setParties(filtered);
                } else if (Array.isArray(res.data)) {
                    setParties(res.data);
                } else {
                    setParties([]);
                }
            } catch (e) {
                setParties([]);
            }
        };

        fetchDistricts();
        fetchStores();
        fetchParties();
    }, []);

    useEffect(() => {
        setDistrictSearchInput(district || '');
    }, [district]);

    const filterDistrictsForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(districts) ? districts : [];
        if (!v) return all.slice(0, 50);
        return all.filter(d => String(d || '').toLowerCase().includes(v)).slice(0, 50);
    };

    const handleDistrictInputChange = (e) => {
        const value = e.target.value;
        setDistrictSearchInput(value);
        if (district) setDistrict('');
        if (storeCode) setStoreCode('');
        if (storeSearchInput) setStoreSearchInput('');
        if (!value) {
            setDistrictSearchResults([]);
            setShowDistrictSuggestions(false);
            setFocusedDistrictSuggestionIndex(-1);
            return;
        }
        const results = filterDistrictsForSearch(value);
        setDistrictSearchResults(results);
        setShowDistrictSuggestions(true);
        setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
    };

    const handleSelectDistrict = (value) => {
        setDistrict(value || '');
        setDistrictSearchInput(value || '');
        setDistrictSearchResults([]);
        setShowDistrictSuggestions(false);
        setFocusedDistrictSuggestionIndex(-1);
    };

    const handleDistrictKeyDown = (e) => {
        if (!showDistrictSuggestions || districtSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedDistrictSuggestionIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, districtSearchResults.length - 1);
                return next;
            });
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedDistrictSuggestionIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const idx = focusedDistrictSuggestionIndex;
            if (idx >= 0 && idx < districtSearchResults.length) {
                handleSelectDistrict(districtSearchResults[idx]);
            }
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowDistrictSuggestions(false);
            setFocusedDistrictSuggestionIndex(-1);
        }
    };

    const filterStoresForSearch = (value) => {
        const v = (value || '').trim().toLowerCase();
        const all = Array.isArray(stores) ? stores : [];
        const districtFiltered = district ? all.filter(s => String(s?.district || '').trim() === district) : all;
        if (!v) return districtFiltered.slice(0, 50);
        const filtered = districtFiltered.filter(s => {
            const name = String(s?.storeName || '').toLowerCase();
            const code = String(s?.storeCode || '').toLowerCase();
            return name.includes(v) || code.includes(v);
        });
        return filtered.slice(0, 50);
    };

    const filterPartiesForSearch = (value) => {
        const v = String(value || '').trim().toLowerCase();
        const all = Array.isArray(parties) ? parties : [];
        if (!v) return all.slice(0, 50);
        return all.filter(p => {
            const name = String(p?.name || '').toLowerCase();
            const code = String(p?.code || '').toLowerCase();
            return name.includes(v) || code.includes(v);
        }).slice(0, 50);
    };

    const handlePartyInputChange = (e) => {
        const value = e.target.value;
        setPartySearchInput(value);
        if (partyCode) setPartyCode('');
        if (!value) {
            setPartySearchResults([]);
            setShowPartySuggestions(false);
            setFocusedPartySuggestionIndex(-1);
            return;
        }
        const results = filterPartiesForSearch(value);
        setPartySearchResults(results);
        setShowPartySuggestions(true);
        setFocusedPartySuggestionIndex(results.length ? 0 : -1);
    };

    const handleSelectParty = (party) => {
        if (!party?.code) return;
        setPartyCode(String(party.code));
        setPartySearchInput(`${party.name} (${party.code})`);
        setPartySearchResults([]);
        setShowPartySuggestions(false);
        setFocusedPartySuggestionIndex(-1);
    };

    const handlePartyKeyDown = (e) => {
        if (!showPartySuggestions || partySearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedPartySuggestionIndex((prev) => (prev < 0 ? 0 : Math.min(prev + 1, partySearchResults.length - 1)));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedPartySuggestionIndex((prev) => (prev <= 0 ? 0 : prev - 1));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const idx = focusedPartySuggestionIndex;
            if (idx >= 0 && idx < partySearchResults.length) handleSelectParty(partySearchResults[idx]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowPartySuggestions(false);
            setFocusedPartySuggestionIndex(-1);
        }
    };

    const handleStoreInputChange = (e) => {
        const value = e.target.value;
        setStoreSearchInput(value);
        if (storeCode) setStoreCode('');
        if (!value) {
            setStoreSearchResults([]);
            setShowStoreSuggestions(false);
            setFocusedStoreSuggestionIndex(-1);
            return;
        }
        const results = filterStoresForSearch(value);
        setStoreSearchResults(results);
        setShowStoreSuggestions(true);
        setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
    };

    const handleSelectStore = (store) => {
        if (!store?.storeCode) return;
        setStoreCode(store.storeCode);
        setStoreSearchInput(`${store.storeName} (${store.storeCode})`);
        setStoreSearchResults([]);
        setShowStoreSuggestions(false);
        setFocusedStoreSuggestionIndex(-1);
    };

    const handleStoreKeyDown = (e) => {
        if (!showStoreSuggestions || storeSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => {
                const next = prev < 0 ? 0 : Math.min(prev + 1, storeSearchResults.length - 1);
                return next;
            });
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedStoreSuggestionIndex((prev) => {
                const next = prev <= 0 ? 0 : prev - 1;
                return next;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const idx = focusedStoreSuggestionIndex;
            if (idx >= 0 && idx < storeSearchResults.length) {
                handleSelectStore(storeSearchResults[idx]);
            }
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowStoreSuggestions(false);
            setFocusedStoreSuggestionIndex(-1);
        }
    };

    useEffect(() => {
        const onDocMouseDown = (e) => {
            const t = e.target;
            if (districtSearchWrapRef.current && !districtSearchWrapRef.current.contains(t)) {
                setShowDistrictSuggestions(false);
                setFocusedDistrictSuggestionIndex(-1);
            }
            if (partySearchWrapRef.current && !partySearchWrapRef.current.contains(t)) {
                setShowPartySuggestions(false);
                setFocusedPartySuggestionIndex(-1);
            }
            if (storeSearchWrapRef.current && !storeSearchWrapRef.current.contains(t)) {
                setShowStoreSuggestions(false);
                setFocusedStoreSuggestionIndex(-1);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    const formatAmount = (value) => {
        const n = Number(value || 0);
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const totals = useMemo(() => {
        return (data || []).reduce(
            (acc, row) => {
                acc.totalQuantity += Number(row?.totalQuantity || 0);
                acc.amount += Number(row?.amount || 0);
                return acc;
            },
            { totalQuantity: 0, amount: 0 }
        );
    }, [data]);

    const selectableRowKeys = useMemo(() => {
        return (data || []).map((row, idx) => {
            const storeCodeValue = String(row?.storeCode || '').trim();
            const billValue = String(row?.billNumber || row?.invoiceNo || '').trim();
            return `ps:${storeCodeValue}:${billValue}:${idx}`;
        });
    }, [data]);

    const selectableRowIndexByKey = useMemo(() => {
        const map = new Map();
        selectableRowKeys.forEach((k, idx) => map.set(k, idx));
        return map;
    }, [selectableRowKeys]);

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
            setFocusedRowIndex(prev => (prev <= 0 ? 0 : prev - 1));
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectableRowKeys.length === 0) return;
            setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1)));
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

    const openVoucherModal = (href, title) => {
        if (!href) return;
        setVoucherModalHref(href);
        setVoucherModalTitle(title || 'Purchase Voucher');
        setVoucherModalOpen(true);
    };

    const closeVoucherModal = () => {
        setVoucherModalOpen(false);
        setVoucherModalHref('');
        setVoucherModalTitle('');
    };

    useEffect(() => {
        if (!voucherModalOpen) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            closeVoucherModal();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [voucherModalOpen]);

    useEffect(() => {
        if (!voucherModalOpen) return;
        const onMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== 'RG_CLOSE_VOUCHER_MODAL') return;
            closeVoucherModal();
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [voucherModalOpen]);

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
                storeCode: storeCode || undefined,
                partyCode: partyCode || undefined
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
                storeCode: storeCode || undefined,
                partyCode: partyCode || undefined
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

    return (
        <div className="report-container stock-ledger-container stock-ledger-report purchase-summary-container">
            <header className="report-header">
                <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
                <h1 className="stock-ledger-title">Purchase Summary</h1>
                <div className="stock-ledger-header-actions">
                    <button
                        type="button"
                        className="export-btn stock-ledger-export-btn"
                        onClick={handleExport}
                        disabled={loading || !startDate || !endDate}
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <label>From Date</label>
                    <div className="date-picker-wrapper">
                        <Calendar className="date-picker-icon" size={18} />
                        <button type="button" className="date-picker-button" onClick={openStartDatePicker} disabled={loading}>
                            {startDate ? toDdMmYyyy(startDate) : ''}
                        </button>
                        <input
                            ref={startDateRef}
                            type="date"
                            className="date-picker-native"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>To Date</label>
                    <div className="date-picker-wrapper">
                        <Calendar className="date-picker-icon" size={18} />
                        <button type="button" className="date-picker-button" onClick={openEndDatePicker} disabled={loading}>
                            {endDate ? toDdMmYyyy(endDate) : ''}
                        </button>
                        <input
                            ref={endDateRef}
                            type="date"
                            className="date-picker-native"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>State</label>
                    <div ref={districtSearchWrapRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={districtSearchInput}
                            onChange={handleDistrictInputChange}
                            onKeyDown={handleDistrictKeyDown}
                            onFocus={() => {
                                const results = filterDistrictsForSearch(districtSearchInput);
                                setDistrictSearchResults(results);
                                setShowDistrictSuggestions(true);
                                setFocusedDistrictSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search..."
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showDistrictSuggestions && districtSearchResults.length > 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {districtSearchResults.map((d, idx) => (
                                    <div
                                        key={`${d}-${idx}`}
                                        onMouseDown={() => handleSelectDistrict(d)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedDistrictSuggestionIndex ? '#eff6ff' : '#fff'
                                        }}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Store</label>
                    <div ref={storeSearchWrapRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={storeSearchInput}
                            onChange={handleStoreInputChange}
                            onKeyDown={handleStoreKeyDown}
                            onFocus={() => {
                                const results = filterStoresForSearch(storeSearchInput);
                                setStoreSearchResults(results);
                                setShowStoreSuggestions(true);
                                setFocusedStoreSuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search store code or name..."
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showStoreSuggestions && storeSearchResults.length > 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {storeSearchResults.map((s, idx) => (
                                    <div
                                        key={`${s.storeCode}-${idx}`}
                                        onMouseDown={() => handleSelectStore(s)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedStoreSuggestionIndex ? '#eff6ff' : '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <span>{s.storeName}</span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                                            {s.storeCode}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Party</label>
                    <div ref={partySearchWrapRef} style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={partySearchInput}
                            onChange={handlePartyInputChange}
                            onKeyDown={handlePartyKeyDown}
                            onFocus={() => {
                                const results = filterPartiesForSearch(partySearchInput);
                                setPartySearchResults(results);
                                setShowPartySuggestions(true);
                                setFocusedPartySuggestionIndex(results.length ? 0 : -1);
                            }}
                            placeholder="Search party..."
                            disabled={loading}
                            autoComplete="off"
                        />
                        {showPartySuggestions && partySearchResults.length > 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    maxHeight: 220,
                                    overflowY: 'auto'
                                }}
                            >
                                {partySearchResults.map((p, idx) => (
                                    <div
                                        key={`${p.code}-${idx}`}
                                        onMouseDown={() => handleSelectParty(p)}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: idx === focusedPartySuggestionIndex ? '#eff6ff' : '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <span>{p.name}</span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12 }}>
                                            {p.code}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                </button>
            </div>

            <div
                ref={tableContainerRef}
                className="table-container"
                tabIndex={0}
                onKeyDown={handleReportTableKeyDown}
                onClick={() => tableContainerRef.current?.focus()}
            >
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Store Code</th>
                            <th>Store Name</th>
                            <th>Date</th>
                            <th>Bill Number</th>
                            <th>Party Invoice#</th>
                            <th>Supplier Name</th>
                            <th style={{ textAlign: 'right' }}>Total Quantity</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '12px' }}>
                                    {loading ? 'Loading report data...' : 'No data found for selected criteria'}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr
                                    key={`${row.billNumber || row.invoiceNo || idx}-${idx}`}
                                    data-row-key={`ps:${String(row?.storeCode || '').trim()}:${String(row?.billNumber || row?.invoiceNo || '').trim()}:${idx}`}
                                    className={[
                                        selectedRowKeys.has(`ps:${String(row?.storeCode || '').trim()}:${String(row?.billNumber || row?.invoiceNo || '').trim()}:${idx}`) ? 'row-selected' : '',
                                        focusedRowIndex === selectableRowIndexByKey.get(`ps:${String(row?.storeCode || '').trim()}:${String(row?.billNumber || row?.invoiceNo || '').trim()}:${idx}`) ? 'row-focused' : ''
                                    ].filter(Boolean).join(' ')}
                                    onMouseDown={() => {
                                        const key = `ps:${String(row?.storeCode || '').trim()}:${String(row?.billNumber || row?.invoiceNo || '').trim()}:${idx}`;
                                        const next = selectableRowIndexByKey.get(key);
                                        if (next === undefined) return;
                                        setFocusedRowIndex(next);
                                    }}
                                    onClick={() => toggleSelectedRow(`ps:${String(row?.storeCode || '').trim()}:${String(row?.billNumber || row?.invoiceNo || '').trim()}:${idx}`)}
                                >
                                    <td>{row.storeCode}</td>
                                    <td>{row.storeName}</td>
                                    <td>{row.date}</td>
                                    <td>
                                        {row.billNumber ? (
                                            <button
                                                type="button"
                                                className="qty-link"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const invoiceNo = String(row.billNumber || '').trim();
                                                    const sc = String(row?.storeCode || '').trim();
                                                    const href = sc
                                                        ? `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit&storeCode=${encodeURIComponent(sc)}&lockedStore=true`
                                                        : `/purchase-entry?invoiceNo=${encodeURIComponent(invoiceNo)}&mode=edit`;
                                                    openVoucherModal(href, invoiceNo ? `PURCHASE - ${invoiceNo}` : 'PURCHASE');
                                                }}
                                            >
                                                {row.billNumber}
                                            </button>
                                        ) : ('')}
                                    </td>
                                    <td>{row.partyInvoiceNo || ''}</td>
                                    <td>{row.supplierName}</td>
                                    <td style={{ textAlign: 'right' }}>{(row.totalQuantity || 0).toLocaleString('en-IN')}</td>
                                    <td style={{ textAlign: 'right' }}>{formatAmount(row.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {data.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan="6" style={{ fontWeight: 700 }}>TOTAL</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.totalQuantity.toLocaleString('en-IN')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(totals.amount)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {voucherModalOpen && voucherModalHref && (
                <div
                    className="voucher-modal-overlay"
                    onMouseDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        closeVoucherModal();
                    }}
                >
                    <div className="voucher-modal">
                        <div className="voucher-modal-header">
                            <div className="voucher-modal-title">{voucherModalTitle}</div>
                            <button type="button" className="voucher-modal-close" onClick={closeVoucherModal} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="voucher-modal-body">
                            <iframe title="Purchase Voucher" src={voucherModalHref} className="voucher-modal-iframe" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseSummaryReport;
