import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StoreDashboard from './components/StoreDashboard';
import StoreList from './components/StoreList';
import CategoryList from './components/CategoryList';
import BrandList from './components/BrandList';
import SizeList from './components/SizeList';
import ItemList from './components/ItemList';
import InventoryList from './components/InventoryList';
import PartyList from './components/PartyList';
import LedgerList from './components/LedgerList';
import PriceManagement from './components/PriceManagement';
import Sales from './components/Sales';
import SalesEntry from './components/SalesEntry';
import Settings from './components/Settings';
import SizeOrder from './components/SizeOrder';
import DailySaleReport from './components/DailySaleReport';
import StoreOperations from './components/StoreOperations';
import HODashboard from './components/HODashboard';
import HOReportsDashboard from './components/HOReportsDashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(token !== null);
      setIsLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes to update auth state
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const getRedirectPath = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.storeType === 'HO' || user.role === 'HO USER' || user.role === 'HO_USER') {
      return '/ho-dashboard';
    }
    if (['USER', 'STORE USER'].includes(user.role)) {
      return '/store-dashboard';
    }
    return '/dashboard';
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to={getRedirectPath()} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ho-dashboard" 
            element={isAuthenticated ? <HODashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ho-reports" 
            element={isAuthenticated ? <HOReportsDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store-dashboard" 
            element={isAuthenticated ? <StoreDashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/store-operations" 
            element={isAuthenticated ? <StoreOperations /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales" 
            element={isAuthenticated ? <Sales /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales-entry" 
            element={isAuthenticated ? <SalesEntry /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/stores" 
            element={isAuthenticated ? <StoreList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/categories" 
            element={isAuthenticated ? <CategoryList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/brands" 
            element={isAuthenticated ? <BrandList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sizes" 
            element={isAuthenticated ? <SizeList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/items" 
            element={isAuthenticated ? <ItemList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/inventory" 
            element={isAuthenticated ? <InventoryList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/parties" 
            element={isAuthenticated ? <PartyList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/price-management" 
            element={isAuthenticated ? <PriceManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/settings" 
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/size-order" 
            element={isAuthenticated ? <SizeOrder /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/dsr" 
            element={isAuthenticated ? <DailySaleReport /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ledgers" 
            element={isAuthenticated ? <LedgerList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/"  
            element={<Navigate to={isAuthenticated ? getRedirectPath() : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
