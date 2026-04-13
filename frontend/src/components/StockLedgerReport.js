import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import './ClosingStockReport.css';

const StockLedgerReport = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [storeCode, setStoreCode] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [asOnDate, setAsOnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const asOnDateRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toDdMmYyyy = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  const openAsOnDatePicker = () => {
    const el = asOnDateRef.current;
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

  const selectedStockItem = useMemo(() => {
    if (!selectedItemCode) return null;
    const found = stockItems.find(s => s.itemCode === selectedItemCode);
    return found ? { ...found } : { itemCode: selectedItemCode, itemName: '' };
  }, [selectedItemCode, stockItems]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [storesRes, categoriesRes] = await Promise.all([
          axios.get('/api/stores'),
          axios.get('/api/categories')
        ]);

        if (storesRes.data?.success) {
          setStores(storesRes.data.stores || []);
        }
        if (categoriesRes.data?.success) {
          setCategories(categoriesRes.data.categories || []);
        }
      } catch (e) {
        setError('Failed to load dropdowns');
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setStockItems([]);
      setSelectedItemCode('');
      setAsOnDate(new Date().toISOString().split('T')[0]);
      setRows([]);
      setError('');

      if (!storeCode) return;

      try {
        const res = await axios.get('/api/reports/stock-ledger/items', {
          params: { storeCode, categoryCode }
        });
        setStockItems(res.data || []);
      } catch (e) {
        setError('Failed to load stock items');
      }
    };
    fetchItems();
  }, [storeCode, categoryCode]);

  useEffect(() => {
    const fetchLedger = async () => {
      setRows([]);
      setError('');

      if (!storeCode || !selectedStockItem?.itemCode || !asOnDate) return;

      setLoading(true);
      try {
        const res = await axios.get('/api/reports/stock-ledger', {
          params: {
            storeCode,
            itemCode: selectedStockItem.itemCode,
            asOnDate
          }
        });
        setRows(res.data || []);
      } catch (e) {
        setError('Failed to load stock ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [storeCode, selectedStockItem, asOnDate]);

  const handleDownload = async () => {
    if (!storeCode || !selectedStockItem?.itemCode || !asOnDate) return;
    try {
      const response = await axios.get('/api/reports/stock-ledger/export', {
        params: {
          storeCode,
          itemCode: selectedStockItem.itemCode,
          asOnDate
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StockLedger_${storeCode}_${selectedStockItem.itemCode}_${asOnDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Excel download failed');
    }
  };

  return (
    <div className="report-container">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate('/ho-reports')}>
          Back to Reports
        </button>
        <h1>Stock Ledger</h1>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>Store:</label>
          <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)}>
            <option value="">Select Store</option>
            {stores.map(s => (
              <option key={s.storeCode} value={s.storeCode}>
                {s.storeCode} - {s.storeName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} disabled={!storeCode}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Stock Item:</label>
          <select
            value={selectedItemCode}
            onChange={(e) => setSelectedItemCode(e.target.value)}
            disabled={!storeCode}
          >
            <option value="">Select Item</option>
            {stockItems.map(si => (
              <option key={si.itemCode} value={si.itemCode}>
                {si.itemName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Date:</label>
          <div className="date-picker-wrapper">
            <Calendar className="date-picker-icon" size={18} />
            <button
              type="button"
              className="date-picker-button"
              onClick={openAsOnDatePicker}
              disabled={!storeCode || !selectedItemCode}
            >
              {toDdMmYyyy(asOnDate)}
            </button>
            <input
              ref={asOnDateRef}
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              disabled={!storeCode || !selectedItemCode}
              className="date-picker-native"
            />
          </div>
        </div>

        <button className="export-btn" onClick={handleDownload} disabled={!rows.length}>
          Excel Download
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div style={{ padding: '10px', color: '#444' }}>Loading...</div>}

      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Size</th>
              <th>Opening</th>
              <th>Purchase</th>
              <th>Inward</th>
              <th>Outward</th>
              <th>Sale</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '12px' }}>
                  {storeCode && selectedItemCode ? 'No data found' : 'Select Store and Stock Item'}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.date}</td>
                  <td>{r.description}</td>
                  <td>{r.referenceNo || ''}</td>
                  <td style={{ textAlign: 'right' }}>{r.openingQty || 0}</td>
                  <td style={{ textAlign: 'right' }}>{r.purchaseQty || 0}</td>
                  <td style={{ textAlign: 'right' }}>{r.inwardQty || 0}</td>
                  <td style={{ textAlign: 'right' }}>{r.outwardQty || 0}</td>
                  <td style={{ textAlign: 'right' }}>{r.saleQty || 0}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.balanceQty || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockLedgerReport;
