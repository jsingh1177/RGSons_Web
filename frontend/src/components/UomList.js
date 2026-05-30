import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './SizeList.css';

const UomList = () => {
  const navigate = useNavigate();
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUom, setEditingUom] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({ code: '', name: '', status: true });

  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'UOM name is required';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'UOM name must not exceed 200 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchUoms = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/uoms', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        setUoms(response.data.uoms || []);
        setError('');
      } else {
        setError(response.data?.message || 'Failed to fetch UOMs');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch UOMs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let response;
      if (editingUom) {
        response = await axios.put(`/api/uoms/${editingUom.id}`, formData, config);
      } else {
        response = await axios.post('/api/uoms', formData, config);
      }

      const isSuccess = response.data?.success === true || (response.data?.id && !response.data?.success);
      if (isSuccess || response.status === 200 || response.status === 201) {
        setShowModal(false);
        setEditingUom(null);
        setFormData({ code: '', name: '', status: true });
        setValidationErrors({});
        setModalError('');
        fetchUoms();
      } else {
        setModalError(response.data?.message || 'Operation failed');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setModalError(err.response?.data?.message || 'Failed to save UOM. Please try again.');
      }
    }
  };

  const handleDelete = async (uomId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this UOM?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/uoms/${uomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204 || response.data?.success) {
        fetchUoms();
        Swal.fire('Deleted!', 'UOM has been deleted.', 'success');
      } else {
        Swal.fire('Error', response.data?.message || 'Failed to delete UOM', 'error');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete UOM. Please try again.', 'error');
      }
    }
  };

  const handleEdit = (uom) => {
    setEditingUom(uom);
    setFormData({ code: uom.code, name: uom.name, status: uom.status });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUom(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUom(null);
    setFormData({ code: '', name: '', status: true });
    setValidationErrors({});
    setModalError('');
  };

  useEffect(() => {
    fetchUoms();
  }, [fetchUoms]);

  if (loading) {
    return <div className="loading">Loading UOMs...</div>;
  }

  return (
    <div className="size-list-container">
      <div className="size-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)} title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Unit Master (UOM)</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New UOM
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
            {uoms.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">No UOMs found</td>
              </tr>
            ) : (
              uoms.map((uom) => (
                <tr key={uom.id}>
                  <td>{uom.code}</td>
                  <td>{uom.name}</td>
                  <td>
                    <span className={`status ${uom.status ? 'active' : 'inactive'}`}>
                      {uom.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="edit-btn" onClick={() => handleEdit(uom)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(uom.id)}>Delete</button>
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
              <h2>{editingUom ? 'Edit UOM' : 'Add New UOM'}</h2>
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
                    <label htmlFor="code">UOM Code</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="Auto-generated"
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="name">UOM Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={validationErrors.name ? 'error' : ''}
                      placeholder="Enter unit name (e.g., ML, LTR, PCS)"
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
                        checked={!!formData.status}
                        onChange={handleInputChange}
                      />
                      Active Status
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="cancel-btn">Cancel</button>
                  <button type="submit" className="save-btn">{editingUom ? 'Update UOM' : 'Add UOM'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UomList;

