import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ArrowLeft } from 'lucide-react';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  
  const [formData, setFormData] = useState({
    userName: '',
    password: '',
    role: 'USER',
    status: true,
    storeCode: '',
    mobile: '',
    email: ''
  });

  const roles = ['SUPPER', 'ADMIN', 'HO USER', 'STORE USER', 'USER'];

  useEffect(() => {
    fetchUsers();
    fetchStores();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users');
      console.log('Users response:', response.data);
      if (response.data && response.data.success) {
        setUsers(response.data.users || []);
      } else {
        setUsers([]);
        console.warn('Failed to fetch users or invalid response format');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('Error', 'Failed to fetch users', 'error');
      setUsers([]);
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get('/api/stores');
      console.log('Stores response:', response.data);
      if (response.data && response.data.success) {
        setStores(response.data.stores || []);
      } else {
        setStores([]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      userName: '',
      password: '',
      role: 'USER',
      status: true,
      storeCode: '',
      mobile: '',
      email: ''
    });
    setShowModal(true);
  };

  const openEditModal = async (user) => {
    setModalMode('edit');
    setCurrentUser(user);
    
    let storeCode = '';
    if (user.role === 'STORE USER' || user.role === 'HO USER') {
        try {
            const response = await axios.get(`/api/stores/by-user/${user.userName}`);
            if (response.data.success && response.data.stores && response.data.stores.length > 0) {
                storeCode = response.data.stores[0].storeCode;
            }
        } catch (error) {
            console.error("Could not fetch store mapping", error);
        }
    }

    setFormData({
      userName: user.userName,
      password: '', // Leave empty for no change
      role: user.role,
      status: user.status,
      storeCode: storeCode,
      mobile: user.mobile || '',
      email: user.email || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'add') {
        // Validation
        if (!formData.userName || !formData.password || !formData.role || !formData.mobile || !formData.email) {
          Swal.fire('Error', 'Please fill in all required fields', 'error');
          return;
        }

        if (formData.role === 'STORE USER' && !formData.storeCode) {
           Swal.fire('Error', 'Please select a store for Store User', 'error');
           return;
        }

        // Register User
        const registerResponse = await axios.post('/api/auth/register', {
          userName: formData.userName,
          password: formData.password,
          role: formData.role,
          status: formData.status,
          mobile: formData.mobile,
          email: formData.email
        });

        if (registerResponse.data.success) {
          // If Store User, map to store
          if ((formData.role === 'STORE USER' || formData.role === 'HO USER') && formData.storeCode) {
            await axios.post('/api/stores/map-user', {
              userName: formData.userName,
              storeCode: formData.storeCode
            });
          }
          
          Swal.fire('Success', 'User created successfully', 'success');
          fetchUsers();
          setShowModal(false);
        }
      } else {
        // Edit Mode
        // Validation
        if (!formData.userName || !formData.role || !formData.mobile || !formData.email) {
          Swal.fire('Error', 'Please fill in all required fields', 'error');
          return;
        }

        if (formData.mobile.length < 10 || formData.mobile.length > 15) {
            Swal.fire('Error', 'Mobile number must be between 10 and 15 digits', 'error');
            return;
        }

        if ((formData.role === 'STORE USER' || formData.role === 'HO USER') && !formData.storeCode) {
           Swal.fire('Error', 'Please select a store for Store/HO User', 'error');
           return;
        }

        const updateData = {
          userName: formData.userName,
          role: formData.role,
          status: formData.status,
          mobile: formData.mobile,
          email: formData.email
        };
        
        // Only include password if provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        const updateResponse = await axios.put(`/api/auth/users/${currentUser.id}`, updateData);
        
        if (updateResponse.data.success) {
             // If Store User, update mapping
             if ((formData.role === 'STORE USER' || formData.role === 'HO USER') && formData.storeCode) {
                await axios.post('/api/stores/map-user', {
                  userName: formData.userName,
                  storeCode: formData.storeCode
                });
              }

          Swal.fire('Success', 'User updated successfully', 'success');
          fetchUsers();
          setShowModal(false);
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      
      let errorMessage = 'Failed to save user';
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
        } else {
            errorMessage = `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        // Log detailed error info for debugging
        console.error('Error config:', error.config);
        if (error.toJSON) {
            console.error('Error JSON:', error.toJSON());
        }
        errorMessage = 'Network Error: No response from server. Please check your connection and ensure backend is running.';
      } else {
        errorMessage = error.message;
      }

      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleResetPassword = async (user) => {
    // Check for required fields to avoid backend validation errors
    if (!user.mobile || user.mobile.length < 10 || !user.email) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete User Details',
        text: 'User must have valid Mobile (min 10 chars) and Email to reset password. Please edit the user details first.'
      });
      return;
    }

    if (!user.userName || user.userName.length < 3) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Username',
            text: 'User must have a valid Username (min 3 chars) to reset password. Please edit the user details first.'
        });
        return;
    }

    const result = await Swal.fire({
      title: 'Reset Password?',
      text: "This will set the password to 'pass@123'",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!'
    });

    if (result.isConfirmed) {
      try {
        const updateData = {
          userName: user.userName,
          role: user.role,
          status: user.status,
          mobile: user.mobile,
          email: user.email,
          password: 'pass@123'
        };

        const response = await axios.put(`/api/auth/users/${user.id}`, updateData);
        
        if (response.data.success) {
          Swal.fire('Success', 'Password has been reset to pass@123', 'success');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        
        let errorMessage = 'Failed to reset password';
        if (error.response) {
            if (error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            } else {
                errorMessage = `Server Error (${error.response.status})`;
            }
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    }
  };

  const handleDelete = async (userId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(`/api/auth/users/${userId}`);
        if (response.data.success) {
          Swal.fire('Deleted!', 'User has been deleted.', 'success');
          fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire('Error', 'Failed to delete user', 'error');
      }
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const endpoint = user.status 
        ? `/api/auth/users/${user.id}/deactivate`
        : `/api/auth/users/${user.id}/activate`;
      
      const response = await axios.put(endpoint);
      if (response.data.success) {
        fetchUsers();
        Swal.fire('Success', `User ${user.status ? 'deactivated' : 'activated'} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire('Error', 'Failed to update user status', 'error');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h1>User Management</h1>
        </div>
        <div className="header-buttons">
          <button className="add-btn" onClick={openAddModal}>
            Add New User
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.length > 0 ? (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.userName}</td>
                  <td>{user.role}</td>
                  <td>{user.mobile}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`status-badge ${user.status ? 'status-active' : 'status-inactive'}`}>
                      {user.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="user-action-buttons">
                      <button className="edit-btn" onClick={() => openEditModal(user)}>Edit</button>
                      <button 
                        className={`activate-btn ${user.status ? 'deactivate' : 'activate'}`}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="reset-btn" onClick={() => handleResetPassword(user)}>Reset Pass</button>
                      <button className="delete-btn" onClick={() => handleDelete(user.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'Add New User' : 'Edit User'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">×</button>
            </div>
            
            <div className="user-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleInputChange}
                      required
                      disabled={modalMode === 'edit'} 
                    />
                  </div>

                  <div className="form-group">
                    <label>Password {modalMode === 'edit' && '(Leave blank to keep current)'}</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={modalMode === 'add'}
                    />
                  </div>

                  <div className="form-group">
                    <label>Mobile</label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {(formData.role === 'STORE USER' || formData.role === 'HO USER') && (
                    <div className="form-group">
                      <label>Assign Store</label>
                      <select
                        name="storeCode"
                        value={formData.storeCode}
                        onChange={handleInputChange}
                        required={formData.role === 'STORE USER'}
                      >
                        <option value="">Select a Store</option>
                        {Array.isArray(stores) && stores.map(store => (
                          <option key={store.id} value={store.storeCode}>
                            {store.storeName} ({store.storeCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="save-btn">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
