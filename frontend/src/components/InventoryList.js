import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './InventoryList.css';

const InventoryList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  // inventoryData: { sizeCode: { opening: '', inward: '', outward: '', closing: '' } }
  const [inventoryData, setInventoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

      const [itemsRes, sizesRes, storesRes] = await Promise.all([
        axios.get('/api/items', config),
        axios.get('/api/sizes/active', config),
        axios.get('/api/stores', config)
      ]);

      if (itemsRes.data.success) {
        setItems(itemsRes.data.items || []);
      }
      
      const sortedSizes = (sizesRes.data || []).sort((a, b) => {
        const orderA = (a.shortOrder && a.shortOrder > 0) ? a.shortOrder : Number.MAX_SAFE_INTEGER;
        const orderB = (b.shortOrder && b.shortOrder > 0) ? b.shortOrder : Number.MAX_SAFE_INTEGER;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
      
      setSizes(sortedSizes);

      // Process stores and add HO
      const storeList = (storesRes.data.stores || []).filter(store => store.status === true);
      const allLocations = [
        { storeCode: 'HO', storeName: 'Head Office' },
        ...storeList
      ];
      setLocations(allLocations);
      
      // Set default location to HO or first available
      if (!selectedLocation && allLocations.length > 0) {
        setSelectedLocation(allLocations[0].storeCode);
      }

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
  }, [navigate, selectedLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchInventory = useCallback(async (itemCode, locationCode) => {
    if (!itemCode || !locationCode) {
      setInventoryData({});
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/inventory/item/${itemCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const existingInventory = {};
        // Filter by location
        const filteredInventory = response.data.inventory.filter(inv => inv.storeCode === locationCode);
        
        filteredInventory.forEach(inv => {
          existingInventory[inv.sizeCode] = {
            opening: inv.opening,
            inward: inv.inward,
            outward: inv.outward,
            closing: inv.closing
          };
        });
        setInventoryData(existingInventory);
      }
    } catch (err) {
      console.error("Error fetching inventory", err);
    }
  }, []);

  useEffect(() => {
    fetchInventory(selectedItemCode, selectedLocation);
  }, [selectedItemCode, selectedLocation, fetchInventory]);

  const handleItemChange = (e) => {
    const code = e.target.value;
    setSelectedItemCode(code);
    
    if (!code) {
      setSelectedItemName('');
      return;
    }

    const item = items.find(i => i.itemCode === code);
    setSelectedItemName(item ? item.itemName : '');
  };

  const handleInventoryChange = (sizeCode, field, value) => {
    setInventoryData(prev => {
      const currentSizeData = prev[sizeCode] || { inward: 0, outward: 0 };
      const newValue = value === '' ? '' : parseInt(value) || 0;
      
      let newData = {
        ...currentSizeData,
        [field]: newValue
      };
      
      // Recalculate closing if opening changes
      if (field === 'opening') {
        const previousOpening = currentSizeData.opening || 0;
        const newOpening = newValue === '' ? 0 : newValue;
        const currentClosing = currentSizeData.closing || 0;
        
        newData.closing = currentClosing - previousOpening + newOpening;
      }

      return {
        ...prev,
        [sizeCode]: newData
      };
    });
  };

  const handleSave = async () => {
    if (!selectedItemCode) {
      setError('Please select an item first');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    const inventoryToSave = [];
    sizes.forEach(size => {
      const data = inventoryData[size.code];
      // Only save if data exists
      if (data) {
        inventoryToSave.push({
          storeCode: selectedLocation,
          itemCode: selectedItemCode,
          itemName: selectedItemName,
          sizeCode: size.code,
          sizeName: size.name,
          businessDate: selectedDate,
          opening: data.opening !== '' && data.opening !== undefined ? parseInt(data.opening) : null,
          inward: data.inward || 0,
          outward: data.outward || 0,
          closing: data.closing || 0
        });
      }
    });

    if (inventoryToSave.length === 0) {
      setError('No inventory data entered to save');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/inventory/save-all', inventoryToSave, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccessMessage('Inventory saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to save inventory');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving inventory');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (['USER', 'STORE USER'].includes(user.role)) {
      navigate('/store-dashboard');
    } else {
      navigate('/ho-dashboard');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="inventory-list-container">
      <div className="inventory-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Opening Inventory</h1>
        </div>
        <div className="header-buttons">
          <button 
            className="save-btn" 
            onClick={handleSave} 
            disabled={saving || !selectedItemCode}
          >
            {saving ? 'Saving...' : 'Save Inventory'}
          </button>
        </div>
      </div>

      <div className="inventory-content">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="location-select">Location</label>
            <select
              id="location-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="filter-select"
            >
              <option value="">-- Select Location --</option>
              {locations.map(loc => (
                <option key={loc.storeCode} value={loc.storeCode}>
                  {loc.storeName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="date-select">Date</label>
            <input
              type="date"
              id="date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="item-selection">
          <label htmlFor="item-select">Select Item</label>
          <select 
            id="item-select" 
            className="item-select"
            value={selectedItemCode}
            onChange={handleItemChange}
          >
            <option value="">-- Select an Item --</option>
            {items.map(item => (
              <option key={item.itemCode} value={item.itemCode}>
                {item.itemName} ({item.itemCode})
              </option>
            ))}
          </select>
        </div>

        {selectedItemCode ? (
          <div className="sizes-container">
            <div className="sizes-scroll-container">
              {sizes.map(size => {
                const data = inventoryData[size.code] || {};
                return (
                  <div key={size.code} className="size-card">
                    <div className="size-header">{size.name}</div>
                    <div className="inventory-inputs">
                      <div className="input-group">
                        <label>Opening Stock</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={data.opening !== undefined ? data.opening : ''}
                          onChange={(e) => handleInventoryChange(size.code, 'opening', e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>Closing Stock</label>
                        <input 
                          type="number" 
                          value={data.closing !== undefined ? data.closing : (data.opening || 0)}
                          disabled
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Please select an item to manage its inventory</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryList;
