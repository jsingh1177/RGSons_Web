import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Save } from 'lucide-react';
import './SizeOrder.css';

const CategoryOrder = () => {
  const navigate = useNavigate();
  const [sourceList, setSourceList] = useState([]);
  const [targetList, setTargetList] = useState([]);
  const [selectedSource, setSelectedSource] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        const categories = response.data.categories || [];

        const target = categories
          .filter(c => c.shortOrder && c.shortOrder > 0)
          .sort((a, b) => (a.shortOrder || 0) - (b.shortOrder || 0));

        const source = categories
          .filter(c => !c.shortOrder || c.shortOrder === 0)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        setSourceList(source);
        setTargetList(target);
        setMessage({ type: '', text: '' });
      } else {
        setMessage({ type: 'error', text: response.data?.message || 'Failed to fetch categories' });
      }
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setMessage({ type: 'error', text: 'Failed to fetch categories' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSourceSelect = (id) => {
    if (selectedSource.includes(id)) {
      setSelectedSource(selectedSource.filter(x => x !== id));
    } else {
      setSelectedSource([...selectedSource, id]);
    }
  };

  const handleTargetSelect = (id) => {
    if (selectedTarget.includes(id)) {
      setSelectedTarget(selectedTarget.filter(x => x !== id));
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
    setSourceList([...sourceList, ...itemsToMove].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setTargetList(newTarget);
    setSelectedTarget([]);
  };

  const moveAllToTarget = () => {
    setTargetList([...targetList, ...sourceList]);
    setSourceList([]);
    setSelectedSource([]);
  };

  const moveAllToSource = () => {
    const allItems = [...sourceList, ...targetList].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setSourceList(allItems);
    setTargetList([]);
    setSelectedTarget([]);
  };

  const moveUp = () => {
    if (selectedTarget.length !== 1) return;
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
    if (index < targetList.length - 1 && index >= 0) {
      const newList = [...targetList];
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
      setTargetList(newList);
    }
  };

  const resetChanges = () => {
    fetchCategories();
  };

  const saveOrder = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const orderedIds = targetList.map(c => c.id);
      await axios.post('/api/categories/order', orderedIds, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Category order saved successfully' });
      fetchCategories();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save order' });
      setLoading(false);
    }
  };

  return (
    <div className="size-order-container">
      <div className="config-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Category Order Management</h1>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="order-content">
        <div className="list-section">
          <h3>Source (Available Categories)</h3>
          <div className="list-container">
            {sourceList.map(cat => (
              <div
                key={cat.id}
                className={`list-item ${selectedSource.includes(cat.id) ? 'selected' : ''}`}
                onClick={() => handleSourceSelect(cat.id)}
              >
                {cat.name}
              </div>
            ))}
          </div>
          <div className="list-count">{sourceList.length} items</div>
        </div>

        <div className="controls-section">
          <button onClick={moveAllToTarget} title="Move All to Target">{'>>'}</button>
          <button onClick={moveToTarget} title="Move Selected to Target" disabled={selectedSource.length === 0}>{'>'}</button>
          <button onClick={moveToSource} title="Move Selected to Source" disabled={selectedTarget.length === 0}>{'<'}</button>
          <button onClick={moveAllToSource} title="Move All to Source">{'<<'}</button>
        </div>

        <div className="list-section">
          <h3>Target (Ordered Categories)</h3>
          <div className="list-container">
            {targetList.map((cat, index) => (
              <div
                key={cat.id}
                className={`list-item ${selectedTarget.includes(cat.id) ? 'selected' : ''}`}
                onClick={() => handleTargetSelect(cat.id)}
              >
                <span className="order-badge">{index + 1}</span>
                {cat.name}
              </div>
            ))}
          </div>
          <div className="list-count">{targetList.length} items</div>
        </div>

        <div className="reorder-controls">
          <button onClick={moveUp} disabled={selectedTarget.length !== 1} title="Move Up"><ArrowUp size={20} /></button>
          <button onClick={moveDown} disabled={selectedTarget.length !== 1} title="Move Down"><ArrowDown size={20} /></button>
        </div>
      </div>

      <div className="actions-footer">
        <button className="save-btn" onClick={saveOrder} disabled={loading}>
          <Save size={18} />
          Save Order
        </button>
        <button className="reset-btn" onClick={resetChanges} disabled={loading}>
          Reset Changes
        </button>
      </div>
    </div>
  );
};

export default CategoryOrder;

