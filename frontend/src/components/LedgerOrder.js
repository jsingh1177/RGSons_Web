import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown, Save, RotateCcw } from 'lucide-react';
import './LedgerOrder.css';

const LedgerOrder = () => {
  const navigate = useNavigate();
  const [sourceList, setSourceList] = useState([]);
  const [targetList, setTargetList] = useState([]);
  const [selectedSource, setSelectedSource] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter states
  const [filterType, setFilterType] = useState('All');
  const [filterScreen, setFilterScreen] = useState('All');

  // Static filter options (matching New Ledger page)
  const typeOptions = ['All', 'Sale', 'Purchase', 'Expense', 'Tender', 'Tax', 'Income'];
  const screenOptions = ['All', 'Sale', 'Purchase', 'Debit Note', 'Stock Transfer'];

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      const response = await axios.get('/api/ledgers');
      const allLedgers = response.data; // LedgerController returns List<Ledger> directly
      
      // Split into source and target based on shortOrder
      // Assuming 0 or null means not ordered yet
      const target = allLedgers
        .filter(s => s.shortOrder && s.shortOrder > 0)
        .sort((a, b) => a.shortOrder - b.shortOrder);
        
      const source = allLedgers
        .filter(s => !s.shortOrder || s.shortOrder === 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setTargetList(target);
      setSourceList(source);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      setMessage({ type: 'error', text: 'Failed to load ledgers' });
      setLoading(false);
    }
  };

  const handleSourceSelect = (id) => {
    if (selectedSource.includes(id)) {
      setSelectedSource(selectedSource.filter(item => item !== id));
    } else {
      setSelectedSource([...selectedSource, id]);
    }
  };

  const handleTargetSelect = (id) => {
    if (selectedTarget.includes(id)) {
      setSelectedTarget(selectedTarget.filter(item => item !== id));
    } else {
      setSelectedTarget([...selectedTarget, id]);
    }
  };

  const moveToTarget = () => {
    const itemsToMove = sourceList.filter(item => selectedSource.includes(item.id));
    const newSource = sourceList.filter(item => !selectedSource.includes(item.id));
    
    setTargetList([...targetList, ...itemsToMove]);
    setSourceList(newSource);
    setSelectedSource([]);
  };

  const moveToSource = () => {
    const itemsToMove = targetList.filter(item => selectedTarget.includes(item.id));
    const newTarget = targetList.filter(item => !selectedTarget.includes(item.id));
    
    setSourceList([...sourceList, ...itemsToMove].sort((a, b) => a.name.localeCompare(b.name)));
    setTargetList(newTarget);
    setSelectedTarget([]);
  };

  const moveAllToTarget = () => {
    setTargetList([...targetList, ...sourceList]);
    setSourceList([]);
    setSelectedSource([]);
  };

  const moveAllToSource = () => {
    const allItems = [...sourceList, ...targetList].sort((a, b) => a.name.localeCompare(b.name));
    setSourceList(allItems);
    setTargetList([]);
    setSelectedTarget([]);
  };

  const moveUp = () => {
    if (selectedTarget.length !== 1) return; // Only move one item at a time for simplicity
    const index = targetList.findIndex(item => item.id === selectedTarget[0]);
    if (index > 0) {
      const newList = [...targetList];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      setTargetList(newList);
    }
  };

  const moveDown = () => {
    if (selectedTarget.length !== 1) return;
    const index = targetList.findIndex(item => item.id === selectedTarget[0]);
    if (index < targetList.length - 1) {
      const newList = [...targetList];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      setTargetList(newList);
    }
  };

  const saveOrder = async () => {
    try {
      setLoading(true);
      // Create list of IDs in order
      const orderedIds = targetList.map(item => item.id);
      
      await axios.post('/api/ledgers/order', orderedIds);
      
      setMessage({ type: 'success', text: 'Ledger order saved successfully' });
      
      // Refetch to ensure consistency
      fetchLedgers(); 
      setLoading(false);
    } catch (error) {
      console.error('Error saving order:', error);
      setMessage({ type: 'error', text: 'Failed to save order' });
      setLoading(false);
    }
  };

  const getFilteredList = (list) => {
    return list.filter(item => {
      const matchType = filterType === 'All' || item.type === filterType;
      const matchScreen = filterScreen === 'All' || item.screen === filterScreen;
      return matchType && matchScreen;
    });
  };

  const filteredSourceList = getFilteredList(sourceList);
  const filteredTargetList = getFilteredList(targetList);

  return (
    <div className="ledger-order-container">
      <div className="config-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/ledgers')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Ledger Order Management</h1>
        </div>
        
        <div className="header-filters">
          <div className="filter-group">
            <label>Screen:</label>
            <select value={filterScreen} onChange={(e) => setFilterScreen(e.target.value)}>
              {screenOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {typeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="order-content">
        <div className="list-section">
          <h3>Source (Available Ledgers)</h3>
          <div className="list-container">
            {filteredSourceList.map(ledger => (
              <div 
                key={ledger.id} 
                className={`list-item ${selectedSource.includes(ledger.id) ? 'selected' : ''}`}
                onClick={() => handleSourceSelect(ledger.id)}
              >
                {ledger.name}
              </div>
            ))}
          </div>
          <div className="list-count">
            {filteredSourceList.length} / {sourceList.length} items
          </div>
        </div>

        <div className="controls-section">
          <button onClick={moveAllToTarget} title="Move All to Target">{'>>'}</button>
          <button onClick={moveToTarget} title="Move Selected to Target" disabled={selectedSource.length === 0}>{'>'}</button>
          <button onClick={moveToSource} title="Move Selected to Source" disabled={selectedTarget.length === 0}>{'<'}</button>
          <button onClick={moveAllToSource} title="Move All to Source">{'<<'}</button>
        </div>

        <div className="list-section">
          <h3>Target (Ordered Ledgers)</h3>
          <div className="list-container">
            {filteredTargetList.map((ledger, index) => (
              <div 
                key={ledger.id} 
                className={`list-item ${selectedTarget.includes(ledger.id) ? 'selected' : ''}`}
                onClick={() => handleTargetSelect(ledger.id)}
              >
                {/* Show actual index if filtered? Or visual index? 
                    If we filter, the index might be misleading if we show 'index + 1' of the filtered list.
                    But showing global index might be better. 
                    Let's find the index in the original targetList.
                */}
                <span className="order-badge">
                  {targetList.findIndex(l => l.id === ledger.id) + 1}
                </span>
                {ledger.name}
              </div>
            ))}
          </div>
          <div className="list-count">
            {filteredTargetList.length} / {targetList.length} items
          </div>
        </div>

        <div className="reorder-controls">
          <button onClick={moveUp} disabled={selectedTarget.length !== 1} title="Move Up"><ArrowUp size={20} /></button>
          <button onClick={moveDown} disabled={selectedTarget.length !== 1} title="Move Down"><ArrowDown size={20} /></button>
        </div>
      </div>

      <div className="actions-footer">
        <button className="save-btn" onClick={saveOrder} disabled={loading}>
          <Save size={20} />
          Save Order
        </button>
          <button className="reset-btn" onClick={fetchLedgers} disabled={loading}>
          <RotateCcw size={20} />
          Reset Changes
        </button>
      </div>
    </div>
  );
};

export default LedgerOrder;
