import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './CategoryList.css'; // Reusing CategoryList styles for consistency

const LedgerList = () => {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Sale',
    screen: 'Sale',
    status: true
  });

  // Predefined options
  const typeOptions = ['Sale', 'Expense', 'Tender'];
  const screenOptions = ['Sale'];

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Ledger name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch ledgers from API
  const fetchLedgers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ledgers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Direct array response based on Controller
      if (Array.isArray(response.data)) {
        setLedgers(response.data);
        setError('');
      } else {
        setError('Failed to fetch ledgers');
      }
    } catch (err) {
      console.error('Error fetching ledgers:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch ledgers. Please try again.');
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

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        status: formData.status ? 1 : 0
      };

      let response;
      if (editingLedger) {
        response = await axios.put(`/api/ledgers/${editingLedger.id}`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        response = await axios.post('/api/ledgers', payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.data) {
        setShowModal(false);
        fetchLedgers();
        resetForm();
      }
    } catch (err) {
      console.error('Error saving ledger:', err);
      setModalError(err.response?.data?.message || 'Failed to save ledger. Please try again.');
    }
  };

  // Handle edit
  const handleEdit = (ledger) => {
    setEditingLedger(ledger);
    setFormData({
      code: ledger.code,
      name: ledger.name,
      type: ledger.type,
      screen: ledger.screen,
      status: ledger.status === 1
    });
    setShowModal(true);
    setValidationErrors({});
    setModalError('');
  };

  // Handle delete
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this ledger?",
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
      await axios.delete(`/api/ledgers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchLedgers();
      Swal.fire(
        'Deleted!',
        'Ledger has been deleted.',
        'success'
      );
    } catch (err) {
      console.error('Error deleting ledger:', err);
      setError('Failed to delete ledger. Please try again.');
      Swal.fire(
        'Error!',
        'Failed to delete ledger. Please try again.',
        'error'
      );
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingLedger(null);
    setFormData({
      code: '',
      name: '',
      type: 'Sale',
      screen: 'Sale',
      status: true
    });
    setValidationErrors({});
    setModalError('');
  };

  // Handle add new ledger
  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Initial load
  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  if (loading) return <div className="loading">Loading ledgers...</div>;

  return (
    <div className="category-list-container">
      <div className="category-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/settings')} title="Back to Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Ledger Management</h1>
        </div>
        <div className="header-buttons">
          <button 
            className="add-btn"
            style={{ marginRight: '10px', backgroundColor: '#6c757d' }}
            onClick={() => navigate('/ledger-order')}
          >
            Set Order
          </button>
          <button 
            className="add-btn"
            onClick={handleAdd}
          >
            Add New Ledger
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
              <th>Type</th>
              <th>Screen</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgers.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">No ledgers found</td>
              </tr>
            ) : (
              ledgers.map(ledger => (
                <tr key={ledger.id}>
                  <td>{ledger.code}</td>
                  <td>{ledger.name}</td>
                  <td>{ledger.type}</td>
                  <td>{ledger.screen}</td>
                  <td>
                    <span className={`status ${ledger.status === 1 ? 'active' : 'inactive'}`}>
                      {ledger.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(ledger)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(ledger.id)}
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
              <h2>{editingLedger ? 'Edit Ledger' : 'Add New Ledger'}</h2>
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
                    <label htmlFor="code">Ledger Code</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      readOnly
                      disabled
                      className="disabled-input"
                      placeholder="Auto-generated"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">Ledger Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter ledger name"
                      maxLength="200"
                    />
                    {validationErrors.name && (
                      <span className="error-message">{validationErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="type">Type</label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      {typeOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="screen">Screen</label>
                    <select
                      id="screen"
                      name="screen"
                      value={formData.screen}
                      onChange={handleInputChange}
                    >
                      {screenOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
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
                    {editingLedger ? 'Update Ledger' : 'Add Ledger'}
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

export default LedgerList;
