import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HODashboard.css';

const WarehouseDashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="ho-dashboard-container">
      <header className="ho-dashboard-header">
        <div className="header-left">
          <h1>Warehouse Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="user-welcome">Welcome, {user.userName || 'User'}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="ho-dashboard-content">
        <div className="ho-menu-grid">
          <button className="ho-menu-btn" onClick={() => navigate('/purchase-entry')}>
            <div className="icon">🛒</div>
            <span>Purchase</span>
          </button>

          <button className="ho-menu-btn" onClick={() => navigate('/sales-entry')}>
            <div className="icon">💳</div>
            <span>Sale Voucher</span>
          </button>

          <button className="ho-menu-btn" onClick={() => navigate('/debit-note-entry')}>
            <div className="icon">📝</div>
            <span>Debit Note</span>
          </button>

          <button className="ho-menu-btn" onClick={() => navigate('/stock-transfer-out')}>
            <div className="icon">📤</div>
            <span>Stock Transfer</span>
          </button>

          <button className="ho-menu-btn" onClick={() => navigate('/ho-reports')}>
            <div className="icon">📊</div>
            <span>Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDashboard;
