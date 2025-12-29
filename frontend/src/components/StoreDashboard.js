import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StoreDashboard.css';

const StoreDashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        if (!user.userName) {
          setError('User information not found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/stores/by-user/${user.userName}`);
        if (response.data.success) {
          setStores(response.data.stores || []);
        } else {
          setError(response.data.message || 'Failed to fetch stores');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stores:', err);
        setError('Failed to load store information. Please try again later.');
        setLoading(false);
      }
    };

    fetchStores();
  }, [user.userName]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  if (loading) {
    return <div className="loading-container">Loading store information...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Store Dashboard</h1>
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
          <div className="welcome-card">
            <h2>Store Management Portal</h2>

            {stores.length > 0 && (
              <>
                <div className="portal-header-store-info">
                   <div className="info-item">
                      <span className="label">Store Code</span>
                      <span className="value">{stores[0].storeCode}</span>
                   </div>
                   <div className="info-item">
                      <span className="label">Store Name</span>
                      <span className="value">{stores[0].storeName}</span>
                   </div>
                   <div className="info-item">
                      <span className="label">Address</span>
                      <span className="value">{stores[0].address || 'N/A'}</span>
                   </div>
                </div>

                <div className="dashboard-actions">
                  <button className="action-button stock-in" onClick={() => alert('Functionality Under developement. Coming Soon...')}>
                    Stock In
                  </button>
                  <button className="action-button stock-out" onClick={() => alert('Functionality Under developement. Coming Soon...')}>
                    Stock Out
                  </button>
                  <button className="action-button sales" onClick={() => navigate('/sales-entry')}>
                    Sales
                  </button>
                </div>
              </>
            )}
            
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="store-details-container">
            {stores.length === 0 && !error && (
               <div className="welcome-card">
                  <p>No stores are currently mapped to your account. Please contact the administrator.</p>
               </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreDashboard;
