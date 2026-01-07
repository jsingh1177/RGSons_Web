import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './StoreList.css';

const StoreList = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [states, setStates] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    storeCode: '',
    storeName: '',
    address: '',
    area: '',
    zone: '',
    district: '',
    city: '',
    pin: '',
    phone: '',
    email: '',
    gstNumber: '',
    vatNo: '',
    panNo: '',
    state: ''
  });

  // Validation functions
  const validatePin = (pin) => {
    const pinRegex = /^[1-9][0-9]{5}$/; // 6 digits, first digit cannot be 0
    return pinRegex.test(pin);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/; // 10 digits starting with 6-9
    return phoneRegex.test(phone);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    // Required field validations
    if (!formData.storeCode.trim()) {
      errors.storeCode = 'Store Code is required';
    } else if (
      (!editingStore || formData.storeCode.trim().toLowerCase() !== (editingStore.storeCode || '').toLowerCase()) &&
      isDuplicateStoreCode(formData.storeCode.trim())
    ) {
      errors.storeCode = 'Store Code already exists. Please use a different code.';
    }
    
    if (!formData.storeName.trim()) {
      errors.storeName = 'Store Name is required';
    } else if (
      (!editingStore || formData.storeName.trim().toLowerCase() !== (editingStore.storeName || '').toLowerCase()) &&
      isDuplicateStoreName(formData.storeName.trim())
    ) {
      errors.storeName = 'Store Name already exists. Please use a different name.';
    }
    
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    // Pin validation (only validate if not empty)
    if (formData.pin && formData.pin.trim() && !validatePin(formData.pin.trim())) {
      errors.pin = 'Pin must be a valid 6-digit postal code';
    }

    // Phone validation (only validate if not empty)
    if (formData.phone && formData.phone.trim() && !validatePhone(formData.phone.trim())) {
      errors.phone = 'Phone must be a valid 10-digit Indian mobile number';
    }

    // Email validation (only validate if not empty)
    if (formData.email && formData.email.trim() && !validateEmail(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/stores', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success && Array.isArray(response.data.stores)) {
        setStores(response.data.stores);
        setError('');
      } else {
        setStores([]);
        setError(response.data.message || 'No stores found.');
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch stores. Please try again.');
        setStores([]);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/states', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data.success) {
          setStates(response.data.states || []);
        }
      } catch (err) {
        console.error('Error fetching states:', err);
      }
    };
    fetchStates();
  }, []);

  // Check for duplicate store code
  const isDuplicateStoreCode = (storeCode) => {
    return stores.some(store => 
      store.storeCode.toLowerCase() === storeCode.toLowerCase() && 
      (!editingStore || store.id !== editingStore.id)
    );
  };

  // Check for duplicate store name
  const isDuplicateStoreName = (storeName) => {
    return stores.some(store => {
      const sameName = (store.storeName || '').toLowerCase() === storeName.toLowerCase();
      const isSameRecord =
        editingStore &&
        (
          (store.id && editingStore.id && store.id === editingStore.id) ||
          (store.storeCode && editingStore.storeCode && store.storeCode === editingStore.storeCode)
        );
      return sameName && !isSameRecord;
    });
  };

  // Check if all required fields are filled and no validation errors exist
  const isFormValid = () => {
    const hasRequiredFields = formData.storeCode.trim() !== '' && formData.storeName.trim() !== '' && formData.state.trim() !== '';
    const hasNoDuplicates = !isDuplicateStoreCode(formData.storeCode.trim()) && !isDuplicateStoreName(formData.storeName.trim());
    return hasRequiredFields && hasNoDuplicates;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Open modal for adding new store
  const handleAddStore = () => {
    setEditingStore(null);
    setFormData({
      storeCode: '',
      storeName: '',
      address: '',
      area: '',
      zone: '',
      district: '',
      city: '',
      pin: '',
      phone: '',
      email: '',
      gstNumber: '',
      vatNo: '',
      panNo: '',
      state: '',
      status: true
    });
    setValidationErrors({}); // Clear validation errors
    setModalError(''); // Clear modal errors
    setError(''); // Clear general errors
    setShowModal(true);
  };

  // Open modal for editing existing store
  const handleEditStore = (store) => {
    setEditingStore(store);
    setFormData({
      storeCode: store.storeCode || '',
      storeName: store.storeName || '',
      address: store.address || '',
      area: store.area || '',
      zone: store.zone || '',
      district: store.district || '',
      city: store.city || '',
      pin: store.pin || '',
      phone: store.phone || '',
      email: store.email || '',
      gstNumber: store.gstNumber || '',
      vatNo: store.vatNo || '',
      panNo: store.panNo || '',
      state: store.state || '',
      status: store.status !== undefined ? store.status : true
    });
    setValidationErrors({}); // Clear validation errors
    setModalError(''); // Clear modal errors
    setError(''); // Clear general errors
    setShowModal(true);
  };

  // Save store (add or update)
  const handleSaveStore = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Don't set general error, validation errors are shown inline
      return;
    }
    
    try {
      if (editingStore) {
        // Update existing store
        await axios.put(`/api/stores/${editingStore.id}`, formData);
      } else {
        // Add new store
        await axios.post('/api/stores', formData);
      }
      setShowModal(false);
      setValidationErrors({}); // Clear validation errors
      setModalError(''); // Clear modal errors
      fetchStores(); // Refresh the list
      setError('');
    } catch (error) {
      console.error('Error saving store:', error);
      setModalError('Failed to save store. Please try again.');
    }
  };

  // Delete store
  const handleDeleteStore = async (storeId) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await axios.delete(`/api/stores/${storeId}`);
        fetchStores(); // Refresh the list
        setError('');
      } catch (error) {
        console.error('Error deleting store:', error);
        setError('Failed to delete store. Please try again.');
      }
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStore(null);
  };

  if (loading) {
    return <div className="loading">Loading stores...</div>;
  }

  return (
    <div className="store-list-container">
      <div className="store-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Store List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAddStore}>
            Add New Store
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="store-table">
          <thead>
            <tr>
              <th>Store Code</th>
              <th>Store Name</th>
              <th>City</th>
              <th>State</th>
              <th>Phone</th>
              <th>GST Number</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No stores found</td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id}>
                  <td>{store.storeCode}</td>
                  <td>{store.storeName}</td>
                  <td>{store.city}</td>
                  <td>{store.state}</td>
                  <td>{store.phone}</td>
                  <td>{store.gstNumber}</td>
                  <td>
                    <span className={`status ${store.status ? 'active' : 'inactive'}`}>
                      {store.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEditStore(store)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteStore(store.id)}
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

      {/* Modal for Add/Edit Store */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingStore ? 'Edit Store' : 'Add New Store'}</h2>
              <div className="header-actions">
                <button className="close-btn" onClick={handleCloseModal}>
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleSaveStore} className="store-form" id="store-form">
              {modalError && <div className="modal-error-message">{modalError}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="storeCode">Store Code *</label>
                  <input
                    type="text"
                    id="storeCode"
                    name="storeCode"
                    value={formData.storeCode}
                    onChange={handleInputChange}
                    className={validationErrors.storeCode ? 'error' : ''}
                    disabled={editingStore !== null}
                    required
                  />
                  {validationErrors.storeCode && (
                    <span className="error-message">{validationErrors.storeCode}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="storeName">Store Name *</label>
                  <input
                    type="text"
                    id="storeName"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    className={validationErrors.storeName ? 'error' : ''}
                    required
                  />
                  {validationErrors.storeName && (
                    <span className="error-message">{validationErrors.storeName}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="area">Area</label>
                  <input
                    type="text"
                    id="area"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="zone">Zone</label>
                  <input
                    type="text"
                    id="zone"
                    name="zone"
                    value={formData.zone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="district">District</label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={validationErrors.state ? 'error' : ''}
                    required
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.state && (
                    <span className="error-message">{validationErrors.state}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pin">Pin</label>
                  <input
                    type="text"
                    id="pin"
                    name="pin"
                    value={formData.pin}
                    onChange={handleInputChange}
                    className={validationErrors.pin ? 'error' : ''}
                    placeholder="e.g., 110001"
                  />
                  {validationErrors.pin && (
                    <span className="error-message">{validationErrors.pin}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={validationErrors.phone ? 'error' : ''}
                    placeholder="e.g., 9876543210"
                  />
                  {validationErrors.phone && (
                    <span className="error-message">{validationErrors.phone}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={validationErrors.email ? 'error' : ''}
                    placeholder="e.g., store@example.com"
                  />
                  {validationErrors.email && (
                    <span className="error-message">{validationErrors.email}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="gstNumber">GST Number</label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vatNo">VAT No</label>
                  <input
                    type="text"
                    id="vatNo"
                    name="vatNo"
                    value={formData.vatNo}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panNo">PAN No</label>
                  <input
                    type="text"
                    id="panNo"
                    name="panNo"
                    value={formData.panNo}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingStore ? 'Update Store' : 'Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreList;
