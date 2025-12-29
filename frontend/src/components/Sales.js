import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sales.css';

const Sales = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    code: '',
    quantity: 1,
    mrp: '',
    amount: 0
  });

  const codeInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const mrpInputRef = useRef(null);

  // Calculate amount whenever quantity or mrp changes
  useEffect(() => {
    const qty = parseFloat(currentItem.quantity) || 0;
    const mrp = parseFloat(currentItem.mrp) || 0;
    setCurrentItem(prev => ({
      ...prev,
      amount: qty * mrp
    }));
  }, [currentItem.quantity, currentItem.mrp]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!currentItem.code || !currentItem.quantity || !currentItem.mrp) {
      alert('Please fill in all fields');
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now(), // Temporary ID
      quantity: parseFloat(currentItem.quantity),
      mrp: parseFloat(currentItem.mrp)
    };

    setItems([...items, newItem]);
    
    // Reset form and focus back to code input for next scan
    setCurrentItem({
      code: '',
      quantity: 1,
      mrp: '',
      amount: 0
    });
    codeInputRef.current.focus();
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef) {
        nextRef.current.focus();
      } else {
        handleAddItem(e);
      }
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl+S to complete sale
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (items.length > 0) {
          alert('Checkout functionality coming soon!');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [items]);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = (subtotal) => {
    return subtotal * 0.18; // 18% Tax
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal);
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h2>New Sale</h2>
        <button className="back-button" onClick={() => navigate('/store-dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="sales-content">
        <div className="scan-section">
          <h3>Add Item</h3>
          <form onSubmit={handleAddItem}>
            <div className="scan-input-group">
              <label>Item Code / Scan</label>
              <input
                ref={codeInputRef}
                type="text"
                name="code"
                value={currentItem.code}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, qtyInputRef)}
                placeholder="Scan barcode or enter code"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="scan-input-group">
              <label>Quantity</label>
              <input
                ref={qtyInputRef}
                type="number"
                name="quantity"
                value={currentItem.quantity}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, mrpInputRef)}
                min="1"
              />
            </div>

            <div className="scan-input-group">
              <label>MRP</label>
              <input
                ref={mrpInputRef}
                type="number"
                name="mrp"
                value={currentItem.mrp}
                onChange={handleInputChange}
                onKeyDown={(e) => handleKeyDown(e, null)} // null means submit
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="scan-input-group">
              <label>Amount</label>
              <input
                type="text"
                value={currentItem.amount.toFixed(2)}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <button type="submit" className="add-btn">
              Add Item
            </button>
          </form>
        </div>

        <div className="cart-section">
          <div className="cart-header">
            <h3>Cart ({items.length} items)</h3>
          </div>
          
          <div className="cart-table-container">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Qty</th>
                  <th>MRP</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-cart-state">
                        <div className="empty-cart-icon">🛒</div>
                        <p>Your cart is empty</p>
                        <small>Scan an item code to start a new sale</small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.quantity}</td>
                      <td>{item.mrp.toFixed(2)}</td>
                      <td>{item.amount.toFixed(2)}</td>
                      <td>
                        <button 
                          className="delete-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove Item"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="cart-footer">
            <div className="cart-summary">
              <div className="summary-row">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Tax (18%):</span>
                <span className="summary-value">{calculateTax(calculateSubtotal()).toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span className="summary-label">Grand Total:</span>
                <span className="summary-value">{calculateTotal().toFixed(2)}</span>
              </div>
              
              <button 
                className="checkout-btn"
                disabled={items.length === 0}
                onClick={() => alert('Checkout functionality coming soon!')}
                title="Ctrl+S to complete sale"
              >
                <span>Complete Sale</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;

