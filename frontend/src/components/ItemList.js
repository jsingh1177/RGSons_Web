import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './ItemList.css';

const ItemList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/items', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        setItems(response.data.items || []);
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
  }, [navigate]);

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

  useEffect(() => {
    fetchRefs();
    fetchItems();
  }, [fetchItems, fetchRefs]);

  if (loading) {
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
        <div className="header-buttons">
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
            {items.length === 0 ? (
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="item-form">
              <form onSubmit={handleSubmit}>
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
                  </div>
                  <div className="form-group">
                    <label htmlFor="brandCode">Brand</label>
                    <select
                      id="brandCode"
                      name="brandCode"
                      value={formData.brandCode}
                      onChange={handleInputChange}
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
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="status"
                        checked={formData.status}
                        onChange={handleInputChange}
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
        </div>
      )}
    </div>
  );
};

export default ItemList;
