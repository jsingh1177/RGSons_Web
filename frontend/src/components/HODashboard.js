import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HODashboard.css';

const HODashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const showFeatureComingSoon = (featureName) => {
    alert(`${featureName}: Functionality coming soon...`);
  };

  return (
    <div className="ho-dashboard-container">
      <header className="ho-dashboard-header">
        <div className="header-left">
          <h1>Head Office Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="user-welcome">Welcome, {user.userName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="ho-dashboard-content">
        <div className="ho-menu-grid">
          <button className="ho-menu-btn" onClick={() => showFeatureComingSoon('Purchase')}>
            <div className="icon">🛒</div>
            <span>Purchase</span>
          </button>
          
          <button className="ho-menu-btn" onClick={() => showFeatureComingSoon('Debit Note')}>
            <div className="icon">📝</div>
            <span>Debit Note</span>
          </button>
          
          <button className="ho-menu-btn" onClick={() => showFeatureComingSoon('Stock Transfer-In')}>
            <div className="icon">📥</div>
            <span>Stock Transfer-In</span>
          </button>
          
          <button className="ho-menu-btn" onClick={() => showFeatureComingSoon('Stock Transfer-Out')}>
            <div className="icon">📤</div>
            <span>Stock Transfer-Out</span>
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

export default HODashboard;
