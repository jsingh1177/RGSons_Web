import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './MerchandiseHierarchy.css';

const flattenTree = (nodes) => {
  const flat = [];
  const visit = (list) => {
    (Array.isArray(list) ? list : []).forEach((node) => {
      flat.push(node);
      visit(node.children);
    });
  };
  visit(nodes);
  return flat;
};

const filterTree = (nodes, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return nodes;
  return (Array.isArray(nodes) ? nodes : []).reduce((acc, node) => {
    const children = filterTree(node.children || [], q);
    const code = String(node.nodeCode || '').toLowerCase();
    const name = String(node.nodeName || '').toLowerCase();
    if (name.includes(q) || code.includes(q) || children.length > 0) {
      acc.push({ ...node, children });
    }
    return acc;
  }, []);
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const user = getCurrentUser();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
    'X-User-Name': String(user?.userName || '').trim() || 'SYSTEM'
  };
};

const sendMerchDebugEvent = async (payload) => {
  // #region debug-point FE:merch-root-not-saving
  try {
    await fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'merch-write-actions',
        runId: 'pre',
        ts: Date.now(),
        ...payload
      })
    });
  } catch {}
  // #endregion
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const messageToSwalHtml = (message) => (
  `<div style="text-align:left;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>`
);

const merchSwalOptions = (options = {}) => ({
  ...options,
  customClass: {
    ...(options.customClass || {}),
    container: `merch-swal-top${options.customClass?.container ? ` ${options.customClass.container}` : ''}`
  }
});

const MerchandiseHierarchy = () => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mappedItems, setMappedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState('create-root');
  const [nodeForm, setNodeForm] = useState({
    parentId: null,
    nodeCode: '',
    nodeName: '',
    sortOrder: 0,
    status: true
  });
  const [nodeModalError, setNodeModalError] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);

  const allNodes = useMemo(() => flattenTree(tree), [tree]);
  const visibleTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

  const fetchTree = useCallback(async (preferredSelectedId = null) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/merchandise-hierarchy/tree', {
        headers: getAuthHeaders()
      });
      if (!response.data?.success) {
        setError(response.data?.message || 'Failed to fetch hierarchy');
        setTree([]);
        return;
      }

      const nextTree = Array.isArray(response.data.tree) ? response.data.tree : [];
      setTree(nextTree);
      setError('');

      const nextFlat = flattenTree(nextTree);
      const availableIds = new Set(nextFlat.map((node) => node.id));
      setExpandedIds((prev) => {
        const kept = new Set(Array.from(prev).filter((id) => availableIds.has(id)));
        if (kept.size === 0) {
          nextTree.forEach((node) => kept.add(node.id));
        }
        return kept;
      });

      const targetId = preferredSelectedId && availableIds.has(preferredSelectedId)
        ? preferredSelectedId
        : selectedNodeId && availableIds.has(selectedNodeId)
          ? selectedNodeId
          : nextFlat[0]?.id || null;
      setSelectedNodeId(targetId);
    } catch (err) {
      console.error('Error fetching merchandise hierarchy', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.message || 'Failed to fetch hierarchy');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedNodeId]);

  const fetchSelectedNodeData = useCallback(async (nodeId) => {
    if (!nodeId) {
      setSelectedNode(null);
      setMappedItems([]);
      return;
    }
    try {
      setDetailsLoading(true);
      const headers = getAuthHeaders();
      const [nodeResponse, itemsResponse] = await Promise.all([
        axios.get(`/api/merchandise-hierarchy/${nodeId}`, { headers }),
        axios.get(`/api/merchandise-hierarchy/${nodeId}/items`, { headers })
      ]);

      if (nodeResponse.data?.success) {
        setSelectedNode(nodeResponse.data.node || null);
      } else {
        setSelectedNode(null);
      }

      if (itemsResponse.data?.success) {
        setMappedItems(Array.isArray(itemsResponse.data.items) ? itemsResponse.data.items : []);
      } else {
        setMappedItems([]);
      }
    } catch (err) {
      console.error('Error loading selected node data', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.message || 'Failed to load selected node');
      setSelectedNode(null);
      setMappedItems([]);
    } finally {
      setDetailsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    fetchSelectedNodeData(selectedNodeId);
  }, [fetchSelectedNodeData, selectedNodeId]);

  const toggleExpanded = (nodeId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(allNodes.map((node) => node.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const openCreateRootModal = () => {
    setNodeModalMode('create-root');
    setNodeForm({
      parentId: null,
      nodeCode: '',
      nodeName: '',
      sortOrder: 0,
      status: true
    });
    setNodeModalError('');
    setShowNodeModal(true);
  };

  const openCreateChildModal = () => {
    if (!selectedNode) return;
    setNodeModalMode('create-child');
    setNodeForm({
      parentId: selectedNode.id,
      nodeCode: '',
      nodeName: '',
      sortOrder: 0,
      status: true
    });
    setNodeModalError('');
    setShowNodeModal(true);
  };

  const openEditModal = () => {
    if (!selectedNode) return;
    setNodeModalMode('edit');
    setNodeForm({
      parentId: selectedNode.parentId ?? null,
      nodeCode: selectedNode.nodeCode || '',
      nodeName: selectedNode.nodeName || '',
      sortOrder: Number.isFinite(Number(selectedNode.sortOrder)) ? Number(selectedNode.sortOrder) : 0,
      status: selectedNode.status !== false
    });
    setNodeModalError('');
    setShowNodeModal(true);
  };

  const closeNodeModal = () => {
    setShowNodeModal(false);
    setNodeModalError('');
  };

  const handleNodeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNodeForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveNode = async (e) => {
    e?.preventDefault?.();
    // #region debug-point FE:handle-save-entry
    await sendMerchDebugEvent({
      hypothesisId: 'A',
      location: 'MerchandiseHierarchy:handleSaveNode',
      msg: '[DEBUG] handleSaveNode entered',
      data: {
        mode: nodeModalMode,
        selectedNodeId,
        parentId: nodeForm.parentId,
        nodeName: String(nodeForm.nodeName || ''),
        nodeCode: String(nodeForm.nodeCode || '')
      }
    });
    // #endregion

    if (!String(nodeForm.nodeName || '').trim()) {
      setNodeModalError('Node name is required');
      // #region debug-point FE:handle-save-validation
      await sendMerchDebugEvent({
        hypothesisId: 'A',
        location: 'MerchandiseHierarchy:handleSaveNode',
        msg: '[DEBUG] handleSaveNode blocked by frontend validation',
        data: { reason: 'node name blank' }
      });
      // #endregion
      return;
    }

    try {
      const payload = {
        parentId: nodeForm.parentId,
        nodeCode: String(nodeForm.nodeCode || '').trim(),
        nodeName: String(nodeForm.nodeName || '').trim(),
        sortOrder: Number.isFinite(Number(nodeForm.sortOrder)) ? Number(nodeForm.sortOrder) : 0,
        status: Boolean(nodeForm.status)
      };

      const headers = getAuthHeaders();
      // #region debug-point FE:axios-before
      await sendMerchDebugEvent({
        hypothesisId: 'A',
        location: 'MerchandiseHierarchy:handleSaveNode',
        msg: '[DEBUG] about to call hierarchy save API',
        data: {
          url: nodeModalMode === 'edit' ? `/api/merchandise-hierarchy/${selectedNode.id}` : '/api/merchandise-hierarchy',
          method: nodeModalMode === 'edit' ? 'PUT' : 'POST',
          payload
        }
      });
      // #endregion
      const response = nodeModalMode === 'edit'
        ? await axios.put(`/api/merchandise-hierarchy/${selectedNode.id}`, payload, { headers })
        : await axios.post('/api/merchandise-hierarchy', payload, { headers });

      // #region debug-point FE:axios-after
      await sendMerchDebugEvent({
        hypothesisId: 'B',
        location: 'MerchandiseHierarchy:handleSaveNode',
        msg: '[DEBUG] hierarchy save API responded',
        data: {
          success: response?.data?.success,
          message: response?.data?.message || '',
          nodeId: response?.data?.node?.id ?? null
        }
      });
      // #endregion

      if (!response.data?.success) {
        setNodeModalError(response.data?.message || 'Failed to save node');
        return;
      }

      closeNodeModal();
      const nextId = response.data?.node?.id || selectedNodeId;
      await fetchTree(nextId);
    } catch (err) {
      console.error('Error saving node', err);
      // #region debug-point FE:axios-error
      await sendMerchDebugEvent({
        hypothesisId: 'B',
        location: 'MerchandiseHierarchy:handleSaveNode',
        msg: '[DEBUG] hierarchy save API threw error',
        data: {
          status: err?.response?.status ?? null,
          message: err?.response?.data?.message || err?.message || ''
        }
      });
      // #endregion
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setNodeModalError(err.response?.data?.message || 'Failed to save node');
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    const confirm = await Swal.fire({
      title: 'Delete Node?',
      text: `Delete "${selectedNode.nodeName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirm.isConfirmed) return;

    try {
      const parentId = selectedNode.parentId || null;
      const response = await axios.delete(`/api/merchandise-hierarchy/${selectedNode.id}`, {
        headers: getAuthHeaders()
      });
      if (!response.data?.success) {
        await Swal.fire('Error', response.data?.message || 'Failed to delete node', 'error');
        return;
      }
      await Swal.fire('Deleted', 'Node deleted successfully', 'success');
      await fetchTree(parentId);
    } catch (err) {
      console.error('Error deleting node', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      await Swal.fire('Error', err.response?.data?.message || 'Failed to delete node', 'error');
    }
  };

  const searchItems = async () => {
    const q = String(itemSearchQuery || '').trim();
    if (!q) {
      setItemSearchResults([]);
      return;
    }
    try {
      setItemSearchLoading(true);
      const response = await axios.get(`/api/items/search?query=${encodeURIComponent(q)}`, {
        headers: getAuthHeaders()
      });
      if (response.data?.success) {
        setItemSearchResults(Array.isArray(response.data.items) ? response.data.items : []);
      } else {
        setItemSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching items', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setItemSearchResults([]);
    } finally {
      setItemSearchLoading(false);
    }
  };

  const openItemModal = () => {
    if (!selectedNode) return;
    setItemSearchQuery('');
    setItemSearchResults([]);
    setSelectedItemCodes([]);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setItemSearchQuery('');
    setItemSearchResults([]);
    setSelectedItemCodes([]);
  };

  const toggleItemSelection = (itemCode) => {
    setSelectedItemCodes((prev) => (
      prev.includes(itemCode)
        ? prev.filter((code) => code !== itemCode)
        : [...prev, itemCode]
    ));
  };

  const handleMapItems = async () => {
    if (!selectedNode || selectedItemCodes.length === 0) {
      return;
    }
    try {
      const response = await axios.post(
        `/api/merchandise-hierarchy/${selectedNode.id}/items`,
        { itemCodes: selectedItemCodes },
        { headers: getAuthHeaders() }
      );
      if (!response.data?.success) {
        await Swal.fire(merchSwalOptions({
          title: 'Error',
          html: messageToSwalHtml(response.data?.message || 'Failed to map items'),
          icon: 'error'
        }));
        return;
      }
      closeItemModal();
      await Swal.fire(merchSwalOptions({
        title: 'Done',
        text: response.data?.message || 'Items mapped successfully',
        icon: 'success'
      }));
      await fetchTree(selectedNode.id);
      await fetchSelectedNodeData(selectedNode.id);
    } catch (err) {
      console.error('Error mapping items', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      await Swal.fire(merchSwalOptions({
        title: 'Error',
        html: messageToSwalHtml(err.response?.data?.message || 'Failed to map items'),
        icon: 'error'
      }));
    }
  };

  const handleRemoveMappedItem = async (mappingId) => {
    const confirm = await Swal.fire({
      title: 'Remove Item?',
      text: 'Remove this item mapping from the selected node?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel'
    });
    if (!confirm.isConfirmed) return;

    try {
      const response = await axios.delete(`/api/merchandise-hierarchy/items/${mappingId}`, {
        headers: getAuthHeaders()
      });
      if (!response.data?.success) {
        await Swal.fire('Error', response.data?.message || 'Failed to remove mapped item', 'error');
        return;
      }
      await fetchTree(selectedNode?.id || null);
      if (selectedNode?.id) {
        await fetchSelectedNodeData(selectedNode.id);
      }
    } catch (err) {
      console.error('Error removing mapped item', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      await Swal.fire('Error', err.response?.data?.message || 'Failed to remove mapped item', 'error');
    }
  };

  const renderTreeNodes = (nodes, depth = 0) => (
    (Array.isArray(nodes) ? nodes : []).map((node) => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const isExpanded = searchQuery ? true : expandedIds.has(node.id);
      const isSelected = selectedNodeId === node.id;
      const matchesSearch = searchQuery && (
        String(node.nodeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(node.nodeCode || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      return (
        <div key={node.id}>
          <div
            className={`merch-tree-row ${isSelected ? 'selected' : ''} ${matchesSearch ? 'matched' : ''}`}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
          >
            <button
              type="button"
              className="merch-tree-toggle"
              onClick={() => hasChildren && toggleExpanded(node.id)}
              disabled={!hasChildren}
              aria-label={hasChildren ? (isExpanded ? 'Collapse node' : 'Expand node') : 'Leaf node'}
            >
              {hasChildren ? (isExpanded ? '-' : '+') : ''}
            </button>
            <button
              type="button"
              className="merch-tree-select"
              onClick={() => setSelectedNodeId(node.id)}
            >
              <span className="merch-tree-folder">{hasChildren ? '[]' : '.'}</span>
              <span className="merch-tree-name">{node.nodeName}</span>
              <span className="merch-tree-meta">
                {node.nodeCode} | Items: {node.itemCount} | Child: {node.childCount}
              </span>
            </button>
          </div>
          {hasChildren && isExpanded ? renderTreeNodes(node.children, depth + 1) : null}
        </div>
      );
    })
  );

  return (
    <div className="merchandise-hierarchy-page">
      <div className="merchandise-hierarchy-header">
        <div>
          <button type="button" className="back-button" onClick={() => navigate(-1)}>Back</button>
          <h1>Merchandise Hierarchy</h1>
        </div>
        <div className="merchandise-toolbar">
          <button type="button" className="toolbar-btn" onClick={openCreateRootModal}>New Root</button>
          <button type="button" className="toolbar-btn" onClick={() => fetchTree(selectedNodeId)}>Refresh</button>
          <button type="button" className="toolbar-btn" onClick={handleExpandAll}>Expand All</button>
          <button type="button" className="toolbar-btn" onClick={handleCollapseAll}>Collapse All</button>
          <input
            type="text"
            className="toolbar-search"
            placeholder="Search node name or code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error ? <div className="merchandise-error">{error}</div> : null}

      <div className="merchandise-layout">
        <div className="merchandise-tree-panel">
          <div className="panel-title">Hierarchy Tree</div>
          {loading ? (
            <div className="panel-empty">Loading hierarchy...</div>
          ) : visibleTree.length === 0 ? (
            <div className="panel-empty">No nodes found</div>
          ) : (
            <div className="merchandise-tree-list">
              {renderTreeNodes(visibleTree)}
            </div>
          )}
        </div>

        <div className="merchandise-details-panel">
          <div className="details-header">
            <div className="panel-title">Node Information</div>
            <div className="details-actions">
              <button type="button" className="toolbar-btn" onClick={openCreateChildModal} disabled={!selectedNode}>New Child</button>
              <button type="button" className="toolbar-btn" onClick={openEditModal} disabled={!selectedNode}>Rename / Edit</button>
              <button
                type="button"
                className="toolbar-btn danger"
                onClick={handleDeleteNode}
                disabled={!selectedNode || selectedNode.parentId == null}
              >
                Delete
              </button>
            </div>
          </div>

          {detailsLoading ? (
            <div className="panel-empty">Loading node details...</div>
          ) : !selectedNode ? (
            <div className="panel-empty">Select a node to view details</div>
          ) : (
            <>
              <div className="details-grid">
                <div><strong>Node ID:</strong> {selectedNode.id}</div>
                <div><strong>Node Name:</strong> {selectedNode.nodeName}</div>
                <div><strong>Node Code:</strong> {selectedNode.nodeCode}</div>
                <div><strong>Parent:</strong> {selectedNode.parentName || 'Root'}</div>
                <div><strong>Level:</strong> {selectedNode.nodeLevel}</div>
                <div><strong>Status:</strong> {selectedNode.status ? 'Active' : 'Inactive'}</div>
                <div className="full-row"><strong>Hierarchy Path:</strong> {selectedNode.hierarchyPath}</div>
                <div><strong>Child Count:</strong> {selectedNode.childCount}</div>
                <div><strong>Item Count:</strong> {selectedNode.itemCount}</div>
                <div><strong>Created By:</strong> {selectedNode.createdBy || 'SYSTEM'}</div>
                <div><strong>Created At:</strong> {selectedNode.createdAt ? new Date(selectedNode.createdAt).toLocaleString() : ''}</div>
                <div><strong>Updated By:</strong> {selectedNode.updateBy || 'SYSTEM'}</div>
                <div><strong>Updated At:</strong> {selectedNode.updateAt ? new Date(selectedNode.updateAt).toLocaleString() : ''}</div>
              </div>

              <div className="mapped-items-header">
                <div className="panel-title">Mapped Items</div>
                <div className="details-actions">
                  <button type="button" className="toolbar-btn" onClick={openItemModal}>Add Item</button>
                  <button type="button" className="toolbar-btn" onClick={() => fetchSelectedNodeData(selectedNode.id)}>Refresh</button>
                </div>
              </div>

              <div className="mapped-items-table-wrap">
                <table className="mapped-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Brand</th>
                      <th>Size</th>
                      <th>Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="panel-empty">No mapped items</td>
                      </tr>
                    ) : mappedItems.map((item) => (
                      <tr key={item.mappingId}>
                        <td>{item.itemCode}</td>
                        <td>{item.itemName}</td>
                        <td>{item.brandName}</td>
                        <td>{item.size}</td>
                        <td>{item.categoryName}</td>
                        <td>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleRemoveMappedItem(item.mappingId)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showNodeModal ? (
        <div className="merch-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeNodeModal(); }}>
          <div className="merch-modal">
            <div className="merch-modal-header">
              <h2>
                {nodeModalMode === 'edit' ? 'Edit Node' : nodeModalMode === 'create-child' ? 'New Child Node' : 'New Root Node'}
              </h2>
              <button type="button" className="merch-close-btn" onClick={closeNodeModal}>X</button>
            </div>
            <form onSubmit={handleSaveNode} className="merch-modal-body">
              {nodeModalError ? <div className="merchandise-error">{nodeModalError}</div> : null}
              <label>
                Node Name
                <input
                  type="text"
                  name="nodeName"
                  value={nodeForm.nodeName}
                  onChange={handleNodeFormChange}
                  autoFocus
                />
              </label>
              <label>
                Node Code {nodeModalMode === 'edit' ? '' : '(blank to auto generate)'}
                <input
                  type="text"
                  name="nodeCode"
                  value={nodeForm.nodeCode}
                  onChange={handleNodeFormChange}
                />
              </label>
              <label>
                Sort Order
                <input
                  type="number"
                  name="sortOrder"
                  value={nodeForm.sortOrder}
                  onChange={handleNodeFormChange}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="status"
                  checked={nodeForm.status}
                  onChange={handleNodeFormChange}
                />
                Active
              </label>
              <div className="merch-modal-actions">
                <button type="button" className="toolbar-btn" onClick={handleSaveNode}>Save</button>
                <button type="button" className="toolbar-btn secondary" onClick={closeNodeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showItemModal ? (
        <div className="merch-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeItemModal(); }}>
          <div className="merch-modal large">
            <div className="merch-modal-header">
              <h2>Map Items To {selectedNode?.nodeName}</h2>
              <button type="button" className="merch-close-btn" onClick={closeItemModal}>X</button>
            </div>
            <div className="merch-modal-body">
              <div className="item-search-bar">
                <input
                  type="text"
                  placeholder="Search item by code or name"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchItems();
                    }
                  }}
                />
                <button type="button" className="toolbar-btn" onClick={searchItems}>Search</button>
              </div>

              <div className="item-search-results">
                {itemSearchLoading ? (
                  <div className="panel-empty">Searching items...</div>
                ) : itemSearchResults.length === 0 ? (
                  <div className="panel-empty">Search to load items</div>
                ) : (
                  <table className="mapped-items-table">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemSearchResults.map((item) => (
                        <tr key={item.itemCode}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedItemCodes.includes(item.itemCode)}
                              onChange={() => toggleItemSelection(item.itemCode)}
                            />
                          </td>
                          <td>{item.itemCode}</td>
                          <td>{item.itemName}</td>
                          <td>{item.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="merch-modal-actions">
                <button type="button" className="toolbar-btn" onClick={handleMapItems} disabled={selectedItemCodes.length === 0}>
                  Map Selected
                </button>
                <button type="button" className="toolbar-btn secondary" onClick={closeItemModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MerchandiseHierarchy;
