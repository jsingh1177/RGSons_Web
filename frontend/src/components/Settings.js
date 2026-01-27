import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-container">
      <header className="settings-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>Settings</h1>
        </div>
      </header>

      <div className="settings-menu-bar">
        <button className="menu-btn" onClick={() => navigate('/ledgers')}>
          Ledgers
        </button>
        <button className="menu-btn" onClick={() => navigate('/size-order')}>
          Size Order
        </button>
        <button className="menu-btn" onClick={() => navigate('/voucher-config')}>
          Voucher Configuration
        </button>
      </div>

      <div className="settings-content">
        <p>Select an option from the menu above.</p>
      </div>
    </div>
  );
};

export default Settings;
