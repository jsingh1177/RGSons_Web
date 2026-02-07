import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Save } from 'lucide-react';
import './VoucherConfiguration.css';

const VoucherConfiguration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState('');
    
    // Default Config State
    const [config, setConfig] = useState({
        voucherType: 'PURCHASE',
        prefix: 'PUR',
        includeStoreCode: true,
        storeCodePosition: 1,
        includeYear: true,
        yearFormat: 'YYYY',
        includeMonth: true,
        monthFormat: 'MM',
        includeDay: false,
        dayFormat: 'DD',
        separator: '-',
        numberPadding: 4,
        suffix: '',
        resetFrequency: 'MONTHLY',
        numberingScope: 'STORE_WISE',
        isActive: true
    });

    const voucherTypes = [
        { value: 'PURCHASE', label: 'Purchase Voucher' },
        { value: 'SALE', label: 'Sales Voucher' },
        { value: 'STOCK_TRANSFER_OUT', label: 'Stock Transfer Out' },
        { value: 'STOCK_TRANSFER_IN', label: 'Stock Transfer In' }
    ];

    const generateFrontendPreview = useCallback(() => {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const storeCode = 'S01'; // Mock
            
            const parts = [];
            
            if (config.prefix) parts.push(config.prefix);
            
            let storeAdded = false;
            
            // Position 1 (After Prefix)
            if (config.includeStoreCode && (config.storeCodePosition === 1 || !config.storeCodePosition)) {
                parts.push(storeCode);
                storeAdded = true;
            }
            
            if (config.includeYear) {
                parts.push(config.yearFormat === 'YY' ? String(year).slice(-2) : String(year));
            }
            
            // Position 2 (After Year)
            if (config.includeStoreCode && !storeAdded && Number(config.storeCodePosition) === 2) {
                parts.push(storeCode);
                storeAdded = true;
            }
            
            if (config.includeMonth) {
                parts.push(config.monthFormat === 'M' ? String(now.getMonth() + 1) : month);
            }
            
            if (config.includeDay) {
                parts.push(config.dayFormat === 'D' ? String(now.getDate()) : day);
            }
            
            // Position 3 (Before Number)
            if (config.includeStoreCode && !storeAdded && Number(config.storeCodePosition) === 3) {
                parts.push(storeCode);
                storeAdded = true;
            }
            
            const padding = config.numberPadding || 4;
            parts.push('1'.padStart(padding, '0'));
            
            if (config.suffix) parts.push(config.suffix);
            
            setPreview(parts.join(config.separator || '-'));
        } catch (e) {
            console.error("Error generating preview", e);
            setPreview("Error");
        }
    }, [config]);

    const fetchConfig = useCallback(async (type) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/voucher-config/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success && response.data.config) {
                setConfig(response.data.config);
            } else {
                // Reset to defaults if not found, but keep voucherType
                setConfig(prev => ({
                    ...prev,
                    voucherType: type, // Ensure type matches requested
                    prefix: type === 'PURCHASE' ? 'PUR' : 
                            type === 'SALE' ? 'SAL' : 
                            type === 'STOCK_TRANSFER_OUT' ? 'STO' : 'STI',
                    includeStoreCode: true,
                    storeCodePosition: 1,
                    includeYear: true,
                    yearFormat: 'YYYY',
                    includeMonth: true,
                    monthFormat: 'MM',
                    includeDay: false,
                    dayFormat: 'DD',
                    separator: '-',
                    numberPadding: 4,
                    suffix: '',
                    resetFrequency: 'MONTHLY',
                    numberingScope: 'STORE_WISE',
                    isActive: true,
                    pricingMethod: 'PURCHASE_PRICE'
                }));
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig(config.voucherType);
    }, [config.voucherType, fetchConfig]);

    // Use Effect to update preview whenever config changes
    useEffect(() => {
        generateFrontendPreview();
    }, [generateFrontendPreview]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/voucher-config/save', config, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                Swal.fire('Success', 'Configuration saved successfully', 'success');
            } else {
                Swal.fire('Error', response.data.message || 'Failed to save', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save configuration', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="voucher-config-container">
            {loading && <div className="loading-overlay">Loading...</div>}
            
            <div className="config-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/settings')} title="Back to Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1>Voucher Configuration</h1>
                </div>
            </div>

            <div className="config-section">
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                    <div className="form-group">
                        <label>Voucher Type</label>
                        <select 
                            name="voucherType" 
                            value={config.voucherType} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ width: '300px' }}
                        >
                            {voucherTypes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Pricing Method</label>
                        <select 
                            name="pricingMethod" 
                            value={config.pricingMethod || 'PURCHASE_PRICE'} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ width: '300px' }}
                        >
                            <option value="PURCHASE_PRICE">Purchase Price</option>
                            <option value="SALE_PRICE">Sale Price</option>
                            <option value="MRP">MRP</option>
                        </select>
                        <small className="form-text text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                            Select the price type for valuation.
                        </small>
                    </div>
                </div>
            </div>

            <div className="config-section">
                <h2>Number Format Configuration</h2>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Prefix</label>
                        <input 
                            type="text" 
                            name="prefix" 
                            value={config.prefix || ''} 
                            onChange={handleChange} 
                            className="form-control" 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Separator</label>
                        <input 
                            type="text" 
                            name="separator" 
                            value={config.separator || ''} 
                            onChange={handleChange} 
                            className="form-control" 
                        />
                    </div>

                    <div className="form-group">
                        <label>Number Padding</label>
                        <input 
                            type="number" 
                            name="numberPadding" 
                            value={config.numberPadding} 
                            onChange={handleChange} 
                            className="form-control" 
                            min="1" max="10"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Suffix</label>
                        <input 
                            type="text" 
                            name="suffix" 
                            value={config.suffix || ''} 
                            onChange={handleChange} 
                            className="form-control" 
                        />
                    </div>
                </div>

                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        name="includeStoreCode" 
                        checked={config.includeStoreCode} 
                        onChange={handleChange} 
                        id="chkStore"
                    />
                    <label htmlFor="chkStore">Include Store Code</label>
                    
                    {config.includeStoreCode && (
                        <select 
                            name="storeCodePosition" 
                            value={config.storeCodePosition} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ marginLeft: '10px', padding: '0.2rem' }}
                        >
                            <option value={1}>After Prefix</option>
                            <option value={2}>After Date</option>
                            <option value={3}>Before Number</option>
                        </select>
                    )}
                </div>

                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        name="includeYear" 
                        checked={config.includeYear} 
                        onChange={handleChange} 
                        id="chkYear"
                    />
                    <label htmlFor="chkYear">Include Year</label>
                    
                    {config.includeYear && (
                        <select 
                            name="yearFormat" 
                            value={config.yearFormat} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ marginLeft: '10px', padding: '0.2rem' }}
                        >
                            <option value="YYYY">YYYY (2026)</option>
                            <option value="YY">YY (26)</option>
                        </select>
                    )}
                </div>

                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        name="includeMonth" 
                        checked={config.includeMonth} 
                        onChange={handleChange} 
                        id="chkMonth"
                    />
                    <label htmlFor="chkMonth">Include Month</label>
                    
                    {config.includeMonth && (
                        <select 
                            name="monthFormat" 
                            value={config.monthFormat} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ marginLeft: '10px', padding: '0.2rem' }}
                        >
                            <option value="MM">MM (01)</option>
                            <option value="M">M (1)</option>
                        </select>
                    )}
                </div>

                <div className="checkbox-group">
                    <input 
                        type="checkbox" 
                        name="includeDay" 
                        checked={config.includeDay} 
                        onChange={handleChange} 
                        id="chkDay"
                    />
                    <label htmlFor="chkDay">Include Day</label>
                    
                    {config.includeDay && (
                        <select 
                            name="dayFormat" 
                            value={config.dayFormat} 
                            onChange={handleChange}
                            className="form-control"
                            style={{ marginLeft: '10px', padding: '0.2rem' }}
                        >
                            <option value="DD">DD (22)</option>
                            <option value="D">D (22)</option>
                        </select>
                    )}
                </div>
            </div>

            <div className="config-section">
                <h2>Numbering Strategy</h2>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Numbering Scope</label>
                        <div className="radio-group">
                            <label className="radio-option">
                                <input 
                                    type="radio" 
                                    name="numberingScope" 
                                    value="STORE_WISE" 
                                    checked={config.numberingScope === 'STORE_WISE'} 
                                    onChange={handleChange} 
                                />
                                Store-wise
                            </label>
                            <label className="radio-option">
                                <input 
                                    type="radio" 
                                    name="numberingScope" 
                                    value="GLOBAL" 
                                    checked={config.numberingScope === 'GLOBAL'} 
                                    onChange={handleChange} 
                                />
                                Global
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Reset Frequency</label>
                        <select 
                            name="resetFrequency" 
                            value={config.resetFrequency} 
                            onChange={handleChange} 
                            className="form-control"
                        >
                            <option value="NEVER">Never</option>
                            <option value="DAILY">Daily</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="YEARLY">Yearly</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="config-section">
                <h2>Preview</h2>
                <div className="preview-box">
                    <span className="preview-label">Sample Number</span>
                    <div className="preview-number">{preview}</div>
                </div>
            </div>

            <div className="action-buttons">
                <button className="btn btn-secondary" onClick={() => navigate('/settings')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={18} style={{ marginRight: '8px' }} />
                    Save Configuration
                </button>
            </div>
        </div>
    );
};

export default VoucherConfiguration;
