import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './ItemList.css'; 
import './PriceManagement.css'; // We can reuse or adapt ItemList.css styles if PriceManagement.css is empty

const PriceManagement = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null); // If null, it's Add mode
  const [modalError, setModalError] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '', // Read-only in Add mode after selection, or populated from selection
    sizeCode: '',
    sizeName: '',
    purchasePrice: '',
    salePrice: '',
    mrp: ''
  });

  // Helper data for Add mode
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  const fetchPrices = useCallback(async (queryOverride) => {
    try {
      const currentSearch = queryOverride !== undefined ? queryOverride : searchQueryRef.current;
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `/api/prices?page=${currentPage}&size=${pageSize}`;
      if (currentSearch) {
        url += `&search=${encodeURIComponent(currentSearch)}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setPrices(response.data.prices || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalItems(response.data.totalItems || 0);
        setCurrentPage(response.data.currentPage || 0);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch prices');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch prices. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, currentPage, pageSize]);

  // Fetch Sizes for dropdown
  const fetchSizes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/sizes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSizes(response.data.sizes || []);
      }
    } catch (error) {
      console.error("Error fetching sizes", error);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchSizes();
  }, [fetchSizes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrices(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPrices, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(0);
  };

  const handleEdit = (price) => {
    setEditingPrice(price);
    setFormData({
      itemCode: price.itemCode,
      itemName: price.itemName,
      sizeCode: price.sizeCode,
      sizeName: price.sizeName,
      purchasePrice: price.purchasePrice || '',
      mrp: price.mrp || ''
    });
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingPrice(null);
    setFormData({
      itemCode: '',
      itemName: '',
      sizeCode: '',
      sizeName: '',
      purchasePrice: '',
      mrp: ''
    });
    setItemSearch('');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPrice(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Item Search for Add Modal
  const handleItemSearch = async (e) => {
    const value = e.target.value;
    setItemSearch(value);
    if (value.length > 1) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/items/search?query=${value}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          setItems(response.data.items || []);
          setShowItemSuggestions(true);
        }
      } catch (error) {
        console.error("Error searching items", error);
      }
    } else {
      setItems([]);
      setShowItemSuggestions(false);
    }
  };

  const selectItem = (item) => {
    setFormData(prev => ({
      ...prev,
      itemCode: item.itemCode,
      itemName: item.itemName
    }));
    setItemSearch(`${item.itemName} (${item.itemCode})`);
    setShowItemSuggestions(false);
  };

  const handleSizeChange = (e) => {
    const selectedSizeCode = e.target.value;
    const selectedSize = sizes.find(s => s.code === selectedSizeCode);
    if (selectedSize) {
      setFormData(prev => ({
        ...prev,
        sizeCode: selectedSize.code,
        sizeName: selectedSize.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sizeCode: '',
        sizeName: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = [{
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        sizeCode: formData.sizeCode,
        sizeName: formData.sizeName,
        purchasePrice: parseFloat(formData.purchasePrice),
        salePrice: parseFloat(formData.salePrice),
        mrp: parseFloat(formData.mrp)
      }];

      // Check validation
      if (!formData.itemCode || !formData.sizeCode) {
        setModalError("Item and Size are required");
        return;
      }

      const response = await axios.post('/api/prices/save-all', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowModal(false);
        Swal.fire('Success', 'Price saved successfully', 'success');
        fetchPrices();
      } else {
        setModalError(response.data.message || 'Failed to save price');
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error saving price');
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/prices/export', {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'prices.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      Swal.fire({
        title: 'Success',
        text: 'Prices downloaded successfully',
        icon: 'success',
        timer: 2000
      });
    } catch (error) {
      console.error('Download error', error);
      Swal.fire('Error', 'Failed to download prices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      Swal.fire({
        title: 'Processing Upload...',
        text: 'Please wait while we process the Excel file. This may take a moment.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/prices/import', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const errors = response.data.errors || [];
        
        if (errors.length > 0) {
            const csvRows = ["Error Details"];
            errors.forEach(err => {
                csvRows.push(`"${err.replace(/"/g, '""')}"`);
            });
            
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'error.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Swal.fire({
                title: 'Upload Completed with Errors',
                text: (response.data.message || 'Import processed') + '. Error log has been downloaded.',
                icon: 'warning'
            });
        } else {
            Swal.fire({
                title: 'Upload Successful',
                text: response.data.message,
                icon: 'success'
            });
        }
        fetchPrices();
      } else {
        Swal.fire('Error', response.data.message || 'Failed to import prices', 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error importing prices';
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div className="item-list-container"> {/* Reusing ItemList container class */}
      <div className="item-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Price List</h1>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by Item Name or Code..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '10px 15px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              outline: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
          />
        </div>

        <div className="header-buttons">
          {currentUser && currentUser.role === 'SUPPER' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <button 
                className="add-btn" 
                style={{ backgroundColor: '#217346', backgroundImage: 'none', marginRight: '10px' }}
                onClick={() => fileInputRef.current.click()}
              >
                Upload Excel
              </button>
              <button 
                className="add-btn" 
                style={{ backgroundColor: '#007bff', backgroundImage: 'none', marginRight: '10px' }}
                onClick={handleDownload}
              >
                Download Excel
              </button>
            </>
          )}
          <button className="add-btn" onClick={handleAdd}>
            Add New Price
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="item-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Size</th>
              <th>Purchase Price</th>
              <th>Sale Price</th>
              <th>MRP</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && prices.length === 0 ? (
              <tr>
                <td colSpan="7" className="loading-cell" style={{ textAlign: 'center', padding: '20px' }}>
                  Loading...
                </td>
              </tr>
            ) : prices.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No prices found</td>
              </tr>
            ) : (
              prices.map((price) => (
                <tr key={price.id || `${price.itemCode}-${price.sizeCode}`}>
                  <td>{price.itemCode}</td>
                  <td>{price.itemName}</td>
                  <td>{price.sizeName}</td>
                  <td>{price.purchasePrice}</td>
                  <td>{price.salePrice}</td>
                  <td>{price.mrp}</td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(price)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem', 
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}>
        <div className="pagination-info">
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} entries
        </div>
        
        <div className="pagination-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={pageSize} 
            onChange={handlePageSizeChange}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 0}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage === 0 ? '#f1f5f9' : 'white',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: '0 10px' }}>
            Page {currentPage + 1} of {Math.max(1, totalPages)}
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage >= totalPages - 1}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage >= totalPages - 1 ? '#f1f5f9' : 'white',
              cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingPrice ? 'Edit Price' : 'Add New Price'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item</label>
                {editingPrice ? (
                  <input type="text" value={`${formData.itemName} (${formData.itemCode})`} disabled className="form-control" />
                ) : (
                  <div className="search-container" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search Item..."
                      value={itemSearch}
                      onChange={handleItemSearch}
                      className="form-control"
                    />
                    {showItemSuggestions && items.length > 0 && (
                      <div className="search-suggestions" style={{ position: 'absolute', width: '100%', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, background: 'white', border: '1px solid #ddd' }}>
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="suggestion-item"
                            style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                            onClick={() => selectItem(item)}
                          >
                            {item.itemName} ({item.itemCode})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Size</label>
                {editingPrice ? (
                  <input type="text" value={formData.sizeName} disabled className="form-control" />
                ) : (
                  <select 
                    name="sizeCode" 
                    value={formData.sizeCode} 
                    onChange={handleSizeChange}
                    className="form-control"
                    required
                  >
                    <option value="">Select Size</option>
                    {sizes.map(size => (
                      <option key={size.id} value={size.code}>{size.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Purchase Price</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleInputChange}
                  className="form-control"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Sale Price</label>
                <input
                  type="number"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  className="form-control"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>MRP</label>
                <input
                  type="number"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  className="form-control"
                  step="0.01"
                />
              </div>

              {modalError && <div className="error-message">{modalError}</div>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceManagement;
