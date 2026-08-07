import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './Dashboard.css';

const Dashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    // Update authentication state immediately
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleUpdateInventory = async () => {
    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);

    const { value: toDate, isConfirmed } = await Swal.fire({
      title: 'Update Inventory',
      text: 'Rebuild FIFO snapshot up to date',
      input: 'date',
      inputValue: yyyyMmDd,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel'
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: 'Updating...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/inventory/update-fifo-snapshot`,
        null,
        {
          params: { toDate: toDate || yyyyMmDd },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (response.data?.success) {
        const d = response.data;
        await Swal.fire({
          icon: 'success',
          title: 'Done',
          html: `
            <div style="text-align:left">
              <div><b>To Date:</b> ${String(d.toDate || '')}</div>
              <div><b>Dirty Stores:</b> ${String(d.dirtyStores ?? '')}</div>
              <div><b>Stores Processed:</b> ${String(d.storesProcessed ?? '')}</div>
              <div><b>Snapshot Rows Inserted:</b> ${String(d.snapshotRowsInserted ?? '')}</div>
              <div><b>STO Lines Updated:</b> ${String(d.stoLinesUpdated ?? '')}</div>
            </div>
          `
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data?.message || 'Update failed'
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Update failed'
      });
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>RGSons Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user.userName || 'User'}!</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="dashboard-main">
        <div className="dashboard-content">

          

          
          <div className="features-grid">
            {user.role === 'SUPPER' && (
              <>
                <button className="feature-btn" onClick={() => navigate('/closing-stock-report')}>Closing Stock - District Wise</button>
                <button className="feature-btn" onClick={handleUpdateInventory}>Update Inventory</button>
              </>
            )}

            <button className="feature-btn" onClick={() => navigate('/stores')}>Store Management</button>
            <button className="feature-btn" onClick={() => navigate('/categories')}>Category Management</button>
            <button className="feature-btn" onClick={() => navigate('/merchandise-hierarchy')}>Merchandise Hierarchy</button>
            <button className="feature-btn" onClick={() => navigate('/brands')}>Brand Management</button>
            <button className="feature-btn" onClick={() => navigate('/sizes')}>Size Management</button>
            <button className="feature-btn" onClick={() => navigate('/uoms')}>Unit Management</button>
            <button className="feature-btn" onClick={() => navigate('/items')}>Item Management</button>
            <button className="feature-btn" onClick={() => navigate('/price-management')}>Price List</button>
            <button className="feature-btn" style={{ display: 'none' }} onClick={() => navigate('/parties')}>Party Management</button>
            <button className="feature-btn" onClick={() => navigate('/led-master')}>Ledger Master</button>
            <button className="feature-btn" onClick={() => navigate('/accounting-groups')}>Accounting Group Master</button>

            {user.role === 'SUPPER' && (
              <button className="feature-btn" onClick={() => navigate('/users')}>User Management</button>
            )}
            
            <button className="feature-btn" onClick={() => navigate('/settings')}>Settings</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
