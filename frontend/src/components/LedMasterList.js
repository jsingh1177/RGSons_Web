import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './PartyList.css';

const LedMasterList = () => {
  const navigate = useNavigate();
  const [ledMasters, setLedMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLedMaster, setEditingLedMaster] = useState(null);
  const [states, setStates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    groupCode: '',
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

  const fetchLedMasters = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/led-masters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setLedMasters(response.data.ledMasters || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch ledger masters');
      }
    } catch (err) {
      console.error('Error fetching ledger masters:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch ledger masters. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLedMasters();
  }, [fetchLedMasters]);

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

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/group-masters', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data.success) {
          setGroups(response.data.groupMasters || []);
        }
      } catch (err) {
        console.error('Error fetching accounting groups:', err);
      }
    };
    fetchGroups();
  }, []);

  const groupByCode = useMemo(() => {
    const map = new Map();
    (groups || []).forEach((g) => {
      if (g?.code) map.set(String(g.code), g);
    });
    return map;
  }, [groups]);

  const groupOptions = useMemo(() => {
    return (groups || [])
      .filter((g) => g && g.code)
      .filter((g) => g.status === true)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [groups]);

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

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.groupCode.trim()) errors.groupCode = 'Group code is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const url = editingLedMaster
        ? `/api/led-masters/${editingLedMaster.id}`
        : '/api/led-masters';

      const method = editingLedMaster ? 'put' : 'post';

      const response = await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        closeModal();
        fetchLedMasters();
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving ledger master:', err);
      setModalError(err.response?.data?.message || 'Failed to save ledger master. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this ledger master?',
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
      const response = await axios.delete(`/api/led-masters/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        fetchLedMasters();
        Swal.fire('Deleted!', 'Ledger master has been deleted.', 'success');
      } else {
        Swal.fire('Error', response.data.message || 'Failed to delete ledger master', 'error');
      }
    } catch (err) {
      console.error('Error deleting ledger master:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete ledger master. Please try again.', 'error');
      }
    }
  };

  const handleEdit = (ledMaster) => {
    setEditingLedMaster(ledMaster);
    setFormData({
      code: ledMaster.code || '',
      name: ledMaster.name || '',
      groupCode: ledMaster.groupCode || '',
      address: ledMaster.address || '',
      city: ledMaster.city || '',
      state: ledMaster.state || '',
      district: ledMaster.district || '',
      pin: ledMaster.pin || '',
      phone: ledMaster.phone || '',
      email: ledMaster.email || '',
      pan: ledMaster.pan || '',
      gstNumber: ledMaster.gstNumber || '',
      vatNo: ledMaster.vatNo || '',
      type: ledMaster.type || '',
      status: ledMaster.status !== undefined ? ledMaster.status : true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingLedMaster(null);
    setFormData({
      code: '',
      name: '',
      groupCode: '',
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

  const closeModal = () => {
    setShowModal(false);
    setEditingLedMaster(null);
    setValidationErrors({});
    setModalError('');
  };

  if (loading) {
    return <div className="loading">Loading ledger masters...</div>;
  }

  return (
    <div className="party-list-container">
      <div className="party-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)} title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Ledger Master</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Ledger Master
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
              <th>Group</th>
              <th>City</th>
              <th>State</th>
              <th>Phone</th>
              <th>Type</th>
              <th>PAN No</th>
              <th>GST No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledMasters.length === 0 ? (
              <tr>
                <td colSpan="11" className="no-data">No ledger masters found</td>
              </tr>
            ) : (
              ledMasters.map((ledMaster) => (
                <tr key={ledMaster.id}>
                  <td>{ledMaster.code}</td>
                  <td>{ledMaster.name}</td>
                  <td>{ledMaster.groupCode ? (groupByCode.get(String(ledMaster.groupCode))?.name || ledMaster.groupCode) : ''}</td>
                  <td>{ledMaster.city}</td>
                  <td>{ledMaster.state}</td>
                  <td>{ledMaster.phone}</td>
                  <td>{ledMaster.type}</td>
                  <td>{ledMaster.pan}</td>
                  <td>{ledMaster.gstNumber}</td>
                  <td>
                    <span className={`status-badge ${ledMaster.status ? 'active' : 'inactive'}`}>
                      {ledMaster.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(ledMaster)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(ledMaster.id)}
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
          <div className="modal party-modal">
            <div className="modal-header">
              <h2>{editingLedMaster ? 'Edit Ledger Master' : 'Add New Ledger Master'}</h2>
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
                      placeholder="Auto-generated"
                      maxLength="50"
                      disabled={true}
                    />
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
                      placeholder="Enter ledger name"
                      maxLength="200"
                    />
                    {validationErrors.name && (
                      <span className="error-message">{validationErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="groupCode">Group Code *</label>
                    <select
                      id="groupCode"
                      name="groupCode"
                      value={formData.groupCode}
                      onChange={handleInputChange}
                      className={validationErrors.groupCode ? 'error' : ''}
                    >
                      <option value="">Select Group</option>
                      {groupOptions.map((g) => (
                        <option key={g.code} value={g.code}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                    {validationErrors.groupCode && (
                      <span className="error-message">{validationErrors.groupCode}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="type">Type</label>
                    <input
                      type="text"
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      placeholder="Enter type"
                      maxLength="100"
                    />
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
                    <label htmlFor="state">State</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.code} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
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
                    {editingLedMaster ? 'Update Ledger Master' : 'Add Ledger Master'}
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

export default LedMasterList;
