import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './CategoryList.css';

const ReportsConfiguration = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('REPORT_MASTER');
  const [reportMasters, setReportMasters] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    reportName: '',
    description: '',
    query: '',
    active: true
  });

  const [filterMappings, setFilterMappings] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [filterModalError, setFilterModalError] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);
  const [filterValidationErrors, setFilterValidationErrors] = useState({});
  const [filterFormData, setFilterFormData] = useState({
    filterName: '',
    filterLabel: '',
    parameterName: '',
    type: 'TEXT',
    required: false,
    defaultValue: '',
    dropdownQuery: '',
    active: true,
    sortOrder: 0
  });

  const [columnMappings, setColumnMappings] = useState([]);
  const [columnLoading, setColumnLoading] = useState(false);
  const [columnError, setColumnError] = useState('');
  const [columnModalError, setColumnModalError] = useState('');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnValidationErrors, setColumnValidationErrors] = useState({});
  const [columnFormData, setColumnFormData] = useState({
    columnName: '',
    columnHeader: '',
    dataType: 'TEXT',
    width: '',
    visible: true,
    sortOrder: 0
  });

  const openFilterMappingForReport = (report) => {
    setSelectedReport(report || null);
    setActiveSection('FILTER_MAPPING');
  };

  const openColumnsMappingForReport = (report) => {
    setSelectedReport(report || null);
    setActiveSection('COLUMNS_MAPPING');
  };

  const filterTypeOptions = ['DATE', 'TEXT', 'NUMBER', 'DROPDOWN', 'MULTISELECT', 'SEARCHBOX'];
  const columnTypeOptions = ['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN'];

  const validateForm = () => {
    const errors = {};
    if (!String(formData.reportName || '').trim()) {
      errors.reportName = 'Report Name is required';
    }
    if (!String(formData.query || '').trim()) {
      errors.query = 'Query is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchReportMasters = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/report-masters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setReportMasters(response.data.reportMasters || []);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch reports');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to fetch reports. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchFilterMappings = useCallback(async () => {
    const reportId = selectedReport?.id;
    if (!reportId) {
      setFilterMappings([]);
      setFilterError('');
      return;
    }

    try {
      setFilterLoading(true);
      setFilterError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/report-filter-mappings?reportId=${encodeURIComponent(reportId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setFilterMappings(response.data.reportFilterMappings || []);
      } else {
        setFilterError(response.data.message || 'Failed to fetch filter mappings');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setFilterError('Failed to fetch filter mappings. Please try again.');
      }
    } finally {
      setFilterLoading(false);
    }
  }, [navigate, selectedReport]);

  const fetchColumnMappings = useCallback(async () => {
    const reportId = selectedReport?.id;
    if (!reportId) {
      setColumnMappings([]);
      setColumnError('');
      return;
    }

    try {
      setColumnLoading(true);
      setColumnError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/report-column-mappings?reportId=${encodeURIComponent(reportId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setColumnMappings(response.data.reportColumnMappings || []);
      } else {
        setColumnError(response.data.message || 'Failed to fetch column mappings');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setColumnError('Failed to fetch column mappings. Please try again.');
      }
    } finally {
      setColumnLoading(false);
    }
  }, [navigate, selectedReport]);

  useEffect(() => {
    if (activeSection === 'REPORT_MASTER') {
      fetchReportMasters();
    }
  }, [fetchReportMasters, activeSection]);

  useEffect(() => {
    if (activeSection === 'FILTER_MAPPING') {
      fetchFilterMappings();
    }
  }, [activeSection, fetchFilterMappings]);

  useEffect(() => {
    if (activeSection === 'COLUMNS_MAPPING') {
      fetchColumnMappings();
    }
  }, [activeSection, fetchColumnMappings]);

  const validateFilterForm = () => {
    const errors = {};
    if (!String(filterFormData.filterName || '').trim()) {
      errors.filterName = 'Filter Name is required';
    }
    if (!String(filterFormData.parameterName || '').trim()) {
      errors.parameterName = 'Parameter Name is required';
    }
    if (!String(filterFormData.type || '').trim()) {
      errors.type = 'Type is required';
    }
    const sortOrderRaw = String(filterFormData.sortOrder ?? '').trim();
    if (sortOrderRaw !== '' && !Number.isFinite(Number(sortOrderRaw))) {
      errors.sortOrder = 'Sort Order must be a number';
    }
    setFilterValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateColumnForm = () => {
    const errors = {};
    if (!String(columnFormData.columnName || '').trim()) {
      errors.columnName = 'Column Name is required';
    }
    if (!String(columnFormData.dataType || '').trim()) {
      errors.dataType = 'Data Type is required';
    }
    const sortOrderRaw = String(columnFormData.sortOrder ?? '').trim();
    if (sortOrderRaw !== '' && !Number.isFinite(Number(sortOrderRaw))) {
      errors.sortOrder = 'Sort Order must be a number';
    }
    const widthRaw = String(columnFormData.width ?? '').trim();
    if (widthRaw !== '' && !Number.isFinite(Number(widthRaw))) {
      errors.width = 'Width must be a number';
    }
    setColumnValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = () => {
    setEditingReport(null);
    setModalError('');
    setValidationErrors({});
    setFormData({
      reportName: '',
      description: '',
      query: '',
      active: true
    });
    setShowModal(true);
  };

  const handleAddFilter = () => {
    setEditingFilter(null);
    setFilterModalError('');
    setFilterValidationErrors({});
    setFilterFormData({
      filterName: '',
      filterLabel: '',
      parameterName: '',
      type: 'TEXT',
      required: false,
      defaultValue: '',
      dropdownQuery: '',
      active: true,
      sortOrder: 0
    });
    setShowFilterModal(true);
  };

  const handleAddColumn = () => {
    setEditingColumn(null);
    setColumnModalError('');
    setColumnValidationErrors({});
    setColumnFormData({
      columnName: '',
      columnHeader: '',
      dataType: 'TEXT',
      width: '',
      visible: true,
      sortOrder: 0
    });
    setShowColumnModal(true);
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setModalError('');
    setValidationErrors({});
    setFormData({
      reportName: report.reportName || '',
      description: report.description || '',
      query: report.query || '',
      active: report.active === true || report.active === 1
    });
    setShowModal(true);
  };

  const handleEditFilter = (row) => {
    setEditingFilter(row);
    setFilterModalError('');
    setFilterValidationErrors({});
    setFilterFormData({
      filterName: row.filterName || '',
      filterLabel: row.filterLabel || '',
      parameterName: row.parameterName || '',
      type: row.type || 'TEXT',
      required: row.required === true || row.required === 1,
      defaultValue: row.defaultValue || '',
      dropdownQuery: row.dropdownQuery || '',
      active: row.active === undefined || row.active === null ? true : (row.active === true || row.active === 1),
      sortOrder: row.sortOrder ?? 0
    });
    setShowFilterModal(true);
  };

  const handleEditColumn = (row) => {
    setEditingColumn(row);
    setColumnModalError('');
    setColumnValidationErrors({});
    setColumnFormData({
      columnName: row.columnName || '',
      columnHeader: row.columnHeader || '',
      dataType: row.dataType || 'TEXT',
      width: row.width === undefined || row.width === null ? '' : row.width,
      visible: row.visible === undefined || row.visible === null ? true : (row.visible === true || row.visible === 1),
      sortOrder: row.sortOrder ?? 0
    });
    setShowColumnModal(true);
  };

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingReport(null);
    setModalError('');
    setValidationErrors({});
  }, []);

  const closeFilterModal = useCallback(() => {
    setShowFilterModal(false);
    setEditingFilter(null);
    setFilterModalError('');
    setFilterValidationErrors({});
  }, []);

  const closeColumnModal = useCallback(() => {
    setShowColumnModal(false);
    setEditingColumn(null);
    setColumnModalError('');
    setColumnValidationErrors({});
  }, []);

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showModal, closeModal]);

  useEffect(() => {
    if (!showFilterModal) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFilterModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showFilterModal, closeFilterModal]);

  useEffect(() => {
    if (!showColumnModal) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeColumnModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showColumnModal, closeColumnModal]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFilterInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (filterValidationErrors[name]) {
      setFilterValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleColumnInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setColumnFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (columnValidationErrors[name]) {
      setColumnValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const payload = {
        reportName: String(formData.reportName || '').trim(),
        description: String(formData.description || '').trim(),
        query: String(formData.query || '').trim(),
        active: !!formData.active
      };

      let response;
      if (editingReport?.id) {
        response = await axios.put(`/api/report-masters/${editingReport.id}`, payload, config);
      } else {
        response = await axios.post('/api/report-masters', payload, config);
      }

      if (response.data.success) {
        setShowModal(false);
        setEditingReport(null);
        setFormData({ reportName: '', description: '', query: '', active: true });
        await fetchReportMasters();
      } else {
        setModalError(response.data.message || 'Failed to save. Please try again.');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setModalError(serverMessage || 'Failed to save. Please try again.');
    }
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();
    setFilterModalError('');

    if (!validateFilterForm()) {
      return;
    }

    const reportId = selectedReport?.id;
    if (!reportId) {
      setFilterModalError('Please select a report first.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const sortOrderValueRaw = String(filterFormData.sortOrder ?? '').trim();
      const sortOrderValue = sortOrderValueRaw === '' ? 0 : Number(sortOrderValueRaw);

      const payload = {
        reportId,
        filterName: String(filterFormData.filterName || '').trim(),
        filterLabel: String(filterFormData.filterLabel || '').trim(),
        parameterName: String(filterFormData.parameterName || '').trim(),
        type: String(filterFormData.type || '').trim(),
        required: !!filterFormData.required,
        defaultValue: String(filterFormData.defaultValue || '').trim(),
        dropdownQuery: String(filterFormData.dropdownQuery || '').trim(),
        sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : 0,
        active: !!filterFormData.active
      };

      let response;
      if (editingFilter?.id) {
        response = await axios.put(`/api/report-filter-mappings/${editingFilter.id}`, payload, config);
      } else {
        response = await axios.post('/api/report-filter-mappings', payload, config);
      }

      if (response.data.success) {
        setShowFilterModal(false);
        setEditingFilter(null);
        setFilterFormData({ filterName: '', filterLabel: '', parameterName: '', type: 'TEXT', required: false, defaultValue: '', dropdownQuery: '', active: true, sortOrder: 0 });
        await fetchFilterMappings();
      } else {
        setFilterModalError(response.data.message || 'Failed to save. Please try again.');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setFilterModalError(serverMessage || 'Failed to save. Please try again.');
    }
  };

  const handleColumnSubmit = async (e) => {
    e.preventDefault();
    setColumnModalError('');

    if (!validateColumnForm()) {
      return;
    }

    const reportId = selectedReport?.id;
    if (!reportId) {
      setColumnModalError('Please select a report first.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const sortOrderValueRaw = String(columnFormData.sortOrder ?? '').trim();
      const sortOrderValue = sortOrderValueRaw === '' ? 0 : Number(sortOrderValueRaw);

      const widthValueRaw = String(columnFormData.width ?? '').trim();
      const widthValue = widthValueRaw === '' ? null : Number(widthValueRaw);

      const payload = {
        reportId,
        columnName: String(columnFormData.columnName || '').trim(),
        columnHeader: String(columnFormData.columnHeader || '').trim(),
        dataType: String(columnFormData.dataType || '').trim(),
        width: widthValue !== null && Number.isFinite(widthValue) ? widthValue : null,
        visible: !!columnFormData.visible,
        sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : 0
      };

      let response;
      if (editingColumn?.id) {
        response = await axios.put(`/api/report-column-mappings/${editingColumn.id}`, payload, config);
      } else {
        response = await axios.post('/api/report-column-mappings', payload, config);
      }

      if (response.data.success) {
        setShowColumnModal(false);
        setEditingColumn(null);
        setColumnFormData({ columnName: '', columnHeader: '', dataType: 'TEXT', width: '', visible: true, sortOrder: 0 });
        await fetchColumnMappings();
      } else {
        setColumnModalError(response.data.message || 'Failed to save. Please try again.');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setColumnModalError(serverMessage || 'Failed to save. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this report?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/report-masters/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchReportMasters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };

  const handleDeleteFilter = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this filter mapping?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/report-filter-mappings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchFilterMappings();
    } catch (err) {
      setFilterError(err.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };

  const handleDeleteColumn = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this column mapping?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/report-column-mappings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchColumnMappings();
    } catch (err) {
      setColumnError(err.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  const headerTitle = activeSection === 'REPORT_MASTER'
    ? 'Report Master'
    : (activeSection === 'FILTER_MAPPING'
      ? `Filter Mapping${selectedReport?.reportName ? ` - ${selectedReport.reportName}` : ''}`
      : `Columns Mapping${selectedReport?.reportName ? ` - ${selectedReport.reportName}` : ''}`);

  return (
    <div className="category-list-container">
      <div className="category-list-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)} title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1>{headerTitle}</h1>
        </div>
        <div className="header-buttons">
          {activeSection !== 'REPORT_MASTER' && (
            <button
              className="add-btn"
              style={{ background: 'linear-gradient(135deg, #6c757d, #495057)' }}
              onClick={() => {
                setActiveSection('REPORT_MASTER');
                setSelectedReport(null);
                setFilterError('');
                setColumnError('');
              }}
            >
              Back
            </button>
          )}
          {activeSection === 'REPORT_MASTER' && (
            <button className="add-btn" onClick={handleAdd}>
              Add New Report
            </button>
          )}
          {activeSection === 'FILTER_MAPPING' && (
            <button className="add-btn" onClick={handleAddFilter} disabled={!selectedReport?.id}>
              Add Filter
            </button>
          )}
          {activeSection === 'COLUMNS_MAPPING' && (
            <button className="add-btn" onClick={handleAddColumn} disabled={!selectedReport?.id}>
              Add Column
            </button>
          )}
        </div>
      </div>

      {activeSection === 'REPORT_MASTER' && error && <div className="error-message">{error}</div>}
      {activeSection === 'FILTER_MAPPING' && filterError && <div className="error-message">{filterError}</div>}
      {activeSection === 'COLUMNS_MAPPING' && columnError && <div className="error-message">{columnError}</div>}

      {activeSection === 'REPORT_MASTER' ? (
        <div className="table-container">
          <table className="category-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Description</th>
                <th>Query</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportMasters.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No reports found</td>
                </tr>
              ) : (
                reportMasters.map((r) => (
                  <tr key={r.id}>
                    <td>{r.reportName || ''}</td>
                    <td>{r.description || ''}</td>
                    <td>{String(r.query || '').length > 80 ? `${String(r.query || '').slice(0, 80)}...` : (r.query || '')}</td>
                    <td>
                      <span className={`status ${(r.active === true || r.active === 1) ? 'active' : 'inactive'}`}>
                        {(r.active === true || r.active === 1) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td
                      className="actions"
                      style={{ maxWidth: 'none', overflow: 'visible', whiteSpace: 'normal', flexWrap: 'wrap' }}
                    >
                      <button className="edit-btn" onClick={() => handleEdit(r)}>
                        Edit
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(r.id)}>
                        Delete
                      </button>
                      <button className="edit-btn" onClick={() => openFilterMappingForReport(r)}>
                        Filter Mapping
                      </button>
                      <button className="edit-btn" onClick={() => openColumnsMappingForReport(r)}>
                        Columns Mapping
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeSection === 'FILTER_MAPPING' ? (
        <div className="table-container">
          {filterLoading ? (
            <div className="loading" style={{ padding: 20 }}>Loading filter mappings...</div>
          ) : !selectedReport?.id ? (
            <div className="no-data" style={{ padding: 20 }}>Select a report and click Filter Mapping.</div>
          ) : (
            <table className="category-table">
              <thead>
                <tr>
                  <th>Filter Name</th>
                  <th>Filter Label</th>
                  <th>Parameter Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Sort Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterMappings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No filter mappings found</td>
                  </tr>
                ) : (
                  filterMappings.map((fm) => (
                    <tr key={fm.id}>
                      <td>{fm.filterName || ''}</td>
                      <td>{fm.filterLabel || ''}</td>
                      <td>{fm.parameterName || ''}</td>
                      <td>{fm.type || ''}</td>
                      <td>
                        <span className={`status ${(fm.required === true || fm.required === 1) ? 'active' : 'inactive'}`}>
                          {(fm.required === true || fm.required === 1) ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{fm.sortOrder ?? 0}</td>
                      <td className="actions" style={{ maxWidth: 'none', overflow: 'visible', whiteSpace: 'normal', flexWrap: 'wrap' }}>
                        <button className="edit-btn" onClick={() => handleEditFilter(fm)}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteFilter(fm.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : activeSection === 'COLUMNS_MAPPING' ? (
        <div className="table-container">
          {columnLoading ? (
            <div className="loading" style={{ padding: 20 }}>Loading column mappings...</div>
          ) : !selectedReport?.id ? (
            <div className="no-data" style={{ padding: 20 }}>Select a report and click Columns Mapping.</div>
          ) : (
            <table className="category-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Column Header</th>
                  <th>Data Type</th>
                  <th>Width</th>
                  <th>Visible</th>
                  <th>Sort Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {columnMappings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No column mappings found</td>
                  </tr>
                ) : (
                  columnMappings.map((cm) => (
                    <tr key={cm.id}>
                      <td>{cm.columnName || ''}</td>
                      <td>{cm.columnHeader || ''}</td>
                      <td>{cm.dataType || ''}</td>
                      <td>{cm.width ?? ''}</td>
                      <td>
                        <span className={`status ${(cm.visible === undefined || cm.visible === null || cm.visible === true || cm.visible === 1) ? 'active' : 'inactive'}`}>
                          {(cm.visible === undefined || cm.visible === null || cm.visible === true || cm.visible === 1) ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{cm.sortOrder ?? 0}</td>
                      <td className="actions" style={{ maxWidth: 'none', overflow: 'visible', whiteSpace: 'normal', flexWrap: 'wrap' }}>
                        <button className="edit-btn" onClick={() => handleEditColumn(cm)}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteColumn(cm.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-container" style={{ padding: 16 }}>
          <div className="no-data">
            {activeSection === 'FILTER_MAPPING'
              ? `Filter Mapping screen will be available here${selectedReport?.reportName ? ` for: ${selectedReport.reportName}` : ''}.`
              : `Columns Mapping screen will be available here${selectedReport?.reportName ? ` for: ${selectedReport.reportName}` : ''}.`}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingReport ? 'Edit Report' : 'Add New Report'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>

            {modalError && (
              <div className="modal-error-message">
                {modalError}
              </div>
            )}

            <div className="category-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="reportName">Report Name *</label>
                    <input
                      type="text"
                      id="reportName"
                      name="reportName"
                      value={formData.reportName}
                      onChange={handleInputChange}
                      className={validationErrors.reportName ? 'error' : ''}
                      placeholder="Enter report name"
                      maxLength="200"
                    />
                    {validationErrors.reportName && (
                      <span className="error-message">{validationErrors.reportName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter description"
                      maxLength="500"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="query">Query *</label>
                    <textarea
                      id="query"
                      name="query"
                      value={formData.query}
                      onChange={handleInputChange}
                      className={validationErrors.query ? 'error' : ''}
                      placeholder="Enter SQL query"
                      rows={8}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                    {validationErrors.query && (
                      <span className="error-message">{validationErrors.query}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="active"
                        checked={!!formData.active}
                        onChange={handleInputChange}
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingReport ? 'Update Report' : 'Add Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingFilter ? 'Edit Filter Mapping' : 'Add Filter Mapping'}</h2>
              <button onClick={closeFilterModal} className="close-btn">×</button>
            </div>

            {filterModalError && (
              <div className="modal-error-message">
                {filterModalError}
              </div>
            )}

            <div className="category-form">
              <form onSubmit={handleFilterSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="filterName">Filter Name *</label>
                    <input
                      type="text"
                      id="filterName"
                      name="filterName"
                      value={filterFormData.filterName}
                      onChange={handleFilterInputChange}
                      className={filterValidationErrors.filterName ? 'error' : ''}
                      placeholder="Enter filter name"
                      maxLength="200"
                    />
                    {filterValidationErrors.filterName && (
                      <span className="error-message">{filterValidationErrors.filterName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="filterLabel">Filter Label</label>
                    <input
                      type="text"
                      id="filterLabel"
                      name="filterLabel"
                      value={filterFormData.filterLabel}
                      onChange={handleFilterInputChange}
                      placeholder="Enter filter label"
                      maxLength="200"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="parameterName">Parameter Name *</label>
                    <input
                      type="text"
                      id="parameterName"
                      name="parameterName"
                      value={filterFormData.parameterName}
                      onChange={handleFilterInputChange}
                      className={filterValidationErrors.parameterName ? 'error' : ''}
                      placeholder="Enter parameter name"
                      maxLength="50"
                    />
                    {filterValidationErrors.parameterName && (
                      <span className="error-message">{filterValidationErrors.parameterName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="type">Type *</label>
                    <select
                      id="type"
                      name="type"
                      value={filterFormData.type}
                      onChange={handleFilterInputChange}
                      className={filterValidationErrors.type ? 'error' : ''}
                    >
                      {filterTypeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {filterValidationErrors.type && (
                      <span className="error-message">{filterValidationErrors.type}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="sortOrder">Sort Order</label>
                    <input
                      type="number"
                      id="sortOrder"
                      name="sortOrder"
                      value={filterFormData.sortOrder}
                      onChange={handleFilterInputChange}
                      className={filterValidationErrors.sortOrder ? 'error' : ''}
                      placeholder="0"
                    />
                    {filterValidationErrors.sortOrder && (
                      <span className="error-message">{filterValidationErrors.sortOrder}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="required"
                        checked={!!filterFormData.required}
                        onChange={handleFilterInputChange}
                      />
                      Required
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="defaultValue">Default Value</label>
                    <input
                      type="text"
                      id="defaultValue"
                      name="defaultValue"
                      value={filterFormData.defaultValue}
                      onChange={handleFilterInputChange}
                      placeholder="Enter default value"
                      maxLength="500"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="dropdownQuery">Options Query</label>
                    <textarea
                      id="dropdownQuery"
                      name="dropdownQuery"
                      value={filterFormData.dropdownQuery}
                      onChange={handleFilterInputChange}
                      placeholder="Enter dropdown/search query"
                      rows={6}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="active"
                        checked={!!filterFormData.active}
                        onChange={handleFilterInputChange}
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeFilterModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingFilter ? 'Update Filter' : 'Add Filter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showColumnModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingColumn ? 'Edit Column Mapping' : 'Add Column Mapping'}</h2>
              <button onClick={closeColumnModal} className="close-btn">×</button>
            </div>

            {columnModalError && (
              <div className="modal-error-message">
                {columnModalError}
              </div>
            )}

            <div className="category-form">
              <form onSubmit={handleColumnSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="columnName">Column Name *</label>
                    <input
                      type="text"
                      id="columnName"
                      name="columnName"
                      value={columnFormData.columnName}
                      onChange={handleColumnInputChange}
                      className={columnValidationErrors.columnName ? 'error' : ''}
                      placeholder="Enter column name"
                      maxLength="200"
                    />
                    {columnValidationErrors.columnName && (
                      <span className="error-message">{columnValidationErrors.columnName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="columnHeader">Column Header</label>
                    <input
                      type="text"
                      id="columnHeader"
                      name="columnHeader"
                      value={columnFormData.columnHeader}
                      onChange={handleColumnInputChange}
                      placeholder="Enter column header"
                      maxLength="200"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dataType">Data Type *</label>
                    <select
                      id="dataType"
                      name="dataType"
                      value={columnFormData.dataType}
                      onChange={handleColumnInputChange}
                      className={columnValidationErrors.dataType ? 'error' : ''}
                    >
                      {columnTypeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {columnValidationErrors.dataType && (
                      <span className="error-message">{columnValidationErrors.dataType}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="width">Width</label>
                    <input
                      type="number"
                      id="width"
                      name="width"
                      value={columnFormData.width}
                      onChange={handleColumnInputChange}
                      className={columnValidationErrors.width ? 'error' : ''}
                      placeholder="Optional"
                    />
                    {columnValidationErrors.width && (
                      <span className="error-message">{columnValidationErrors.width}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="sortOrder">Sort Order</label>
                    <input
                      type="number"
                      id="sortOrder"
                      name="sortOrder"
                      value={columnFormData.sortOrder}
                      onChange={handleColumnInputChange}
                      className={columnValidationErrors.sortOrder ? 'error' : ''}
                      placeholder="0"
                    />
                    {columnValidationErrors.sortOrder && (
                      <span className="error-message">{columnValidationErrors.sortOrder}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="visible"
                        checked={!!columnFormData.visible}
                        onChange={handleColumnInputChange}
                      />
                      Visible
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeColumnModal} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingColumn ? 'Update Column' : 'Add Column'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsConfiguration;
