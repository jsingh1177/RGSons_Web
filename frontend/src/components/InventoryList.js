import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import './InventoryList.css';

const InventoryList = () => {
  const navigate = useNavigate();
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

  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/inventory/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading Excel:', err);
      Swal.fire('Error', 'Failed to download Excel file', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/inventory/import', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        let msg = `Imported successfully! Saved: ${response.data.savedCount}`;
        if (response.data.errors && response.data.errors.length > 0) {
            msg += `. Errors: ${response.data.errors.join('\n')}`;
            Swal.fire('Warning', msg, 'warning');
        } else {
            Swal.fire('Success', msg, 'success');
        }
        // Refresh data if item selected
        if (selectedItemCode && selectedLocation) {
            fetchInventory(selectedItemCode, selectedLocation);
        }
      } else {
        Swal.fire('Error', response.data.message || 'Import failed', 'error');
      }
    } catch (err) {
      console.error('Error uploading Excel:', err);
      Swal.fire('Error', 'Failed to upload Excel file', 'error');
    } finally {
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
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

      const [sizesRes, storesRes] = await Promise.all([
        axios.get('/api/sizes/active', config),
        axios.get('/api/stores', config)
      ]);
      
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
      const storeList = (storesRes.data.stores || [])
        .filter(store => store.status === true && store.storeName !== 'Head Office');
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
        
        // Find store name for the selected location code to handle legacy data mismatch
        const selectedStore = locations.find(l => l.storeCode === locationCode);
        const selectedStoreName = selectedStore ? selectedStore.storeName : '';

        // Filter by location (Handle Code match OR Name match for all stores)
        // This resolves issues where inventory was saved with Store Name instead of Store Code
        const filteredInventory = response.data.inventory.filter(inv => 
          inv.storeCode === locationCode || 
          (selectedStoreName && inv.storeCode === selectedStoreName) ||
          (locationCode === 'HO' && inv.storeCode === 'Head Office') || // Explicit fallback for HO
          (locationCode === 'Head Office' && inv.storeCode === 'HO')
        );
        
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
  }, [locations]);

  useEffect(() => {
    fetchInventory(selectedItemCode, selectedLocation);
  }, [selectedItemCode, selectedLocation, fetchInventory]);

  const onSearchChange = (e) => {
     const value = e.target.value;
     setSearchInput(value);
     setSelectedItemCode('');
     setSelectedItemName('');
     setInventoryData({});
     setFocusedSuggestionIndex(-1);

     if (debounceTimeoutRef.current) {
         clearTimeout(debounceTimeoutRef.current);
     }

     if (abortControllerRef.current) {
         abortControllerRef.current.abort();
     }

     if (value.length > 1) {
         debounceTimeoutRef.current = setTimeout(async () => {
             abortControllerRef.current = new AbortController();
             try {
                 const token = localStorage.getItem('token');
                 const response = await axios.get(`/api/items/search?query=${value}`, {
                      headers: { 'Authorization': `Bearer ${token}` },
                      signal: abortControllerRef.current.signal
                 });
                 if (response.data.success) {
                     setSearchResults(response.data.items || []);
                     setShowSuggestions(true);
                 }
             } catch (error) {
                 if (axios.isCancel(error)) return;
                 console.error("Search error", error);
             }
         }, 300);
     } else {
         setSearchResults([]);
         setShowSuggestions(false);
     }
  };

  const handleSelectSuggestion = (item) => {
    setSelectedItemCode(item.itemCode);
    setSelectedItemName(item.itemName);
    setSearchInput(item.itemName);
    setShowSuggestions(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (showSuggestions && focusedSuggestionIndex >= 0) {
            handleSelectSuggestion(searchResults[focusedSuggestionIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => prev < searchResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    }
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
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
          />
          <button
            className="save-btn"
            onClick={handleDownload}
            style={{ backgroundColor: '#10B981', backgroundImage: 'none' }}
          >
            Download Excel
          </button>
          <button
            className="save-btn"
            onClick={() => fileInputRef.current.click()}
            style={{ backgroundColor: '#3B82F6', backgroundImage: 'none' }}
            disabled={saving}
          >
            Upload Excel
          </button>
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
        {isUploading && (
            <div className="progress-overlay">
                <div className="progress-container">
                    <div 
                        className="progress-bar" 
                        style={{ width: `${uploadProgress}%` }}
                    ></div>
                </div>
                <div className="progress-text">
                    {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing... Please wait'}
                </div>
            </div>
        )}
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

        <div className="item-selection relative" style={{ marginBottom: '20px' }}>
          <label htmlFor="itemSearch" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Select Item</label>
          <div className="relative w-full max-w-md" style={{ position: 'relative' }}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 10 }}>
                <Search size={18} />
            </div>
            <input
                ref={searchInputRef}
                id="itemSearch"
                type="text"
                value={searchInput}
                onChange={onSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Item..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ 
                    width: '100%', 
                    paddingLeft: '35px', 
                    paddingRight: '1rem', 
                    paddingTop: '0.5rem', 
                    paddingBottom: '0.5rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem',
                    outline: 'none'
                }}
                autoComplete="off"
            />
            {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                     style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        maxHeight: '15rem',
                        overflowY: 'auto'
                     }}
                >
                    {searchResults.map((item, index) => (
                        <div
                            key={item.itemCode}
                            onClick={() => handleSelectSuggestion(item)}
                            className={`px-4 py-2 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center hover:bg-gray-50 ${
                                index === focusedSuggestionIndex ? 'bg-blue-50' : ''
                            }`}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f9fafb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: index === focusedSuggestionIndex ? '#eff6ff' : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                if (index !== focusedSuggestionIndex) e.currentTarget.style.backgroundColor = '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                                if (index !== focusedSuggestionIndex) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="font-medium text-gray-800" style={{ fontWeight: 500, color: '#1f2937' }}>{item.itemName}</span>
                                <span className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.itemCode}</span>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded" style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                                {item.category}
                            </span>
                        </div>
                    ))}
                </div>
            )}
          </div>
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
