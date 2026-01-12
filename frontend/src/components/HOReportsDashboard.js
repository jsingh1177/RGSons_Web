import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './HOReportsDashboard.css';

const HOReportsDashboard = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select both start and end dates'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [storeResponse, categoryResponse] = await Promise.all([
        axios.get(`/api/reports/sales/store-wise`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/reports/sales/category-wise`, {
          params: { startDate, endDate },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setReportData(storeResponse.data);
      setCategoryData(categoryResponse.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch report data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchReportData();
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="ho-reports-container">
      <div className="reports-header">
        <h2>HO Reports Dashboard</h2>
        <button className="back-btn" onClick={() => navigate('/ho-dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="filter-section">
        <div className="date-input-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="date-input-group">
          <label htmlFor="endDate">End Date</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      <div className="charts-container">
        <div className="chart-section">
          <div className="chart-title">Store Wise Total Sales</div>
          {reportData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reportData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="storeName" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalSales" name="Total Sales" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data available for the selected period</div>
          )}
        </div>

        <div className="chart-section">
          <div className="chart-title">Category Wise Amount Analysis</div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoryName" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalSales" name="Total Sales" fill="#2ecc71" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No data available for the selected period</div>
          )}
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Store Code</th>
                <th>Store Name</th>
                <th className="amount-column">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item) => (
                <tr key={item.storeCode}>
                  <td>{item.storeCode}</td>
                  <td>{item.storeName}</td>
                  <td className="amount-column">{formatCurrency(item.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HOReportsDashboard;
