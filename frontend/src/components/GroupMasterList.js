import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './PartyList.css';

const GroupMasterList = () => {
  const navigate = useNavigate();
  const [groupMasters, setGroupMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGroupMaster, setEditingGroupMaster] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    groupCode: '',
    status: true
  });

  const groupByCode = useMemo(() => {
    const map = new Map();
    (groupMasters || []).forEach((g) => {
      if (g?.code) map.set(String(g.code), g);
    });
    return map;
  }, [groupMasters]);

  const parentGroupOptions = useMemo(() => {
    const selfCode = String(formData.code || '');
    return (groupMasters || [])
      .filter((g) => g && g.code)
      .filter((g) => String(g.code) !== selfCode)
      .filter((g) => g.status === true)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [formData.code, groupMasters]);

  const fetchGroupMasters = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/group-masters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setGroupMasters(response.data.groupMasters || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch accounting groups');
      }
    } catch (err) {
      console.error('Error fetching accounting groups:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch accounting groups. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchGroupMasters();
  }, [fetchGroupMasters]);

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
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const url = editingGroupMaster
        ? `/api/group-masters/${editingGroupMaster.id}`
        : '/api/group-masters';

      const method = editingGroupMaster ? 'put' : 'post';

      const response = await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        closeModal();
        fetchGroupMasters();
      } else {
        setModalError(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving accounting group:', err);
      setModalError(err.response?.data?.message || 'Failed to save accounting group. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this accounting group?',
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
      const response = await axios.delete(`/api/group-masters/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        fetchGroupMasters();
        Swal.fire('Deleted!', 'Accounting group has been deleted.', 'success');
      } else {
        Swal.fire('Error', response.data.message || 'Failed to delete accounting group', 'error');
      }
    } catch (err) {
      console.error('Error deleting accounting group:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete accounting group. Please try again.', 'error');
      }
    }
  };

  const handleEdit = (groupMaster) => {
    setEditingGroupMaster(groupMaster);
    setFormData({
      code: groupMaster.code || '',
      name: groupMaster.name || '',
      groupCode: groupMaster.groupCode || '',
      status: groupMaster.status !== undefined ? groupMaster.status : true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingGroupMaster(null);
    setFormData({
      code: '',
      name: '',
      groupCode: '',
      status: true
    });
    setValidationErrors({});
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGroupMaster(null);
    setValidationErrors({});
    setModalError('');
  };

  if (loading) {
    return <div className="loading">Loading accounting groups...</div>;
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
          <h1>Accounting Groups</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={handleAdd}>
            Add New Group
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
              <th>Parent Group</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupMasters.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">No groups found</td>
              </tr>
            ) : (
              groupMasters.map((groupMaster) => (
                <tr key={groupMaster.id}>
                  <td>{groupMaster.code}</td>
                  <td>{groupMaster.name}</td>
                  <td>{groupMaster.groupCode ? (groupByCode.get(String(groupMaster.groupCode))?.name || groupMaster.groupCode) : ''}</td>
                  <td>
                    <span className={`status-badge ${groupMaster.status ? 'active' : 'inactive'}`}>
                      {groupMaster.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(groupMaster)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(groupMaster.id)}
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
              <h2>{editingGroupMaster ? 'Edit Group' : 'Add New Group'}</h2>
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
                      placeholder="Enter group name"
                      maxLength="200"
                    />
                    {validationErrors.name && (
                      <span className="error-message">{validationErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="groupCode">Parent Group</label>
                    <select
                      id="groupCode"
                      name="groupCode"
                      value={formData.groupCode}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">Optional</option>
                      {parentGroupOptions.map((g) => (
                        <option key={g.code} value={g.code}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
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
                    {editingGroupMaster ? 'Update Group' : 'Add Group'}
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

export default GroupMasterList;
