import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ClosingStockReport.css';

const StoreReportsDashboard = () => {
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [activeTab, setActiveTab] = useState('stock');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.userName) {
          setStore(null);
          setLoading(false);
          return;
        }
        const res = await axios.get(`/api/stores/by-user/${encodeURIComponent(user.userName)}`);
        if (res.data?.success && Array.isArray(res.data.stores) && res.data.stores.length > 0) {
          setStore(res.data.stores[0]);
        } else {
          setStore(null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const storeCode = store?.storeCode || '';

  const go = (path) => {
    if (!storeCode) return;
    navigate(`${path}?storeCode=${encodeURIComponent(storeCode)}&lockedStore=true&back=${encodeURIComponent('/store-reports')}`);
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="report-container">
      <div className="report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>Store Reports {store?.storeName ? `- ${store.storeName}` : ''}</h1>
      </div>

      <div className="filters-section">
        <button className="search-btn" type="button" onClick={() => setActiveTab('stock')} disabled={activeTab === 'stock'}>
          Stock
        </button>
        <button className="search-btn" type="button" onClick={() => setActiveTab('transfers')} disabled={activeTab === 'transfers'}>
          Transfers
        </button>
      </div>

      {activeTab === 'stock' && (
        <div className="filters-section">
          <button className="export-btn" type="button" onClick={() => go('/stock-ledger-report')} disabled={!storeCode}>
            Stock Ledger
          </button>
          <button className="export-btn" type="button" onClick={() => go('/closing-stock-store-wise')} disabled={!storeCode}>
            Closing Stock
          </button>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="filters-section">
          <button className="export-btn" type="button" onClick={() => go('/stock-transfer-summary-report')} disabled={!storeCode}>
            Stock Transfer Summary
          </button>
          <button className="export-btn" type="button" onClick={() => go('/stock-transfer-detail-report')} disabled={!storeCode}>
            Stock Transfer Detail
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreReportsDashboard;

