import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './StoreDashboard.css';

const StoreDashboard = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const storeBg = process.env.PUBLIC_URL + '/images/store-dashboard-bg.jpg';

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
    localStorage.removeItem('lastActivity');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleStoreOperations = () => {
    navigate('/store-operations');
  };

  if (loading) {
    return <div className="loading-container">Loading store information...</div>;
  }

  return (
    <div 
      className="dashboard-container store-dashboard-bg"
      style={{ backgroundImage: `url(${storeBg})` }}
    >
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
          {stores.length > 0 && (
            <div className="dashboard-actions menu-bar">
              <button className="action-button store-operations" onClick={handleStoreOperations}>
                Daily Operations
              </button>
              <button 
                className="action-button dsr" 
                onClick={() => navigate('/dsr', { state: { mode: 'view', from: '/store-dashboard' } })}
              >
                View DSR
              </button>
              <button 
                className="action-button stock-in" 
                onClick={() => navigate('/stock-transfer-in')}
                disabled={!stores[0].openStatus}
              >
                Stock In
              </button>
              <button 
                className="action-button stock-out" 
                onClick={() => navigate('/stock-transfer-out')}
                disabled={!stores[0].openStatus}
              >
                Stock Out
              </button>
              <button 
                className="action-button sales" 
                onClick={() => navigate('/sales-entry')}
                disabled={!stores[0].openStatus}
              >
                Sales
              </button>
            </div>
          )}

          <div className="welcome-card">

            {stores.length > 0 && (
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
                 <div className="info-item">
                    <span className="label">Status</span>
                    <span className={`value ${stores[0].openStatus ? 'status-open' : 'status-closed'}`}>
                        {stores[0].openStatus ? 'OPEN' : 'CLOSED'}
                    </span>
                 </div>
                 <div className="info-item">
                    <span className="label">Business Date</span>
                    <span className="value">
                        {stores[0].businessDate ? 
                            (() => {
                                const parts = stores[0].businessDate.split('-');
                                if (parts.length === 3) {
                                    const date = new Date(parts[0].match(/^\d{4}$/) ? stores[0].businessDate : `${parts[2]}-${parts[1]}-${parts[0]}`);
                                    const day = date.getDate().toString().padStart(2, '0');
                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const month = months[date.getMonth()];
                                    const year = date.getFullYear();
                                    return `${day}-${month}-${year}`;
                                }
                                return stores[0].businessDate;
                            })() 
                            : 'N/A'
                        }
                    </span>
                 </div>
              </div>
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
