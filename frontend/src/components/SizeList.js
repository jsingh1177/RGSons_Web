import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './SizeList.css';

const SizeList = () => {
  const navigate = useNavigate();
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
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
    // Code validation removed as it is auto-generated
    /*
    if (!formData.code.trim()) {
      errors.code = 'Size code is required';
    } else if (!validateCode(formData.code)) {
      errors.code = 'Size code must be 2-10 uppercase letters/numbers';
    }
    */

    if (!formData.name.trim()) {
      errors.name = 'Size name is required';
    } else if (formData.name.trim().length < 1) {
      errors.name = 'Size name must be at least 1 character';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Size name must not exceed 200 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch sizes from API
  const fetchSizes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/sizes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSizes(response.data.sizes || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch sizes');
      }
    } catch (err) {
      console.error('Error fetching sizes:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch sizes. Please try again.');
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
      if (editingSize) {
        // Update existing size
        response = await axios.put(
          `/api/sizes/${editingSize.id}`,
          formData,
          config
        );
      } else {
        // Create new size
        response = await axios.post(
          '/api/sizes',
          formData,
          config
        );
      }

      // Check for success based on response structure
      // The create endpoint returns a map with "success": true
      // The update endpoint returns the Size object directly (based on controller code)
      // So we need to handle both cases
      
      const isSuccess = response.data.success === true || (response.data.id && !response.data.success);
      
      if (isSuccess || response.status === 200 || response.status === 201) {
        setShowModal(false);
        setEditingSize(null);
        setFormData({ code: '', name: '', status: true });
        setValidationErrors({});
        setModalError('');
        fetchSizes(); // Refresh the list
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving size:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save size. Please try again.');
      }
    }
  };

  // Handle delete size
  const handleDelete = async (sizeId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this size?",
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
      // The controller has two delete endpoints: /{id} (soft) and /{id}/hard (hard)
      // We'll use soft delete by default as per standard practice
      const response = await axios.delete(
        `/api/sizes/${sizeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 204 || response.data.success) {
        fetchSizes(); // Refresh the list
        Swal.fire(
          'Deleted!',
          'Size has been deleted.',
          'success'
        );
      } else {
        Swal.fire('Error', response.data.message || 'Failed to delete size', 'error');
      }
    } catch (err) {
      console.error('Error deleting size:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete size. Please try again.', 'error');
      }
    }
  };

  // Handle edit size
  const handleEdit = (size) => {
    setEditingSize(size);
    setFormData({
      code: size.code,
      name: size.name,
      status: size.status
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Handle add new size
  const handleAdd = () => {
    setEditingSize(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingSize(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
  };

  useEffect(() => {
    fetchSizes();
  }, [fetchSizes]);

  if (loading) {
    return <div className="loading">Loading sizes...</div>;
  }

  return (
    <div className="size-list-container">
      <div className="size-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Size List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Size
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="size-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sizes.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">No sizes found</td>
              </tr>
            ) : (
              sizes.map((size) => (
                <tr key={size.id}>
                  <td>{size.code}</td>
                  <td>{size.name}</td>
                  <td>
                    <span className={`status ${size.status ? 'active' : 'inactive'}`}>
                      {size.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(size)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(size.id)}
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

      {/* Modal for Add/Edit Size */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingSize ? 'Edit Size' : 'Add New Size'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="size-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="code">Size Code</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className={validationErrors.code ? 'error' : ''}
                      placeholder="Auto-generated"
                      maxLength="10"
                      disabled={true}
                    />
                    {validationErrors.code && (
                      <span className="error-message">{validationErrors.code}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Size Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter size name (e.g., Small, Medium)"
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
                    {editingSize ? 'Update Size' : 'Add Size'}
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

export default SizeList;