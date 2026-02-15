import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './ItemList.css';

const ItemList = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const searchTimeoutRef = useRef(null);
  const searchQueryRef = useRef(searchQuery); // Ref to track latest search query

  // Update ref when state changes
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [brandMap, setBrandMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    mrp: null,
    purchasePrice: null,
    brandCode: '',
    categoryCode: '',
    size: '',
    status: true
  });

  const validateCode = (code) => {
    const codeRegex = /^[A-Z0-9]{2,20}$/;
    return codeRegex.test(code);
  };

  const validateForm = () => {
    const errors = {};
    // Item Code validation removed as it is auto-generated
    /*
    if (!formData.itemCode.trim()) {
      errors.itemCode = 'Item code is required';
    } else if (!validateCode(formData.itemCode)) {
      errors.itemCode = 'Item code must be 2-20 uppercase letters/numbers';
    }
    */
    if (!formData.itemName.trim()) {
      errors.itemName = 'Item name is required';
    } else if (formData.itemName.trim().length > 200) {
      errors.itemName = 'Item name must not exceed 200 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchItems = useCallback(async (queryOverride) => {
    try {
      const currentSearch = queryOverride !== undefined ? queryOverride : searchQueryRef.current;
      console.log('fetchItems called with searchQuery:', currentSearch, 'currentPage:', currentPage);
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `/api/items?page=${currentPage}&size=${pageSize}`;
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
        setItems(response.data.items || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalItems(response.data.totalItems || 0);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch items');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch items. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, currentPage, pageSize]);

  const fetchRefs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      const [brandsRes, categoriesRes] = await Promise.all([
        axios.get('/api/brands', config),
        axios.get('/api/categories', config)
      ]);
      const bm = {};
      const cm = {};
      const brands = brandsRes.data.brands || [];
      const categories = categoriesRes.data.categories || [];
      setBrands(brands);
      setCategories(categories);
      for (const b of brands) {
        if (b.code) bm[b.code] = b.name || b.code;
      }
      for (const c of categories) {
        if (c.code) cm[c.code] = c.name || c.code;
      }
      setBrandMap(bm);
      setCategoryMap(cm);
    } catch (_) {}
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      let response;
      if (editingItem) {
        response = await axios.put(`/api/items/${editingItem.id}`, formData, config);
      } else {
        response = await axios.post('/api/items', formData, config);
      }
      if (response.data.success) {
        setShowModal(false);
        setEditingItem(null);
        setFormData({
          itemCode: '',
          itemName: '',
          mrp: '',
          purchasePrice: '',
          brandCode: '',
          categoryCode: '',
          size: '',
          status: true
        });
        setValidationErrors({});
        setModalError('');
        fetchItems();
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save item. Please try again.');
      }
    }
  };

  const handleDelete = async (itemId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this item?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/items/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        fetchItems();
        Swal.fire(
          'Deleted!',
          'Item has been deleted.',
          'success'
        );
      } else {
        Swal.fire('Error', response.data.message || 'Failed to delete item', 'error');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete item. Please try again.', 'error');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode || '',
      itemName: item.itemName || '',
      mrp: item.mrp,
      purchasePrice: item.purchasePrice,
      brandCode: item.brandCode || '',
      categoryCode: item.categoryCode || '',
      size: item.size || '',
      status: item.status
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      itemCode: '',
      itemName: '',
      mrp: null,
      purchasePrice: null,
      brandCode: '',
      categoryCode: '',
      size: '',
      status: true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      itemCode: '',
      itemName: '',
      mrp: '',
      purchasePrice: '',
      brandCode: '',
      categoryCode: '',
      size: '',
      status: true
    });
    setValidationErrors({});
    setModalError('');
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/items/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'items.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      Swal.fire({
        title: 'Success',
        text: 'Items downloaded successfully',
        icon: 'success',
        timer: 2000
      });
    } catch (error) {
      console.error('Download error', error);
      Swal.fire('Error', 'Failed to download items', 'error');
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
      // Show processing alert
      Swal.fire({
        title: 'Processing Upload...',
        text: 'Please wait while we process the Excel file. This may take a moment.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/items/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const errors = response.data.errors || [];
        
        if (errors.length > 0) {
          // Generate Error CSV
          const csvHeader = "Row,Item Name,Error Message\n";
          const csvContent = csvHeader + errors.join("\n");
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
            text: response.data.message + '. Error log has been downloaded.',
            icon: 'warning'
          });
        } else {
          Swal.fire({
            title: 'Upload Successful',
            text: response.data.message,
            icon: 'success'
          });
        }
        fetchItems();
      } else {
        Swal.fire('Error', response.data.message, 'error');
      }
    } catch (error) {
      console.error('Upload error', error);
      Swal.fire('Error', 'Failed to upload file', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchRefs();
  }, [fetchRefs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchItems, searchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(0); // Reset to first page on search
    
    // Clear existing timeout for suggestions
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length > 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`/api/items/search?query=${value}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.data.success) {
            setSuggestions(response.data.items || []);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Search suggestions error", error);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.itemCode); // Use Item Code for precise filtering
    setCurrentPage(0); // Reset to first page
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(0);
  };

  if (loading && items.length === 0 && !searchQuery) {
    return <div className="loading">Loading items...</div>;
  }

  return (
    <div className="item-list-container">
      <div className="item-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Item List</h1>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by Item Name or Code..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            style={{
              width: '100%',
              padding: '10px 15px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              outline: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((item, index) => (
                <div
                  key={item.id}
                  className={`suggestion-item ${index === focusedSuggestionIndex ? 'focused' : ''}`}
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <div className="suggestion-info">
                    <h4>{item.itemName}</h4>
                    <p>{item.itemCode}</p>
                  </div>
                  <div className="suggestion-meta">
                    {item.category}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            Add New Item
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="item-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell" style={{ textAlign: 'center', padding: '20px' }}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No items found</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.itemCode}</td>
                  <td>{item.itemName}</td>
                  <td>{brandMap[item.brandCode] || '-'}</td>
                  <td>{categoryMap[item.categoryCode] || '-'}</td>
                  <td>
                    <span className={`status ${item.status ? 'active' : 'inactive'}`}>
                      {item.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
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
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} items (Loaded: {items.length})
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
          
          <span style={{ margin: '0 10px' }}>
            Page {currentPage + 1} of {totalPages}
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <div className="header-actions">
                <button className="close-btn" onClick={closeModal}>×</button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="item-form">
              {modalError && (
                <div className="modal-error-message">
                  {modalError}
                </div>
              )}
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="itemCode">Item Code</label>
                  <input
                    type="text"
                    id="itemCode"
                    name="itemCode"
                    value={formData.itemCode}
                    onChange={handleInputChange}
                    className={validationErrors.itemCode ? 'error' : ''}
                    placeholder="Auto-generated"
                    maxLength="20"
                    disabled={true}
                  />
                  {validationErrors.itemCode && (
                    <span className="error-message">{validationErrors.itemCode}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="itemName">Item Name *</label>
                  <input
                    type="text"
                    id="itemName"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleInputChange}
                    className={validationErrors.itemName ? 'error' : ''}
                    placeholder="Enter item name"
                    maxLength="200"
                  />
                  {validationErrors.itemName && (
                    <span className="error-message">{validationErrors.itemName}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="brandCode">Brand</label>
                  <select
                    id="brandCode"
                    name="brandCode"
                    value={formData.brandCode}
                    onChange={handleInputChange}
                    className={validationErrors.brandCode ? 'error' : ''}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.code}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="categoryCode">Category</label>
                  <select
                    id="categoryCode"
                    name="categoryCode"
                    value={formData.categoryCode}
                    onChange={handleInputChange}
                    className={validationErrors.categoryCode ? 'error' : ''}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                    <label htmlFor="size">Size</label>
                    <input
                      type="text"
                      id="size"
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      placeholder="Enter size"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="mrp">MRP</label>
                    <input
                      type="number"
                      id="mrp"
                      name="mrp"
                      value={formData.mrp || ''}
                      onChange={handleInputChange}
                      placeholder="Enter MRP"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="purchasePrice">Purchase Price</label>
                    <input
                      type="number"
                      id="purchasePrice"
                      name="purchasePrice"
                      value={formData.purchasePrice || ''}
                      onChange={handleInputChange}
                      placeholder="Enter Purchase Price"
                    />
                </div>
                <div className="form-group">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '30px' }}>
                    <input
                      type="checkbox"
                      name="status"
                      checked={formData.status}
                      onChange={handleInputChange}
                      style={{ width: 'auto' }}
                    />
                    Active Status
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
