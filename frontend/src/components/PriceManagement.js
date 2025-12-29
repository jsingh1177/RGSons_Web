import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PriceManagement.css';

const PriceManagement = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [prices, setPrices] = useState({}); // { sizeCode: { purchasePrice: '', mrp: '' } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [importErrors, setImportErrors] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const [itemsRes, sizesRes] = await Promise.all([
        axios.get('/api/items', config),
        axios.get('/api/sizes/active', config)
      ]);

      if (itemsRes.data.success) {
        setItems(itemsRes.data.items || []);
      }
      setSizes(sizesRes.data || []);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to load data. Please try again.');
      }
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleItemChange = async (e) => {
    const code = e.target.value;
    setSelectedItemCode(code);
    
    if (!code) {
      setSelectedItemName('');
      setPrices({});
      return;
    }

    const item = items.find(i => i.itemCode === code);
    setSelectedItemName(item ? item.itemName : '');

    // Fetch existing prices for this item
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prices/item/${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const existingPrices = {};
        response.data.prices.forEach(p => {
          existingPrices[p.sizeCode] = {
            purchasePrice: p.purchasePrice,
            mrp: p.mrp
          };
        });
        setPrices(existingPrices);
      }
    } catch (err) {
      console.error("Error fetching prices", err);
    }
  };

  const handlePriceChange = (sizeCode, field, value) => {
    setPrices(prev => ({
      ...prev,
      [sizeCode]: {
        ...prev[sizeCode],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedItemCode) {
      setError('Please select an item first');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    const pricesToSave = [];
    sizes.forEach(size => {
      const priceData = prices[size.code];
      // Only save if at least one price is entered
      if (priceData && (priceData.purchasePrice || priceData.mrp)) {
        pricesToSave.push({
          itemCode: selectedItemCode,
          itemName: selectedItemName,
          sizeCode: size.code,
          sizeName: size.name,
          purchasePrice: priceData.purchasePrice ? parseFloat(priceData.purchasePrice) : null,
          mrp: priceData.mrp ? parseFloat(priceData.mrp) : null
        });
      }
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/prices/save-all', pricesToSave, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccessMessage('Prices saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to save prices');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving prices');
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => {
    document.getElementById('excelImport').click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    setError('');
    setSuccessMessage('');
    setImportErrors([]);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/prices/import', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        if (response.data.errors && response.data.errors.length > 0) {
            setImportErrors(response.data.errors);
        }
        
        // Refresh data if item is selected
        if (selectedItemCode) {
          handleItemChange({ target: { value: selectedItemCode } });
        }
      } else {
        setError(response.data.message || 'Failed to import prices');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error importing prices');
    } finally {
      setSaving(false);
      // Reset file input
      e.target.value = null;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="price-management-container">
      <div className="price-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Price Management</h1>
        </div>
        <div className="header-buttons">
          <input
            type="file"
            id="excelImport"
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className="add-btn" onClick={handleImportClick}>
            Import Excel
          </button>
        </div>
      </div>

      <div className="price-content">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        {importErrors.length > 0 && (
            <div className="error-message" style={{textAlign: 'left', maxHeight: '200px', overflowY: 'auto'}}>
                <strong>Import Issues:</strong>
                <ul style={{margin: '10px 0 0 20px', padding: 0}}>
                    {importErrors.map((err, index) => <li key={index}>{err}</li>)}
                </ul>
            </div>
        )}

        <div className="item-selection">
          <label htmlFor="itemSelect">Select Item:</label>
          <select 
            id="itemSelect" 
            value={selectedItemCode} 
            onChange={handleItemChange}
            className="item-select"
          >
            <option value="">-- Select an Item --</option>
            {items.map(item => (
              <option key={item.id} value={item.itemCode}>
                {item.itemName} ({item.itemCode})
              </option>
            ))}
          </select>
        </div>

        {selectedItemCode && (
          <div className="sizes-container">
            <div className="sizes-scroll-container">
              {sizes.length === 0 ? (
                <div className="no-sizes">No active sizes found. Please add sizes in Size Management.</div>
              ) : (
                sizes.map(size => (
                  <div key={size.id} className="size-card">
                    <div className="size-header">{size.name}</div>
                    <div className="price-inputs">
                      <div className="input-group">
                        <label>Purchase Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={prices[size.code]?.purchasePrice || ''}
                          onChange={(e) => handlePriceChange(size.code, 'purchasePrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="input-group">
                        <label>MRP</label>
                        <input
                          type="number"
                          step="0.01"
                          value={prices[size.code]?.mrp || ''}
                          onChange={(e) => handlePriceChange(size.code, 'mrp', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {selectedItemCode && sizes.length > 0 && (
          <div className="action-buttons">
            <button 
              className="save-button" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Prices'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceManagement;
