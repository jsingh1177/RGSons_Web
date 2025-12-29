import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CategoryList.css';

const CategoryList = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
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
      errors.code = 'Category code is required';
    } else if (!validateCode(formData.code)) {
      errors.code = 'Category code must be 2-10 uppercase letters/numbers';
    }

    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Category name must not exceed 200 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setCategories(response.data.categories || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch categories. Please try again.');
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
      if (editingCategory) {
        // Update existing category
        response = await axios.put(
          `/api/categories/${editingCategory.id}`,
          formData,
          config
        );
      } else {
        // Create new category
        response = await axios.post(
          '/api/categories',
          formData,
          config
        );
      }

      if (response.data.success) {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ code: '', name: '', status: true });
        setValidationErrors({});
        setModalError('');
        fetchCategories(); // Refresh the list
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save category. Please try again.');
      }
    }
  };

  // Handle delete category
  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `/api/categories/${categoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        fetchCategories(); // Refresh the list
      } else {
        alert(response.data.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        alert(err.response?.data?.message || 'Failed to delete category. Please try again.');
      }
    }
  };

  // Handle edit category
  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      status: category.status
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Handle add new category
  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  return (
    <div className="category-list-container">
      <div className="category-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Category List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Category
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="category-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">No categories found</td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.code}</td>
                  <td>{category.name}</td>
                  <td>
                    <span className={`status ${category.status ? 'active' : 'inactive'}`}>
                      {category.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(category.id)}
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

      {/* Modal for Add/Edit Category */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="category-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="code">Category Code *</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className={validationErrors.code ? 'error' : ''}
                      placeholder="Enter category code (e.g., ELEC, FURN)"
                      maxLength="10"
                    />
                    {validationErrors.code && (
                      <span className="error-message">{validationErrors.code}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Category Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter category name"
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
                    {editingCategory ? 'Update Category' : 'Add Category'}
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

export default CategoryList;