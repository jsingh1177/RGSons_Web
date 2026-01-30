import React from 'react';
import { useNavigate } from 'react-router-dom';
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
                <button className="feature-btn" onClick={() => navigate('/ho-dashboard')}>HO Dashboard</button>
                <button className="feature-btn" onClick={() => navigate('/store-dashboard')}>Store Dashboard</button>
              </>
            )}

            <button className="feature-btn" onClick={() => navigate('/stores')}>Store Management</button>
            <button className="feature-btn" onClick={() => navigate('/categories')}>Category Management</button>
            <button className="feature-btn" onClick={() => navigate('/brands')}>Brand Management</button>
            <button className="feature-btn" onClick={() => navigate('/sizes')}>Size Management</button>
            <button className="feature-btn" onClick={() => navigate('/items')}>Item Management</button>
            <button className="feature-btn" onClick={() => navigate('/price-management')}>Price List</button>
            <button className="feature-btn" onClick={() => navigate('/parties')}>Party Management</button>

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
