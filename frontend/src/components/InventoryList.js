import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import './InventoryList.css';

const InventoryList = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [matrixSizes, setMatrixSizes] = useState([]);
  const [matrixRows, setMatrixRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = async () => {
    try {
      if (!selectedLocation) {
        Swal.fire('Warning', 'Please select Location', 'warning');
        return;
      }
      const token = localStorage.getItem('token');
      const url = `/api/opening-balance/export?storeCode=${encodeURIComponent(selectedLocation)}&tranDate=${encodeURIComponent(selectedDate)}&categoryCode=${encodeURIComponent(selectedCategory || '')}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const urlObj = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlObj;
      link.setAttribute('download', `opening_balance_${selectedLocation}_${selectedDate}.xlsx`);
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

    if (!selectedLocation) {
      Swal.fire('Warning', 'Please select Location', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/opening-balance/import?storeCode=${encodeURIComponent(selectedLocation)}&tranDate=${encodeURIComponent(selectedDate)}&categoryCode=${encodeURIComponent(selectedCategory || '')}`,
        formData,
        {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        let msg = `Imported successfully! Saved: ${response.data.savedCount}`;
        if (response.data.errors && response.data.errors.length > 0) {
            msg += `. Errors: ${response.data.errors.join('\n')}`;
            Swal.fire('Warning', msg, 'warning');
        } else {
            Swal.fire('Success', msg, 'success');
        }
        if (selectedLocation) {
          fetchMatrix(selectedLocation, selectedCategory, selectedDate);
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

      const [storesRes, categoriesRes] = await Promise.all([
        axios.get('/api/stores', config),
        axios.get('/api/categories', config)
      ]);

      // Process stores
      const storeList = (storesRes.data.stores || [])
        .filter(store => store.status === true);
      setLocations(storeList);
      
      // Set default location to first available
      if (!selectedLocation && storeList.length > 0) {
        setSelectedLocation(storeList[0].storeCode);
      }

      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.categories || []);
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

  const fetchMatrix = useCallback(async (storeCode, categoryCode, tranDate) => {
    if (!storeCode) {
      setMatrixSizes([]);
      setMatrixRows([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/opening-balance/matrix', {
        params: { storeCode, categoryCode, tranDate },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data?.success) {
        setMatrixSizes(response.data.data?.sizes || []);
        setMatrixRows(response.data.data?.rows || []);
      }
    } catch (err) {
      console.error("Error fetching opening balance", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg ? `Failed to load opening balance: ${msg}` : 'Failed to load opening balance');
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedLocation && selectedDate) {
      fetchMatrix(selectedLocation, selectedCategory, selectedDate);
    }
  }, [selectedLocation, selectedCategory, selectedDate, fetchMatrix]);

  const handleCellChange = (rowIndex, sizeCode, value) => {
    setMatrixRows(prev => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      const openings = { ...(row.openings || {}) };
      const v = value === '' ? '' : parseInt(value) || 0;
      openings[sizeCode] = v;
      row.openings = openings;
      next[rowIndex] = row;
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/opening-balance/save-matrix', {
        storeCode: selectedLocation,
        tranDate: selectedDate,
        rows: matrixRows
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccessMessage('Opening balance saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to save');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving');
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

          <div className="filter-group">
            <label htmlFor="category-select">Category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
              disabled={!selectedLocation}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedLocation ? (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2 }}>Item</th>
                  {matrixSizes.map(s => (
                    <th key={s.code}>{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, idx) => (
                  <tr key={row.itemCode}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{row.itemCode}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{row.itemName}</span>
                      </div>
                    </td>
                    {matrixSizes.map(s => (
                      <td key={s.code}>
                        <input
                          type="number"
                          min="0"
                          value={row.openings?.[s.code] ?? 0}
                          disabled
                          style={{ width: '90px' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Please select Location</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryList;
