import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PartyList.css';

const PartyList = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [states, setStates] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    district: '',
    pin: '',
    phone: '',
    email: '',
    pan: '',
    gstNumber: '',
    vatNo: '',
    type: '',
    status: true
  });

  // Fetch parties from API
  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setParties(response.data.parties || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch parties');
      }
    } catch (err) {
      console.error('Error fetching parties:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch parties. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

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

  // Handle input change
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

  // Validate form
  const validateForm = () => {
    const errors = {};
    // if (!formData.code.trim()) errors.code = 'Code is required';
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const url = editingParty 
        ? `/api/parties/${editingParty.id}`
        : '/api/parties';
      
      const method = editingParty ? 'put' : 'post';
      
      const response = await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        closeModal();
        fetchParties();
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving party:', err);
      setModalError(err.response?.data?.message || 'Failed to save party. Please try again.');
    }
  };

  // Handle delete party
  const handleDelete = async (partyId) => {
    if (!window.confirm('Are you sure you want to delete this party?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `/api/parties/${partyId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        fetchParties(); // Refresh the list
      } else {
        alert(response.data.message || 'Failed to delete party');
      }
    } catch (err) {
      console.error('Error deleting party:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        alert(err.response?.data?.message || 'Failed to delete party. Please try again.');
      }
    }
  };

  // Handle edit party
  const handleEdit = (party) => {
    setEditingParty(party);
    setFormData({
      code: party.code || '',
      name: party.name || '',
      address: party.address || '',
      city: party.city || '',
      state: party.state || '',
      district: party.district || '',
      pin: party.pin || '',
      phone: party.phone || '',
      email: party.email || '',
      pan: party.pan || '',
      gstNumber: party.gstNumber || '',
      vatNo: party.vatNo || '',
      type: party.type || '',
      status: party.status !== undefined ? party.status : true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Handle add new party
  const handleAdd = () => {
    setEditingParty(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      district: '',
      pin: '',
      phone: '',
      email: '',
      pan: '',
      gstNumber: '',
      vatNo: '',
      type: '',
      status: true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingParty(null);
    setValidationErrors({});
    setModalError('');
  };

  if (loading) {
    return <div className="loading">Loading parties...</div>;
  }

  return (
    <div className="party-list-container">
      <div className="party-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Party List</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Party
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="party-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>City</th>
              <th>State</th>
              <th>Phone</th>
              <th>Type</th>
              <th>PAN No</th>
              <th>VAT No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parties.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">No parties found</td>
              </tr>
            ) : (
              parties.map((party) => (
                <tr key={party.id}>
                  <td>{party.code}</td>
                  <td>{party.name}</td>
                  <td>{party.city}</td>
                  <td>{party.state}</td>
                  <td>{party.phone}</td>
                  <td>{party.type}</td>
                  <td>{party.pan}</td>
                  <td>{party.vatNo}</td>
                  <td>
                    <span className={`status-badge ${party.status ? 'active' : 'inactive'}`}>
                      {party.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(party)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(party.id)}
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

      {/* Modal for Add/Edit Party */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal party-modal">
            <div className="modal-header">
              <h2>{editingParty ? 'Edit Party' : 'Add New Party'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            
            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}
            
            <div className="party-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="code">Code</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      className={validationErrors.code ? 'error' : ''}
                      placeholder="Auto-generated"
                      maxLength="50"
                      disabled={true}
                    />
                    {validationErrors.code && (
                      <span className="error-message">{validationErrors.code}</span>
                    )}
                  </div>

                  <div className="form-group span-2">
                    <label htmlFor="name">Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter party name"
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
                      className="form-control"
                    >
                      <option value="">Select Type</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Supplier">Supplier</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      maxLength="15"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="state">State *</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={validationErrors.state ? 'error form-control' : 'form-control'}
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
                    <label htmlFor="district">District</label>
                    <input
                      type="text"
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Enter district"
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pin">PIN Code</label>
                    <input
                      type="text"
                      id="pin"
                      name="pin"
                      value={formData.pin}
                      onChange={handleInputChange}
                      placeholder="Enter PIN code"
                      maxLength="10"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pan">PAN</label>
                    <input
                      type="text"
                      id="pan"
                      name="pan"
                      value={formData.pan}
                      onChange={handleInputChange}
                      placeholder="Enter PAN"
                      maxLength="10"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gstNumber">GST Number</label>
                    <input
                      type="text"
                      id="gstNumber"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                      placeholder="Enter GST number"
                      maxLength="15"
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
                      placeholder="Enter VAT No"
                      maxLength="20"
                    />
                  </div>

                  <div className="form-group span-3">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter address"
                      rows="2"
                    />
                  </div>

                  <div className="form-group checkbox-group">
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
                    {editingParty ? 'Update Party' : 'Add Party'}
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

export default PartyList;
