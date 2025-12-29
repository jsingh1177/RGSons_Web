import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './QualityList.css';

const QualityList = () => {
  const navigate = useNavigate();
  const [qualities, setQualities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQuality, setEditingQuality] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    qualityCode: '',
    qualityName: '',
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
    if (!formData.qualityCode.trim()) {
      errors.qualityCode = 'Quality code is required';
    } else if (!validateCode(formData.qualityCode)) {
      errors.qualityCode = 'Quality code must be 2-10 uppercase letters/numbers';
    }

    if (!formData.qualityName.trim()) {
      errors.qualityName = 'Quality name is required';
    } else if (formData.qualityName.trim().length < 1) {
      errors.qualityName = 'Quality name must be at least 1 character';
    } else if (formData.qualityName.trim().length > 200) {
      errors.qualityName = 'Quality name must not exceed 200 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch qualities from API
  const fetchQualities = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/qualities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setQualities(response.data.qualities || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch qualities');
      }
    } catch (err) {
      console.error('Error fetching qualities:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch qualities. Please try again.');
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
      if (editingQuality) {
        // Update existing quality
        response = await axios.put(
          `/api/qualities/${editingQuality.id}`,
          formData,
          config
        );
      } else {
        // Create new quality
        response = await axios.post(
          '/api/qualities',
          formData,
          config
        );
      }

      const isSuccess = response.data.success === true || (response.data.id && !response.data.success);
      
      if (isSuccess || response.status === 200 || response.status === 201) {
        setShowModal(false);
        setEditingQuality(null);
        setFormData({ qualityCode: '', qualityName: '', status: true });
        setValidationErrors({});
        setModalError('');
        fetchQualities(); // Refresh the list
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving quality:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save quality. Please try again.');
      }
    }
  };

  // Handle delete quality
  const handleDelete = async (qualityId) => {
    if (!window.confirm('Are you sure you want to delete this quality?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `/api/qualities/${qualityId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 204 || response.data.success) {
        fetchQualities(); // Refresh the list
      } else {
        alert(response.data.message || 'Failed to delete quality');
      }
    } catch (err) {
      console.error('Error deleting quality:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        alert(err.response?.data?.message || 'Failed to delete quality. Please try again.');
      }
    }
  };

  // Handle edit quality
  const handleEdit = (quality) => {
    setEditingQuality(quality);
    setFormData({
      qualityCode: quality.qualityCode,
      qualityName: quality.qualityName,
      status: quality.status
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Handle add new quality
  const handleAdd = () => {
    setEditingQuality(null);
    setFormData({ qualityCode: '', qualityName: '', status: true });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingQuality(null);
    setFormData({ qualityCode: '', qualityName: '', status: true });
    setValidationErrors({});
    setModalError('');
  };

  useEffect(() => {
    fetchQualities();
  }, [fetchQualities]);

  if (loading) {
    return <div className="loading">Loading qualities...</div>;
  }

  return (
    <div className="quality-list-container">
      <div className="quality-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Card Quality List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Quality
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="quality-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualities.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">No qualities found</td>
              </tr>
            ) : (
              qualities.map((quality) => (
                <tr key={quality.id}>
                  <td>{quality.qualityCode}</td>
                  <td>{quality.qualityName}</td>
                  <td>
                    <span className={`status ${quality.status ? 'active' : 'inactive'}`}>
                      {quality.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(quality)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(quality.id)}
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

      {/* Modal for Add/Edit Quality */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingQuality ? 'Edit Quality' : 'Add New Quality'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="quality-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="qualityCode">Quality Code *</label>
                    <input
                      type="text"
                      id="qualityCode"
                      name="qualityCode"
                      value={formData.qualityCode}
                      onChange={handleInputChange}
                      className={validationErrors.qualityCode ? 'error' : ''}
                      placeholder="Enter quality code (e.g., Q1, Q2)"
                      maxLength="10"
                    />
                    {validationErrors.qualityCode && (
                      <span className="error-message">{validationErrors.qualityCode}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="qualityName">Quality Name *</label>
                    <input
                      type="text"
                      id="qualityName"
                      name="qualityName"
                      value={formData.qualityName}
                      onChange={handleInputChange}
                      className={validationErrors.qualityName ? 'error' : ''}
                      placeholder="Enter quality name (e.g., Premium, Standard)"
                      maxLength="200"
                    />
                    {validationErrors.qualityName && (
                      <span className="error-message">{validationErrors.qualityName}</span>
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
                    {editingQuality ? 'Update Quality' : 'Add Quality'}
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

export default QualityList;
