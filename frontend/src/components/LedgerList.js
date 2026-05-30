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
  const [showLedgerMapModal, setShowLedgerMapModal] = useState(false);
  const [ledgerMaps, setLedgerMaps] = useState([]);
  const [ledgerMapLoading, setLedgerMapLoading] = useState(false);
  const [ledgerMapError, setLedgerMapError] = useState('');
  const [ledgerMapFilterType, setLedgerMapFilterType] = useState('All');
  const [ledgerMapFilterScreen, setLedgerMapFilterScreen] = useState('All');
  const [ledgerMapForm, setLedgerMapForm] = useState({
    id: null,
    ledgerCode: '',
    type: 'Sale',
    screen: 'Sale',
    status: true,
    perc: ''
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Sale',
    screen: 'Sale',
    status: true,
    perc: ''
  });

  const typeOptions = ['Sale', 'Purchase', 'Expense', 'Tender', 'Tax', 'Income'];
  const screenOptions = ['Sale', 'Purchase', 'Debit Note', 'Stock Transfer'];

  const fetchLedgerMaps = useCallback(async () => {
    try {
      setLedgerMapLoading(true);
      setLedgerMapError('');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ledger-map', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setLedgerMaps(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching ledger maps:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setLedgerMapError('Failed to load ledger map. Please try again.');
      }
    } finally {
      setLedgerMapLoading(false);
    }
  }, [navigate]);

  const openLedgerMapModal = async () => {
    setShowLedgerMapModal(true);
    setLedgerMapError('');
    setLedgerMapFilterType('All');
    setLedgerMapFilterScreen('All');
    setLedgerMapForm({
      id: null,
      ledgerCode: '',
      type: 'Sale',
      screen: 'Sale',
      status: true,
      perc: ''
    });
    await fetchLedgerMaps();
  };

  const closeLedgerMapModal = () => {
    setShowLedgerMapModal(false);
    setLedgerMapError('');
    setLedgerMapForm({
      id: null,
      ledgerCode: '',
      type: 'Sale',
      screen: 'Sale',
      status: true,
      perc: ''
    });
  };

  const handleLedgerMapFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLedgerMapForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveLedgerMap = async (e) => {
    e.preventDefault();
    setLedgerMapError('');

    const ledgerCode = String(ledgerMapForm.ledgerCode ?? '').trim();
    const screen = String(ledgerMapForm.screen ?? '').trim();
    const type = String(ledgerMapForm.type ?? '').trim();
    const percRaw = String(ledgerMapForm.perc ?? '').trim();
    const percNumber = percRaw === '' ? null : Number(percRaw);

    if (!ledgerCode) {
      setLedgerMapError('Ledger Name is required');
      return;
    }
    if (!screen) {
      setLedgerMapError('Screen is required');
      return;
    }
    if (!type) {
      setLedgerMapError('Type is required');
      return;
    }
    if (percNumber !== null && !Number.isFinite(percNumber)) {
      setLedgerMapError('Percentage must be a number');
      return;
    }

    try {
      setLedgerMapLoading(true);
      const token = localStorage.getItem('token');
      const payload = {
        ledgerCode,
        screen,
        type,
        status: ledgerMapForm.status ? 1 : 0,
        perc: percNumber
      };

      if (ledgerMapForm.id) {
        await axios.put(`/api/ledger-map/${ledgerMapForm.id}`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        await axios.post('/api/ledger-map', payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      await fetchLedgerMaps();
      setLedgerMapForm({
        id: null,
        ledgerCode: '',
        type: 'Sale',
        screen: 'Sale',
        status: true,
        perc: ''
      });
    } catch (err) {
      console.error('Error saving ledger map:', err);
      const serverMessage = err.response?.data?.message;
      const raw = String(serverMessage ?? err.message ?? '');
      const lower = raw.toLowerCase();
      if (err.response?.status === 409 || lower.includes('duplicate') || lower.includes('unique') || lower.includes('uk_ledger_map')) {
        setLedgerMapError('Ledger mapping already exists for the selected Ledger, Type and Screen. Please edit the existing mapping.');
      } else {
        setLedgerMapError(serverMessage || 'Failed to save. Please try again.');
      }
    } finally {
      setLedgerMapLoading(false);
    }
  };

  const editLedgerMap = (row) => {
    setLedgerMapError('');
    setLedgerMapForm({
      id: row.id,
      ledgerCode: row.ledgerCode || '',
      type: row.type || 'Sale',
      screen: row.screen || 'Sale',
      status: row.status === 1 || row.status === true,
      perc: row.perc === null || row.perc === undefined ? '' : String(row.perc)
    });
  };

  const deleteLedgerMap = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this ledger map?",
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
      setLedgerMapLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/ledger-map/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchLedgerMaps();
    } catch (err) {
      console.error('Error deleting ledger map:', err);
      setLedgerMapError(err.response?.data?.message || 'Failed to delete. Please try again.');
    } finally {
      setLedgerMapLoading(false);
    }
  };

  const getLedgerNameByCode = (ledgerCode) => {
    const codeStr = String(ledgerCode ?? '').trim();
    if (!codeStr) return '';
    const ledger = ledgers.find(l => String(l.code ?? '').trim() === codeStr);
    return ledger ? ledger.name : '';
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Ledger name is required';
    }

    const percValue = String(formData.perc ?? '').trim();
    if (percValue !== '' && !Number.isFinite(Number(percValue))) {
      errors.perc = 'Percentage must be a number';
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
      const percValue = String(formData.perc ?? '').trim();
      const percNumber = percValue === '' ? 0 : Number(percValue);
      const payload = {
        ...formData,
        perc: Number.isFinite(percNumber) ? percNumber : 0,
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
      status: ledger.status === 1,
      perc: ledger.perc === null || ledger.perc === undefined ? '' : String(ledger.perc)
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
      status: true,
      perc: ''
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

  useEffect(() => {
    if (!showLedgerMapModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLedgerMapModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLedgerMapModal]);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  if (loading) return <div className="loading">Loading ledgers...</div>;

  return (
    <div className="category-list-container">
      <div className="category-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)} title="Back">
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
            style={{ marginRight: '10px', backgroundColor: '#0d6efd' }}
            onClick={openLedgerMapModal}
          >
            Ledger Map
          </button>
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
              <th>Percentage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No ledgers found</td>
              </tr>
            ) : (
              ledgers.map(ledger => (
                <tr key={ledger.id}>
                  <td>{ledger.code}</td>
                  <td>{ledger.name}</td>
                  <td>{ledger.type}</td>
                  <td>{ledger.screen}</td>
                  <td style={{ textAlign: 'right' }}>
                    {ledger.perc === null || ledger.perc === undefined || ledger.perc === ''
                      ? ''
                      : Number(ledger.perc).toFixed(2)}
                  </td>
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

      {showLedgerMapModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '1100px' }}>
            <div className="modal-header">
              <h2>Ledger Map</h2>
              <button onClick={closeLedgerMapModal} className="close-btn">×</button>
            </div>

            {ledgerMapError && (
              <div className="modal-error-message">
                {ledgerMapError}
              </div>
            )}

            <div className="category-form">
              <form onSubmit={saveLedgerMap}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="ledgerCode">Ledger Name</label>
                    <select
                      id="ledgerCode"
                      name="ledgerCode"
                      value={ledgerMapForm.ledgerCode}
                      onChange={handleLedgerMapFormChange}
                    >
                      <option value="">Select Ledger</option>
                      {[...ledgers]
                        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
                        .map(l => (
                          <option key={l.id || l.code} value={l.code}>
                            {l.name} ({l.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="type">Type</label>
                    <select
                      id="type"
                      name="type"
                      value={ledgerMapForm.type}
                      onChange={handleLedgerMapFormChange}
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
                      value={ledgerMapForm.screen}
                      onChange={handleLedgerMapFormChange}
                    >
                      {screenOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="perc">Percentage</label>
                    <input
                      type="number"
                      id="perc"
                      name="perc"
                      value={ledgerMapForm.perc}
                      onChange={handleLedgerMapFormChange}
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-actions" style={{ paddingTop: 0, borderTop: 'none', marginBottom: '18px' }}>
                  <label className="checkbox-label" style={{ marginRight: 'auto' }}>
                    <input
                      type="checkbox"
                      name="status"
                      checked={ledgerMapForm.status}
                      onChange={handleLedgerMapFormChange}
                    />
                    Active Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setLedgerMapForm({ id: null, ledgerCode: '', type: 'Sale', screen: 'Sale', status: true, perc: '' })}
                    className="cancel-btn"
                    disabled={ledgerMapLoading}
                  >
                    Clear
                  </button>
                  <button type="submit" className="save-btn" disabled={ledgerMapLoading}>
                    {ledgerMapForm.id ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ marginBottom: '6px' }}>Screen</label>
                  <select value={ledgerMapFilterScreen} onChange={(e) => setLedgerMapFilterScreen(e.target.value)}>
                    <option value="All">All</option>
                    {screenOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ marginBottom: '6px' }}>Type</label>
                  <select value={ledgerMapFilterType} onChange={(e) => setLedgerMapFilterType(e.target.value)}>
                    <option value="All">All</option>
                    {typeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-container" style={{ maxHeight: '50vh' }}>
                <table className="category-table">
                  <thead>
                    <tr>
                      <th>Ledger Name</th>
                      <th>Type</th>
                      <th>Screen</th>
                      <th>Percentage</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledgerMaps || [])
                      .filter(r => {
                        const matchType = ledgerMapFilterType === 'All' || r.type === ledgerMapFilterType;
                        const matchScreen = ledgerMapFilterScreen === 'All' || r.screen === ledgerMapFilterScreen;
                        return matchType && matchScreen;
                      })
                      .sort((a, b) => {
                        const an = getLedgerNameByCode(a.ledgerCode) || String(a.ledgerCode ?? '');
                        const bn = getLedgerNameByCode(b.ledgerCode) || String(b.ledgerCode ?? '');
                        return an.localeCompare(bn);
                      })
                      .map(r => (
                        <tr key={r.id}>
                          <td>{getLedgerNameByCode(r.ledgerCode) || r.ledgerCode}</td>
                          <td>{r.type}</td>
                          <td>{r.screen}</td>
                          <td style={{ textAlign: 'right' }}>
                            {r.perc === null || r.perc === undefined || r.perc === ''
                              ? ''
                              : Number(r.perc).toFixed(2)}
                          </td>
                          <td>
                            <span className={`status ${r.status === 1 ? 'active' : 'inactive'}`}>
                              {r.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="actions">
                            <button className="edit-btn" onClick={() => editLedgerMap(r)}>Edit</button>
                            <button className="delete-btn" onClick={() => deleteLedgerMap(r.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    {!ledgerMapLoading && (!ledgerMaps || ledgerMaps.length === 0) && (
                      <tr>
                        <td colSpan="6" className="no-data">No ledger maps found</td>
                      </tr>
                    )}
                    {ledgerMapLoading && (
                      <tr>
                        <td colSpan="6" className="no-data">Loading...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <label htmlFor="perc">Percentage</label>
                    <input
                      type="number"
                      id="perc"
                      name="perc"
                      value={formData.perc}
                      onChange={handleInputChange}
                      className={validationErrors.perc ? 'error' : ''}
                      placeholder="0"
                      step="0.01"
                    />
                    {validationErrors.perc && (
                      <span className="error-message">{validationErrors.perc}</span>
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
