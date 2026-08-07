import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Filter, X } from 'lucide-react';
import DateInputButton from './DateInputButton';
import './ClosingStockReport.css';

const formatQty = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  return `${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const buildDefaultDates = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
};

const PriceSegmentReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultBackPath = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role === 'STORE USER' ? '/store-dashboard' : '/ho-reports';
    } catch {
      return '/ho-reports';
    }
  }, []);

  const searchParams = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const storeLocked = searchParams.get('lockedStore') === 'true';
  const lockedStoreCode = searchParams.get('storeCode') || '';

  const defaults = useMemo(() => buildDefaultDates(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [draftStartDate, setDraftStartDate] = useState(defaults.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaults.endDate);
  const [draftDistrictQuery, setDraftDistrictQuery] = useState('');
  const [draftStoreSearchInput, setDraftStoreSearchInput] = useState(storeLocked ? lockedStoreCode : '');
  const [draftDistrictResults, setDraftDistrictResults] = useState([]);
  const [showDraftDistrictSuggestions, setShowDraftDistrictSuggestions] = useState(false);
  const [focusedDraftDistrictIndex, setFocusedDraftDistrictIndex] = useState(-1);
  const [draftStoreResults, setDraftStoreResults] = useState([]);
  const [showDraftStoreSuggestions, setShowDraftStoreSuggestions] = useState(false);
  const [focusedDraftStoreIndex, setFocusedDraftStoreIndex] = useState(-1);
  const [draftMerchSelectedNode, setDraftMerchSelectedNode] = useState(null);
  const [draftMerchExpandedIds, setDraftMerchExpandedIds] = useState(() => new Set());
  const [draftSizeCode, setDraftSizeCode] = useState('');
  const [draftSelectedItems, setDraftSelectedItems] = useState([]);

  const [stores, setStores] = useState([]);
  const [sizes, setSizes] = useState([]);
  const districtOptions = useMemo(() => {
    return Array.from(new Set((stores || []).map(s => String(s?.district || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  const [districtQuery, setDistrictQuery] = useState('');
  const [storeSearchInput, setStoreSearchInput] = useState(storeLocked ? lockedStoreCode : '');
  const [sizeCode, setSizeCode] = useState('');
  const [merchSelectedNode, setMerchSelectedNode] = useState(null);

  const [selectedItems, setSelectedItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const itemDebounceRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [merchTree, setMerchTree] = useState([]);
  const [merchTreeLoading, setMerchTreeLoading] = useState(false);

  const [expandedDistricts, setExpandedDistricts] = useState(() => new Set());
  const [expandedStores, setExpandedStores] = useState(() => new Set());

  const tokenConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    }
  }), []);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [storesRes, sizesRes] = await Promise.all([
          axios.get('/api/stores', tokenConfig),
          axios.get('/api/sizes', tokenConfig)
        ]);
        const storeList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.stores || []);
        const sizeList = Array.isArray(sizesRes.data) ? sizesRes.data : (sizesRes.data?.sizes || []);
        setStores(storeList);
        setSizes(sizeList);
        if (storeLocked && lockedStoreCode) {
          const matched = storeList.find(s => String(s?.storeCode || '').trim() === String(lockedStoreCode || '').trim());
          if (matched) {
            setDistrictQuery(String(matched?.district || '').trim());
            setStoreSearchInput(String(matched?.storeCode || '').trim());
          }
        }
      } catch {
        setStores([]);
        setSizes([]);
      }
    };
    loadOptions();
  }, [lockedStoreCode, storeLocked, tokenConfig]);

  useEffect(() => {
    if (!showFiltersModal) return;
    if (merchTreeLoading) return;
    if (Array.isArray(merchTree) && merchTree.length > 0) return;
    const loadMerchTree = async () => {
      setMerchTreeLoading(true);
      try {
        const res = await axios.get('/api/merchandise-hierarchy/tree', tokenConfig);
        if (res.data?.success) {
          const tree = Array.isArray(res.data.tree) ? res.data.tree : [];
          setMerchTree(tree);
          setDraftMerchExpandedIds((prev) => {
            if (prev && prev.size > 0) return prev;
            const next = new Set();
            tree.forEach((n) => {
              if (n?.id != null) next.add(n.id);
            });
            return next;
          });
        } else {
          setMerchTree([]);
        }
      } catch {
        setMerchTree([]);
      } finally {
        setMerchTreeLoading(false);
      }
    };
    loadMerchTree();
  }, [merchTree, merchTreeLoading, showFiltersModal, tokenConfig]);

  useEffect(() => {
    window.clearTimeout(itemDebounceRef.current);
    if (!showFiltersModal) {
      setItemResults([]);
      setItemLoading(false);
      return undefined;
    }
    const q = String(itemSearch || '').trim();
    if (q.length < 2) {
      setItemResults([]);
      setItemLoading(false);
      return undefined;
    }
    itemDebounceRef.current = window.setTimeout(async () => {
      try {
        setItemLoading(true);
        const res = await axios.get('/api/items/search', {
          ...tokenConfig,
          params: { query: q }
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setItemResults(items.slice(0, 100));
      } catch {
        setItemResults([]);
      } finally {
        setItemLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(itemDebounceRef.current);
  }, [itemSearch, showFiltersModal, tokenConfig]);

  const selectedItemCodesCsv = useMemo(() => {
    const codes = (selectedItems || []).map(i => String(i?.itemCode || '').trim()).filter(Boolean);
    return codes.join(',');
  }, [selectedItems]);

  const fetchData = useCallback(async (overrides) => {
    const sd = overrides?.startDate ?? startDate;
    const ed = overrides?.endDate ?? endDate;
    const dist = overrides?.districtQuery ?? districtQuery;
    const store = overrides?.storeSearchInput ?? storeSearchInput;
    const itemsCsv = overrides?.selectedItemCodesCsv ?? selectedItemCodesCsv;
    const sz = overrides?.sizeCode ?? sizeCode;

    if (!sd || !ed) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/reports/sales/price-segment', {
        ...tokenConfig,
        params: {
          startDate: sd,
          endDate: ed,
          district: dist,
          storeName: store,
          itemCodes: itemsCsv,
          sizeCode: sz
        }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
      setExpandedDistricts(new Set());
      setExpandedStores(new Set());
    } catch {
      setRows([]);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [districtQuery, endDate, selectedItemCodesCsv, sizeCode, startDate, storeSearchInput, tokenConfig]);

  const autoSearchDoneRef = useRef(false);
  useEffect(() => {
    if (autoSearchDoneRef.current) return;
    if (!startDate || !endDate) return;
    if (storeLocked && lockedStoreCode && !storeSearchInput) return;
    autoSearchDoneRef.current = true;
    fetchData();
  }, [endDate, fetchData, lockedStoreCode, startDate, storeLocked, storeSearchInput]);

  const openFilters = useCallback(() => {
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftDistrictQuery(districtQuery);
    setDraftStoreSearchInput(storeSearchInput);
    setDraftMerchSelectedNode(merchSelectedNode);
    setDraftSizeCode(sizeCode);
    setDraftSelectedItems(selectedItems);
    setItemSearch('');
    setItemResults([]);
    setShowFiltersModal(true);
  }, [districtQuery, endDate, merchSelectedNode, selectedItems, sizeCode, startDate, storeSearchInput]);

  const closeFilters = useCallback(() => {
    setShowFiltersModal(false);
    setItemSearch('');
    setItemResults([]);
    setShowDraftDistrictSuggestions(false);
    setShowDraftStoreSuggestions(false);
  }, []);

  const applyFilters = useCallback(async () => {
    let nextSelectedItems = Array.isArray(draftSelectedItems) ? [...draftSelectedItems] : [];
    if (draftMerchSelectedNode?.id != null) {
      try {
        const res = await axios.get(`/api/merchandise-hierarchy/${draftMerchSelectedNode.id}/items`, tokenConfig);
        if (res.data?.success && Array.isArray(res.data.items)) {
          for (const it of res.data.items) {
            const code = String(it?.itemCode || '').trim();
            if (!code) continue;
            if (nextSelectedItems.some((x) => String(x?.itemCode || '').trim() === code)) continue;
            nextSelectedItems.push({ itemCode: code, itemName: String(it?.itemName || code).trim() });
          }
        }
      } catch {}
    }

    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setDistrictQuery(draftDistrictQuery);
    setStoreSearchInput(draftStoreSearchInput);
    setSizeCode(draftSizeCode);
    setMerchSelectedNode(draftMerchSelectedNode);
    setSelectedItems(nextSelectedItems);
    setShowFiltersModal(false);
    setItemSearch('');
    setItemResults([]);
    setShowDraftDistrictSuggestions(false);
    setShowDraftStoreSuggestions(false);

    const csv = (nextSelectedItems || []).map(i => String(i?.itemCode || '').trim()).filter(Boolean).join(',');
    fetchData({
      startDate: draftStartDate,
      endDate: draftEndDate,
      districtQuery: draftDistrictQuery,
      storeSearchInput: draftStoreSearchInput,
      sizeCode: draftSizeCode,
      selectedItemCodesCsv: csv
    });
  }, [draftDistrictQuery, draftEndDate, draftMerchSelectedNode, draftSelectedItems, draftSizeCode, draftStartDate, draftStoreSearchInput, fetchData, tokenConfig]);

  const filteredDraftDistrictResults = useMemo(() => {
    const q = String(draftDistrictQuery || '').trim().toLowerCase();
    const all = Array.isArray(districtOptions) ? districtOptions : [];
    if (!q) return all.slice(0, 100);
    return all.filter((d) => String(d || '').toLowerCase().includes(q)).slice(0, 100);
  }, [districtOptions, draftDistrictQuery]);

  const filteredDraftStoreResults = useMemo(() => {
    const q = String(draftStoreSearchInput || '').trim().toLowerCase();
    const dist = String(draftDistrictQuery || '').trim();
    const all = Array.isArray(stores) ? stores : [];
    const districtFiltered = dist
      ? all.filter((s) => String(s?.district || '').trim() === dist)
      : all;
    if (!q) return districtFiltered.slice(0, 100);
    return districtFiltered.filter((s) => {
      const name = String(s?.storeName || '').toLowerCase();
      const code = String(s?.storeCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }).slice(0, 100);
  }, [draftDistrictQuery, draftStoreSearchInput, stores]);

  useEffect(() => {
    if (!showFiltersModal) return;
    setDraftDistrictResults(filteredDraftDistrictResults);
    setDraftStoreResults(filteredDraftStoreResults);
  }, [filteredDraftDistrictResults, filteredDraftStoreResults, showFiltersModal]);

  const selectDraftDistrict = useCallback((district) => {
    const nextDistrict = String(district || '').trim();
    setDraftDistrictQuery(nextDistrict);
    setShowDraftDistrictSuggestions(false);
    setFocusedDraftDistrictIndex(-1);
    if (!nextDistrict) return;
    const currentStore = String(draftStoreSearchInput || '').trim();
    if (!currentStore) return;
    const match = (stores || []).find((s) => String(s?.storeCode || '').trim() === currentStore);
    if (!match) return;
    if (String(match?.district || '').trim() !== nextDistrict) {
      setDraftStoreSearchInput('');
    }
  }, [draftStoreSearchInput, stores]);

  const selectDraftStore = useCallback((store) => {
    const code = String(store?.storeCode || '').trim();
    if (!code) return;
    setDraftStoreSearchInput(code);
    setShowDraftStoreSuggestions(false);
    setFocusedDraftStoreIndex(-1);
  }, []);

  const toggleDraftMerchExpanded = useCallback((id) => {
    if (id == null) return;
    setDraftMerchExpandedIds((prev) => {
      const next = new Set(prev || []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderMerchNodes = useCallback((nodes, level = 0) => {
    const list = Array.isArray(nodes) ? nodes : [];
    return list.map((node) => {
      const id = node?.id;
      const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
      const expanded = id != null && draftMerchExpandedIds.has(id);
      const selected = draftMerchSelectedNode?.id != null && id != null && String(draftMerchSelectedNode.id) === String(id);
      return (
        <React.Fragment key={String(id ?? node?.nodeCode ?? node?.nodeName ?? Math.random())}>
          <div
            onMouseDown={() => setDraftMerchSelectedNode(node)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: selected ? '#dbeafe' : 'transparent',
              cursor: 'pointer',
              marginLeft: level * 18
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleDraftMerchExpanded(id);
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {expanded ? '-' : '+'}
              </button>
            ) : (
              <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700 }}>
                ·
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>[ ]</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{String(node?.nodeName || '').trim() || String(node?.nodeCode || '').trim()}</span>
              </div>
            </div>
          </div>
          {hasChildren && expanded ? renderMerchNodes(node.children, level + 1) : null}
        </React.Fragment>
      );
    });
  }, [draftMerchExpandedIds, draftMerchSelectedNode, toggleDraftMerchExpanded]);

  const districtGroups = useMemo(() => {
    const byDistrict = new Map();
    for (const r of (rows || [])) {
      const district = String(r?.districtName || '').trim() || 'Unknown';
      const storeCode = String(r?.storeCode || '').trim();
      const storeName = String(r?.storeName || '').trim() || storeCode;
      const storeKey = `${district}||${storeCode}`;
      let dg = byDistrict.get(district);
      if (!dg) {
        dg = {
          district,
          stores: new Map(),
          inwardQty: 0,
          saleQty: 0
        };
        byDistrict.set(district, dg);
      }
      let sg = dg.stores.get(storeKey);
      if (!sg) {
        sg = {
          storeKey,
          storeCode,
          storeName,
          details: [],
          inwardQty: 0,
          saleQty: 0
        };
        dg.stores.set(storeKey, sg);
      }

      const inward = Number(r?.inwardQty || 0);
      const sale = Number(r?.saleQty || 0);
      sg.inwardQty += inward;
      sg.saleQty += sale;
      dg.inwardQty += inward;
      dg.saleQty += sale;

      sg.details.push({
        district,
        storeKey,
        storeCode,
        storeName,
        itemCode: String(r?.itemCode || '').trim(),
        itemName: String(r?.itemName || '').trim(),
        sizeCode: String(r?.sizeCode || '').trim(),
        sizeName: String(r?.sizeName || '').trim(),
        inwardQty: inward,
        saleQty: sale,
        contributionInStore: Number(r?.contributionInStore || 0),
        contributionInTotal: Number(r?.contributionInTotal || 0)
      });
    }

    const list = Array.from(byDistrict.values()).map((d) => ({
      district: d.district,
      inwardQty: d.inwardQty,
      saleQty: d.saleQty,
      stores: Array.from(d.stores.values()).sort((a, b) => String(a.storeName).localeCompare(String(b.storeName)))
    })).sort((a, b) => String(a.district).localeCompare(String(b.district)));

    return list;
  }, [rows]);

  const totalSaleQty = useMemo(() => districtGroups.reduce((sum, d) => sum + Number(d.saleQty || 0), 0), [districtGroups]);
  const totalInwardQty = useMemo(() => districtGroups.reduce((sum, d) => sum + Number(d.inwardQty || 0), 0), [districtGroups]);

  const allDistrictKeys = useMemo(() => districtGroups.map(d => d.district), [districtGroups]);
  const allStoreKeys = useMemo(() => {
    const keys = [];
    for (const d of districtGroups) {
      for (const s of (d.stores || [])) keys.push(s.storeKey);
    }
    return keys;
  }, [districtGroups]);

  const allExpanded = useMemo(() => {
    if (!allDistrictKeys.length) return false;
    const distOk = allDistrictKeys.every((d) => expandedDistricts.has(d));
    const storeOk = allStoreKeys.every((k) => expandedStores.has(k));
    return distOk && storeOk;
  }, [allDistrictKeys, allStoreKeys, expandedDistricts, expandedStores]);

  const toggleDistrict = useCallback((district) => {
    if (!district) return;
    setExpandedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(district)) next.delete(district);
      else next.add(district);
      return next;
    });
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (expandedDistricts.has(district)) {
        for (const k of allStoreKeys) {
          if (String(k).startsWith(`${district}||`)) next.delete(k);
        }
      }
      return next;
    });
  }, [allStoreKeys, expandedDistricts]);

  const toggleStore = useCallback((storeKey) => {
    if (!storeKey) return;
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeKey)) next.delete(storeKey);
      else next.add(storeKey);
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedDistricts(new Set());
      setExpandedStores(new Set());
      return;
    }
    setExpandedDistricts(new Set(allDistrictKeys));
    setExpandedStores(new Set(allStoreKeys));
  }, [allDistrictKeys, allExpanded, allStoreKeys]);

  const displayedRows = useMemo(() => {
    const out = [];
    for (const d of districtGroups) {
      const districtContribution = totalSaleQty ? (Number(d.saleQty || 0) * 100) / totalSaleQty : 0;
      out.push({
        type: 'district',
        key: `d||${d.district}`,
        district: d.district,
        storeName: '',
        itemName: '',
        sizeName: '',
        inwardQty: d.inwardQty,
        saleQty: d.saleQty,
        contributionInStore: 0,
        contributionInTotal: districtContribution
      });
      if (!expandedDistricts.has(d.district)) continue;
      for (const s of (d.stores || [])) {
        const storeContribution = totalSaleQty ? (Number(s.saleQty || 0) * 100) / totalSaleQty : 0;
        const storeContributionInDistrict = Number(d.saleQty || 0) ? (Number(s.saleQty || 0) * 100) / Number(d.saleQty || 0) : 0;
        out.push({
          type: 'store',
          key: `s||${s.storeKey}`,
          district: d.district,
          storeKey: s.storeKey,
          storeName: s.storeName,
          itemName: '',
          sizeName: '',
          inwardQty: s.inwardQty,
          saleQty: s.saleQty,
          contributionInDistrict: storeContributionInDistrict,
          contributionInStore: 0,
          contributionInTotal: storeContribution
        });
        if (!expandedStores.has(s.storeKey)) continue;
        for (let i = 0; i < (s.details || []).length; i++) {
          const r = s.details[i];
          out.push({
            type: 'detail',
            key: `r||${s.storeKey}||${r.itemCode}||${r.sizeCode}||${i}`,
            district: d.district,
            storeKey: s.storeKey,
            storeName: s.storeName,
            itemName: r.itemName,
            sizeName: r.sizeName,
            inwardQty: r.inwardQty,
            saleQty: r.saleQty,
            contributionInDistrict: 0,
            contributionInStore: r.contributionInStore,
            contributionInTotal: r.contributionInTotal
          });
        }
      }
    }
    return out;
  }, [districtGroups, expandedDistricts, expandedStores, totalSaleQty]);

  const viewMode = useMemo(() => {
    if (expandedDistricts.size === 0) return 'district';
    const hasDetail = (displayedRows || []).some((r) => r?.type === 'detail');
    return hasDetail ? 'detail' : 'store';
  }, [displayedRows, expandedDistricts.size]);

  const visibleColumns = useMemo(() => {
    if (viewMode === 'district') {
      return ['districtName', 'inwardQty', 'saleQty', 'contributionInTotal'];
    }
    if (viewMode === 'store') {
      return ['districtName', 'storeName', 'inwardQty', 'saleQty', 'contributionInDistrict', 'contributionInTotal'];
    }
    return ['districtName', 'storeName', 'itemName', 'sizeName', 'inwardQty', 'saleQty', 'contributionInStore', 'contributionInTotal'];
  }, [viewMode]);

  const visibleColumnLabels = useMemo(() => ({
    districtName: 'District',
    storeName: 'Store Name',
    itemName: 'Item Name',
    sizeName: 'Size Name',
    inwardQty: 'Inward Qty',
    saleQty: 'Sale Qty',
    contributionInDistrict: 'Contribution In District',
    contributionInStore: 'Contribution In Store',
    contributionInTotal: viewMode === 'district' ? 'Contribution' : 'Contribution In Total'
  }), [viewMode]);

  const downloadExcel = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setError('');
    try {
      const resolveContributionInDistrict = (r) => {
        if (!r) return null;
        if (r.type === 'store') return r.contributionInDistrict != null ? Number(r.contributionInDistrict) : 0;
        if (r.type === 'district' || r.type === 'grand') return 100;
        return null;
      };

      const resolveContributionInStore = (r) => {
        if (!r) return null;
        if (r.type === 'detail') return r.contributionInStore != null ? Number(r.contributionInStore) : 0;
        if (r.type === 'store' || r.type === 'grand') return 100;
        return null;
      };

      const payload = {
        columns: visibleColumns,
        rows: [
          ...(displayedRows || []).map((r) => ({
          rowType: r?.type || '',
          districtName: r?.district || '',
          storeName: r?.storeName || '',
          itemName: r?.itemName || '',
          sizeName: r?.sizeName || '',
          inwardQty: r?.inwardQty != null ? Number(r.inwardQty) : null,
          saleQty: r?.saleQty != null ? Number(r.saleQty) : null,
          contributionInDistrict: visibleColumns.includes('contributionInDistrict') ? resolveContributionInDistrict(r) : null,
          contributionInStore: visibleColumns.includes('contributionInStore') ? resolveContributionInStore(r) : null,
          contributionInTotal: r?.contributionInTotal != null ? Number(r.contributionInTotal) : null
          })),
          ...(displayedRows && displayedRows.length > 0 ? [{
            rowType: 'grand',
            districtName: 'Grand Total',
            storeName: '',
            itemName: '',
            sizeName: '',
            inwardQty: Number(totalInwardQty || 0),
            saleQty: Number(totalSaleQty || 0),
            contributionInDistrict: visibleColumns.includes('contributionInDistrict') ? 100 : null,
            contributionInStore: visibleColumns.includes('contributionInStore') ? 100 : null,
            contributionInTotal: 100
          }] : [])
        ]
      };

      const response = await axios.post('/api/reports/sales/price-segment/export-view', payload, {
        ...tokenConfig,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `price_segment_report_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download excel');
    } finally {
      setExporting(false);
    }
  }, [displayedRows, endDate, exporting, startDate, tokenConfig, totalInwardQty, totalSaleQty, visibleColumns]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (showFiltersModal) return;
      const k = String(e.key || '').toLowerCase();
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (k === 'e') {
        e.preventDefault();
        toggleExpandAll();
        return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showFiltersModal, toggleExpandAll]);

  const addItem = (item) => {
    const code = String(item?.itemCode || '').trim();
    if (!code) return;
    setDraftSelectedItems((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      if (existing.some((i) => String(i?.itemCode || '').trim() === code)) return existing;
      return [...existing, { itemCode: code, itemName: String(item?.itemName || code).trim() }];
    });
    setItemSearch('');
    setItemResults([]);
  };

  const removeItem = (code) => {
    const c = String(code || '').trim();
    setDraftSelectedItems((prev) => (Array.isArray(prev) ? prev.filter(i => String(i?.itemCode || '').trim() !== c) : []));
  };

  return (
    <div className="report-container stock-ledger-container stock-ledger-report">
      <header className="report-header">
        <button className="back-btn" onClick={() => navigate(defaultBackPath)}>Back</button>
        <h1 className="stock-ledger-title">Price Segment Report</h1>
        <div className="stock-ledger-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="export-btn stock-ledger-export-btn" onClick={toggleExpandAll} disabled={loading || districtGroups.length === 0}>
            <span>{allExpanded ? 'Collapse All (ALT+E)' : 'Expand All (ALT+E)'}</span>
          </button>
          <button className="export-btn stock-ledger-export-btn" onClick={openFilters} disabled={loading}>
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="export-btn stock-ledger-export-btn" onClick={fetchData} disabled={loading}>
            <span>Search</span>
          </button>
          <button className="export-btn stock-ledger-export-btn" onClick={downloadExcel} disabled={loading || exporting || rows.length === 0}>
            <Download size={18} />
            <span>{exporting ? 'Exporting' : 'Export'}</span>
          </button>
        </div>
      </header>

      {error && <div className="error-msg">{error}</div>}

      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              {visibleColumns.map((key) => {
                const isNum = key === 'inwardQty'
                  || key === 'saleQty'
                  || key === 'contributionInDistrict'
                  || key === 'contributionInStore'
                  || key === 'contributionInTotal';
                return (
                  <th key={key} className={isNum ? 'text-right' : ''}>
                    {visibleColumnLabels[key] || key}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r) => {
              const isDistrict = r.type === 'district';
              const isStore = r.type === 'store';
              const isDetail = r.type === 'detail';
              const indent = isStore ? 18 : isDetail ? 36 : 0;
              const expanded = isDistrict
                ? expandedDistricts.has(r.district)
                : isStore
                  ? expandedStores.has(r.storeKey)
                  : false;
              const expSymbol = (isDistrict || isStore) ? (expanded ? '▾' : '▸') : '';
              const rowClass = isDistrict ? 'district-total-row' : isStore ? 'font-bold' : '';
              const onRowClick = () => {
                if (loading) return;
                if (isDistrict) toggleDistrict(r.district);
                else if (isStore) toggleStore(r.storeKey);
              };

              return (
                <tr
                  key={r.key}
                  className={rowClass}
                  onClick={isDistrict || isStore ? onRowClick : undefined}
                  style={isDistrict || isStore ? { cursor: 'pointer' } : undefined}
                >
                  {visibleColumns.map((key) => {
                    if (key === 'districtName') {
                      return (
                        <td key={key}>
                          {isDistrict ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleDistrict(r.district);
                              }}
                              disabled={loading}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: 18, marginRight: 6 }}
                            >
                              {expSymbol}
                            </button>
                          ) : (
                            <span style={{ display: 'inline-block', width: 24 }} />
                          )}
                          <span>{r.district}</span>
                        </td>
                      );
                    }
                    if (key === 'storeName') {
                      return (
                        <td key={key}>
                          {isStore ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleStore(r.storeKey);
                              }}
                              disabled={loading}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: 18, marginLeft: indent, marginRight: 6 }}
                            >
                              {expSymbol}
                            </button>
                          ) : (
                            <span style={{ display: 'inline-block', width: indent + 24 }} />
                          )}
                          <span>{isStore || isDetail ? r.storeName : ''}</span>
                        </td>
                      );
                    }
                    if (key === 'itemName') {
                      return <td key={key}>{isDetail ? r.itemName : ''}</td>;
                    }
                    if (key === 'sizeName') {
                      return <td key={key}>{isDetail ? r.sizeName : ''}</td>;
                    }
                    if (key === 'inwardQty') {
                      return <td key={key} className="text-right">{formatQty(r.inwardQty)}</td>;
                    }
                    if (key === 'saleQty') {
                      return <td key={key} className="text-right">{formatQty(r.saleQty)}</td>;
                    }
                    if (key === 'contributionInDistrict') {
                      const v = isStore ? r.contributionInDistrict : (isDistrict ? 100 : '');
                      return <td key={key} className="text-right">{v === '' ? '' : formatPercent(v)}</td>;
                    }
                    if (key === 'contributionInStore') {
                      const v = isDetail ? r.contributionInStore : (isStore ? 100 : '');
                      return <td key={key} className="text-right">{v === '' ? '' : formatPercent(v)}</td>;
                    }
                    if (key === 'contributionInTotal') {
                      return <td key={key} className="text-right">{formatPercent(r.contributionInTotal)}</td>;
                    }
                    return <td key={key} />;
                  })}
                </tr>
              );
            })}
            {displayedRows.length === 0 && !loading && (
              <tr>
                <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '18px' }}>
                  No data
                </td>
              </tr>
            )}
            {displayedRows.length > 0 && (
              <tr className="district-total-row">
                {visibleColumns.map((key, idx) => {
                  if (key === 'districtName') return <td key={key}><span>Grand Total</span></td>;
                  if (key === 'storeName') return <td key={key} />;
                  if (key === 'itemName') return <td key={key} />;
                  if (key === 'sizeName') return <td key={key} />;
                  if (key === 'inwardQty') return <td key={key} className="text-right">{formatQty(totalInwardQty)}</td>;
                  if (key === 'saleQty') return <td key={key} className="text-right">{formatQty(totalSaleQty)}</td>;
                  if (key === 'contributionInDistrict') return <td key={key} className="text-right">{formatPercent(100)}</td>;
                  if (key === 'contributionInStore') return <td key={key} className="text-right">{formatPercent(100)}</td>;
                  if (key === 'contributionInTotal') return <td key={key} className="text-right">{displayedRows.length ? formatPercent(100) : ''}</td>;
                  return <td key={`${key}-${idx}`} />;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showFiltersModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[20000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeFilters();
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-slate-800">Filters</div>
              <button
                type="button"
                onClick={closeFilters}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>From Date</label>
                  <DateInputButton
                    value={draftStartDate}
                    onChange={setDraftStartDate}
                    wrapperClassName="relative"
                    buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
                  />
                </div>
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>To Date</label>
                  <DateInputButton
                    value={draftEndDate}
                    onChange={setDraftEndDate}
                    wrapperClassName="relative"
                    buttonClassName="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-left text-sm text-slate-700"
                  />
                </div>
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>District</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={draftDistrictQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftDistrictQuery(v);
                        setShowDraftDistrictSuggestions(true);
                        setFocusedDraftDistrictIndex(0);
                      }}
                      onFocus={() => {
                        setShowDraftDistrictSuggestions(true);
                        setFocusedDraftDistrictIndex(0);
                      }}
                      onBlur={() => window.setTimeout(() => setShowDraftDistrictSuggestions(false), 150)}
                      placeholder="Search..."
                      autoComplete="off"
                      disabled={storeLocked}
                    />
                    {showDraftDistrictSuggestions && draftDistrictResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {draftDistrictResults.map((d, idx) => (
                          <div
                            key={d}
                            onMouseDown={() => selectDraftDistrict(d)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedDraftDistrictIndex ? '#eef2ff' : '#fff' }}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>Store</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={draftStoreSearchInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftStoreSearchInput(v);
                        setShowDraftStoreSuggestions(true);
                        setFocusedDraftStoreIndex(0);
                      }}
                      onFocus={() => {
                        setShowDraftStoreSuggestions(true);
                        setFocusedDraftStoreIndex(0);
                      }}
                      onBlur={() => window.setTimeout(() => setShowDraftStoreSuggestions(false), 150)}
                      placeholder="Code or name"
                      autoComplete="off"
                      disabled={storeLocked}
                    />
                    {showDraftStoreSuggestions && draftStoreResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {draftStoreResults.map((s, idx) => (
                          <div
                            key={`${String(s?.storeCode || idx)}-${idx}`}
                            onMouseDown={() => selectDraftStore(s)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx === focusedDraftStoreIndex ? '#eff6ff' : '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                          >
                            <span>{String(s?.storeName || '').trim()}</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                              {String(s?.storeCode || '').trim()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>Price Segment</label>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>Hierarchy Tree</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        {draftMerchSelectedNode?.nodeName ? `Selected: ${String(draftMerchSelectedNode.nodeName).trim()}` : 'Selected: All'}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
                      {merchTreeLoading ? (
                        <div style={{ padding: 12, color: '#64748b' }}>Loading...</div>
                      ) : (
                        renderMerchNodes(merchTree, 0)
                      )}
                      {!merchTreeLoading && (!Array.isArray(merchTree) || merchTree.length === 0) ? (
                        <div style={{ padding: 12, color: '#64748b' }}>No hierarchy</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>Item Name (Multi)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Type 2+ chars"
                      autoComplete="off"
                    />
                    {!itemLoading && itemResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                        {itemResults.map((it, idx) => (
                          <div
                            key={`${String(it?.itemCode || idx)}-${idx}`}
                            onMouseDown={() => addItem(it)}
                            style={{ padding: '8px 10px', cursor: 'pointer', background: idx % 2 ? '#fff' : '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: 12 }}
                          >
                            <span>{String(it?.itemName || it?.itemCode || '').trim()}</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                              {String(it?.itemCode || '').trim()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {draftSelectedItems.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        maxHeight: 130,
                        overflowY: 'auto',
                        background: '#f8fafc'
                      }}
                    >
                      {draftSelectedItems.map((it, idx) => (
                        <div
                          key={String(it?.itemCode || idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '6px 10px',
                            borderBottom: idx === draftSelectedItems.length - 1 ? 'none' : '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(it?.itemName || it?.itemCode || '').trim()}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{String(it?.itemCode || '').trim()}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(it.itemCode)}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              borderRadius: 8,
                              padding: '2px 8px',
                              cursor: 'pointer'
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="filter-group" style={{ margin: 0, minWidth: 0 }}>
                  <label>Size</label>
                  <select value={draftSizeCode} onChange={(e) => setDraftSizeCode(e.target.value)}>
                    <option value="">All</option>
                    {(sizes || []).map((s) => (
                      <option key={String(s?.code || s?.id || '')} value={String(s?.code || '').trim()}>
                        {String(s?.name || s?.code || '').trim()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button type="button" className="export-btn stock-ledger-export-btn" onClick={closeFilters}>
                <span>Cancel</span>
              </button>
              <button type="button" className="export-btn stock-ledger-export-btn" onClick={applyFilters}>
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceSegmentReport;
