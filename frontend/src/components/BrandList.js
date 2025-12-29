import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './BrandList.css';

const BrandList = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    status: true
  });

  // Validation functions
  const validateCode = (code) => {
    const codeRegex = /^[A-Z0-9]{2,10}$/; // 2-10 characters, uppercase letters and numbers only
    return codeRegex.test(code);
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    // Required field validations
    if (!formData.code.trim()) {
      errors.code = 'Brand code is required';
    } else if (!validateCode(formData.code)) {
      errors.code = 'Brand code must be 2-10 uppercase letters/numbers';
    }

    if (!formData.name.trim()) {
      errors.name = 'Brand name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Brand name must be at least 2 characters';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Brand name must not exceed 200 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch brands from API
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/brands', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setBrands(response.data.brands || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch brands');
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch brands. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
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
      if (editingBrand) {
        // Update existing brand
        response = await axios.put(
          `/api/brands/${editingBrand.id}`,
          formData,
          config
        );
      } else {
        // Create new brand
        response = await axios.post(
          '/api/brands',
          formData,
          config
        );
      }

      if (response.data.success) {
        setShowModal(false);
        setEditingBrand(null);
        setFormData({ code: '', name: '', status: true });
        setValidationErrors({});
        setModalError('');
        fetchBrands(); // Refresh the list
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving brand:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save brand. Please try again.');
      }
    }
  };

  // Handle delete brand
  const handleDelete = async (brandId) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `/api/brands/${brandId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        fetchBrands(); // Refresh the list
      } else {
        alert(response.data.message || 'Failed to delete brand');
      }
    } catch (err) {
      console.error('Error deleting brand:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        alert(err.response?.data?.message || 'Failed to delete brand. Please try again.');
      }
    }
  };

  // Handle edit brand
  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      code: brand.code,
      name: brand.name,
      status: brand.status
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Handle add new brand
  const handleAdd = () => {
    setEditingBrand(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
  };

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  if (loading) {
    return <div className="loading">Loading brands...</div>;
  }

  return (
    <div className="brand-list-container">
      <div className="brand-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Brand List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Brand
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="brand-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">No brands found</td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.id}>
                  <td>{brand.code}</td>
                  <td>{brand.name}</td>
                  <td>
                    <span className={`status ${brand.status ? 'active' : 'inactive'}`}>
                      {brand.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(brand)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(brand.id)}
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

      {/* Modal for Add/Edit Brand */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="brand-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="code">Brand Code *</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className={validationErrors.code ? 'error' : ''}
                      placeholder="Enter brand code (e.g., NIKE, ADID)"
                      maxLength="10"
                    />
                    {validationErrors.code && (
                      <span className="error-message">{validationErrors.code}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Brand Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter brand name"
                      maxLength="200"
                    />
                    {validationErrors.name && (
                      <span className="error-message">{validationErrors.name}</span>
                    )}
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
                    {editingBrand ? 'Update Brand' : 'Add Brand'}
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

export default BrandList;
