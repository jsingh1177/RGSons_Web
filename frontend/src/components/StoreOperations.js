import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './StoreOperations.css';

const StoreOperations = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessDate, setBusinessDate] = useState('');
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [dsrStatus, setDsrStatus] = useState('PENDING');

  // Helper to parse dd-MM-yyyy or YYYY-MM-DD to YYYY-MM-DD
  const parseSavedDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr; // Already ISO
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Assuming dd-MM-yyyy
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const isoDate = parseSavedDate(dateString);
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getNextDay = (dateString) => {
    if (!dateString) return '';
    const isoDate = parseSavedDate(dateString);
    const date = new Date(isoDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchStores = async () => {
      try {
        if (!user.userName) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`/api/stores/by-user/${user.userName}`);
        if (response.data.success && response.data.stores) {
          setStores(response.data.stores);
          
          // Initialize business date for opening if needed
          const store = response.data.stores[0];
          if (store && !store.openStatus) {
            let nextDate;
            if (store.businessDate) {
              const isoDate = parseSavedDate(store.businessDate);
              const current = new Date(isoDate);
              current.setDate(current.getDate() + 1);
              nextDate = current.toISOString().split('T')[0];
            } else {
              nextDate = new Date().toISOString().split('T')[0];
            }
            setBusinessDate(nextDate);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stores:', err);
        Swal.fire('Error', 'Failed to load store information.', 'error');
        setLoading(false);
      }
    };

    fetchStores();
  }, [user.userName, navigate]);

  useEffect(() => {
    const fetchDsrStatus = async () => {
      if (stores.length > 0 && stores[0].openStatus && stores[0].businessDate) {
        try {
            // Ensure date is in dd-MM-yyyy format for API
            let dateToSend = stores[0].businessDate;
            if (dateToSend.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = dateToSend.split('-');
                dateToSend = `${d}-${m}-${y}`;
            }
            
            const response = await axios.get(`/api/dsr/status?store=${stores[0].storeCode}&date=${dateToSend}`);
            setDsrStatus(response.data || 'PENDING');
        } catch (err) {
            console.error('Error fetching DSR status:', err);
        }
      }
    };
    
    fetchDsrStatus();
  }, [stores]);

  const handleOpenStore = async () => {
    const store = stores[0];
    
    // Convert previous business date to comparable ISO format (YYYY-MM-DD)
    const prevBusinessDateIso = store.businessDate ? parseSavedDate(store.businessDate) : '';

    // 1. Strict Validation: New business date must be > previous business date
    if (prevBusinessDateIso && businessDate <= prevBusinessDateIso) {
      Swal.fire('Error', 'New business date must be strictly greater than the previous business date.', 'error');
      return;
    }

    // 2. Future Date Validation
    const today = new Date().toISOString().split('T')[0];
    if (businessDate > today) {
      Swal.fire('Error', 'Business date cannot be in the future.', 'error');
      return;
    }

    // 3. System Date Mismatch Warning
    if (businessDate !== today) {
        const result = await Swal.fire({
            title: 'Date Mismatch',
            text: `The selected business date (${formatDate(businessDate)}) is different from the system date (${formatDate(today)}). Do you want to proceed?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'No, cancel'
        });

        if (!result.isConfirmed) {
            return;
        }
    }

    try {
      setOperationsLoading(true);
      
      // Convert YYYY-MM-DD to dd-MM-yyyy for saving
      const [year, month, day] = businessDate.split('-');
      const formattedDate = `${day}-${month}-${year}`;

      const updatedStore = {
        ...store,
        openStatus: true,
        businessDate: formattedDate,
        currentUserId: user.id
      };

      const response = await axios.put(`/api/stores/${store.id}`, updatedStore);
      
      if (response.data) {
          // Update local state
          const newStores = [...stores];
          if (response.data.id) {
              newStores[0] = response.data;
          } else if (response.data.store) {
              newStores[0] = response.data.store;
          } else {
              newStores[0] = updatedStore;
          }
          setStores(newStores);
          Swal.fire('Success', 'Store Opened Successfully!', 'success').then(() => {
              navigate('/store-dashboard');
          });
       }
     } catch (err) {
       console.error('Error opening store:', err);
       Swal.fire('Error', 'Failed to open store: ' + (err.response?.data?.message || err.message), 'error');
     } finally {
       setOperationsLoading(false);
     }
  };

  const handleCloseStore = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to CLOSE the store?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, close it!'
    });

    if (!result.isConfirmed) {
      return;
    }
    try {
      setOperationsLoading(true);
      const store = stores[0];
      
      const updatedStore = {
        ...store,
        openStatus: false
      };

      const response = await axios.put(`/api/stores/${store.id}`, updatedStore);
      
      if (response.data) {
          const newStores = [...stores];
          if (response.data.id) {
              newStores[0] = response.data;
          } else if (response.data.store) {
              newStores[0] = response.data.store;
          } else {
              newStores[0] = updatedStore;
          }
          setStores(newStores);
          Swal.fire('Success', 'Store Closed Successfully!', 'success').then(() => {
              navigate('/store-dashboard');
          });
       }
     } catch (err) {
       console.error('Error closing store:', err);
       Swal.fire('Error', 'Failed to close store: ' + (err.response?.data?.message || err.message), 'error');
     } finally {
       setOperationsLoading(false);
     }
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (stores.length === 0) {
    return <div className="store-operations-container">No store found.</div>;
  }

  const store = stores[0];

  return (
    <div className="store-operations-container">
      <div className="store-operations-header">
        <h2>Store Operations</h2>
      </div>

      <div className="store-operations-content">
        {store.openStatus ? (
          <>
            <p>Current Business Date: {formatDate(store.businessDate)}</p>
            <p>Store is currently <strong>OPEN</strong>.</p>
            <p>Do you want to CLOSE the store?</p>
            
            <div className="store-operations-actions">
              <button 
                onClick={() => navigate('/dsr')} 
                disabled={dsrStatus === 'SUBMITTED'}
                className="op-btn op-btn-dsr"
                title={dsrStatus === 'SUBMITTED' ? 'DSR is already submitted' : ''}
                style={dsrStatus === 'SUBMITTED' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                Submit DSR
              </button>
              <button 
                onClick={handleCloseStore} 
                disabled={operationsLoading || dsrStatus !== 'SUBMITTED'} 
                className="op-btn op-btn-primary"
                title={dsrStatus !== 'SUBMITTED' ? 'DSR must be submitted before closing store' : ''}
                style={dsrStatus !== 'SUBMITTED' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {operationsLoading ? 'Processing...' : 'Close Store'}
              </button>
              <button onClick={() => navigate('/store-dashboard')} disabled={operationsLoading} className="op-btn op-btn-cancel">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Store is currently <strong>CLOSED</strong>.</p>
            {store.businessDate && (
              <div className="previous-date-display">
                 <label>Previous Business Date:</label>
                 <span className="date-value">{formatDate(store.businessDate)}</span>
              </div>
            )}
            <div className="date-input-group">
              <label>Business Date:</label>
              <input 
                type="date" 
                value={businessDate} 
                min={getNextDay(store.businessDate)}
                onChange={(e) => setBusinessDate(e.target.value)}
              />
            </div>
            
            <div className="store-operations-actions" style={{ marginTop: '20px' }}>
              <button onClick={handleOpenStore} disabled={operationsLoading} className="op-btn op-btn-primary">
                {operationsLoading ? 'Processing...' : 'Open Store'}
              </button>
              <button onClick={() => navigate('/store-dashboard')} disabled={operationsLoading} className="op-btn op-btn-cancel">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StoreOperations;
