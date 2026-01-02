import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
            <div className="feature-card" onClick={() => navigate('/stores')}>
              <h3>Store Management</h3>
              <p>Manage store information and operations</p>
              <button className="feature-btn">View Stores</button>
            </div>
            
            <div className="feature-card" onClick={() => navigate('/categories')}>
              <h3>Category Management</h3>
              <p>Manage product categories and classifications</p>
              <button className="feature-btn">View Categories</button>
            </div>
            
            <div className="feature-card" onClick={() => navigate('/brands')}>
              <h3>Brand Management</h3>
              <p>Manage product brands and manufacturers</p>
              <button className="feature-btn">View Brands</button>
            </div>

            <div className="feature-card" onClick={() => navigate('/sizes')}>
              <h3>Size Management</h3>
              <p>Manage card sizes and dimensions</p>
              <button className="feature-btn">View Sizes</button>
            </div>

            <div className="feature-card" onClick={() => navigate('/items')}>
              <h3>Item Management</h3>
              <p>Manage items and pricing</p>
              <button className="feature-btn">View Items</button>
            </div>

            <div className="feature-card" onClick={() => navigate('/price-management')}>
              <h3>Price Management</h3>
              <p>Manage purchase price and MRP by size</p>
              <button className="feature-btn">View Prices</button>
            </div>

            <div className="feature-card" onClick={() => navigate('/parties')}>
              <h3>Party Management</h3>
              <p>Manage parties and suppliers</p>
              <button className="feature-btn">View Parties</button>
            </div>

            
            <div className="feature-card">
              <h3>User Management</h3>
              <p>Handle user accounts and permissions</p>
            </div>
            
            <div className="feature-card">
              <h3>Reports</h3>
              <p>View and generate business reports</p>
            </div>
            
            <div className="feature-card" onClick={() => navigate('/settings')}>
              <h3>Settings</h3>
              <p>Configure system settings</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
