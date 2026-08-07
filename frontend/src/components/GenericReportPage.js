import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Search, X } from 'lucide-react';
import ChangePeriodModal from './ChangePeriodModal';
import './HOReportsDashboard.css';

const GENERIC_REPORT_STATE_PREFIX = 'genericReportState:v1:';

const loadGenericReportState = (reportId) => {
  if (!reportId) return null;
  try {
    const raw = sessionStorage.getItem(`${GENERIC_REPORT_STATE_PREFIX}${reportId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const saveGenericReportState = (reportId, state) => {
  if (!reportId) return;
  try {
    sessionStorage.setItem(`${GENERIC_REPORT_STATE_PREFIX}${reportId}`, JSON.stringify(state));
  } catch {}
};

const toDdMmYyyy = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const isNumericDataType = (dataType) => {
  const type = String(dataType || '').toUpperCase();
  return ['NUMBER', 'INTEGER', 'INT', 'LONG', 'BIGINT', 'SMALLINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'AMOUNT'].includes(type);
};

const isDecimalDataType = (dataType) => {
  const type = String(dataType || '').toUpperCase();
  return ['DECIMAL', 'DOUBLE', 'FLOAT', 'AMOUNT'].includes(type);
};

const GenericReportPage = ({ reportId: propReportId, onClose, isModal = false }) => {
  const navigate = useNavigate();
  const { reportId: routeReportId } = useParams();
  const [searchParams] = useSearchParams();
  const reportId = propReportId || routeReportId;

  const [reportMaster, setReportMaster] = useState(null);
  const [filters, setFilters] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [filterOptionErrors, setFilterOptionErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
  const [hiddenRowKeys, setHiddenRowKeys] = useState(() => new Set());
  const [hiddenRowOrder, setHiddenRowOrder] = useState(() => []);

  const dateInputRefs = useRef({});
  const tableContainerRef = useRef(null);
  const searchActionRef = useRef(null);
  const exportActionRef = useRef(null);
  const searchButtonRef = useRef(null);
  const filterInputRefs = useRef({});
  const multiSelectOptionRefs = useRef({});
  const searchboxWrapRefs = useRef({});
  const multiSelectTypeaheadRef = useRef({});
  const isClosingRef = useRef(false);
  const dropdownControllersRef = useRef([]);
  const dropdownRequestSeqRef = useRef(0);
  const executeControllerRef = useRef(null);
  const exportControllerRef = useRef(null);
  const focusReturnRef = useRef(null);
  const [searchboxDisplayValues, setSearchboxDisplayValues] = useState({});
  const [searchboxSuggestionsOpen, setSearchboxSuggestionsOpen] = useState({});
  const [searchboxFocusedIndex, setSearchboxFocusedIndex] = useState({});
  const [multiSelectFocusedIndex, setMultiSelectFocusedIndex] = useState({});
  const descriptionText = String(reportMaster?.description || '').trim();

  const tokenConfig = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      'Content-Type': 'application/json'
    }
  }), []);

  const buildInitialValue = useCallback((filter) => {
    const rawDefault = String(filter?.defaultValue ?? '').trim();
    const filterType = String(filter?.type || '').toUpperCase();
    const lockedStoreCode = searchParams.get('storeCode') || '';
    const filterName = String(filter?.filterName || '').trim().toLowerCase();
    const parameterName = String(filter?.parameterName || '').trim().replace(/^@/, '').toLowerCase();
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const fyStartIso = new Date(fyStartYear, 3, 1).toISOString().split('T')[0];

    if (lockedStoreCode && (filterName === 'storecode' || parameterName === 'storecode' || parameterName === 'store')) {
      return filterType === 'MULTISELECT' ? [lockedStoreCode] : lockedStoreCode;
    }

    if (filterType === 'MULTISELECT') {
      if (!rawDefault) return [];
      return rawDefault.split(',').map(item => item.trim()).filter(Boolean);
    }

    if (filterType === 'DATE' && rawDefault) {
      return rawDefault;
    }

    if (filterType === 'DATE') {
      if (/(^|_)(from|start)(date)?$/.test(filterName) || /(from|start)date/.test(parameterName)) {
        return fyStartIso;
      }
      if (/(^|_)(to|end)(date)?$/.test(filterName) || /(to|end)date/.test(parameterName)) {
        return todayIso;
      }
    }

    return rawDefault;
  }, [searchParams]);

  const fetchDefinition = useCallback(async () => {
    if (!reportId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/generic-reports/${encodeURIComponent(reportId)}`, tokenConfig);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load report definition');
      }

      const report = response.data.reportMaster || null;
      const filterList = response.data.filters || [];
      const columnList = response.data.columns || [];
      const restoredState = loadGenericReportState(reportId);

      setReportMaster(report);
      setFilters(filterList);
      setColumns((columnList || []).map(col => ({
        key: col.columnName || col.key,
        label: col.columnHeader || col.label || col.columnName || col.key,
        dataType: col.dataType || 'TEXT',
        width: col.width ?? null,
        sortOrder: col.sortOrder ?? 0
      })));
      setRows([]);

      const initialValues = {};
      filterList.forEach(filter => {
        initialValues[filter.filterName] = buildInitialValue(filter);
      });

      if (restoredState?.filterValues && typeof restoredState.filterValues === 'object') {
        Object.entries(restoredState.filterValues).forEach(([key, value]) => {
          initialValues[key] = value;
        });
      }

      setFilterValues(initialValues);
      setRows(Array.isArray(restoredState?.rows) ? restoredState.rows : []);
      if (Array.isArray(restoredState?.columns) && restoredState.columns.length > 0) {
        setColumns(restoredState.columns);
      }
      if (Array.isArray(restoredState?.hiddenRowOrder)) {
        setHiddenRowOrder(restoredState.hiddenRowOrder.map(v => String(v || '')).filter(Boolean));
      } else {
        setHiddenRowOrder([]);
      }
      if (Array.isArray(restoredState?.hiddenRowKeys)) {
        setHiddenRowKeys(new Set(restoredState.hiddenRowKeys.map(v => String(v || '')).filter(Boolean)));
      } else {
        setHiddenRowKeys(new Set());
      }
      if (Array.isArray(restoredState?.selectedRowKeys)) {
        setSelectedRowKeys(new Set(restoredState.selectedRowKeys.map(v => String(v || '')).filter(Boolean)));
      }
      if (Number.isInteger(restoredState?.focusedRowIndex)) {
        setFocusedRowIndex(restoredState.focusedRowIndex);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Failed to load report definition'
      });
    } finally {
      setLoading(false);
    }
  }, [buildInitialValue, reportId, tokenConfig]);

  useEffect(() => {
    isClosingRef.current = false;
    fetchDefinition();
    return () => {
      isClosingRef.current = true;
      dropdownControllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch {}
      });
      dropdownControllersRef.current = [];
      try {
        executeControllerRef.current?.abort?.();
      } catch {}
      executeControllerRef.current = null;
      try {
        exportControllerRef.current?.abort?.();
      } catch {}
      exportControllerRef.current = null;
    };
  }, [fetchDefinition]);

  useEffect(() => {
    saveGenericReportState(reportId, {
      filterValues,
      rows,
      columns,
      hiddenRowKeys: Array.from(hiddenRowKeys || []),
      hiddenRowOrder: Array.isArray(hiddenRowOrder) ? hiddenRowOrder : [],
      selectedRowKeys: Array.from(selectedRowKeys || []),
      focusedRowIndex
    });
  }, [columns, filterValues, focusedRowIndex, hiddenRowKeys, hiddenRowOrder, reportId, rows, selectedRowKeys]);

  useEffect(() => {
    const loadDropdownOptions = async () => {
      if (!reportId || !filters.length) return;

      const dropdownFilters = filters.filter(filter => {
        const type = String(filter?.type || '').trim().toUpperCase();
        return (type === 'DROPDOWN' || type === 'MULTISELECT' || type === 'SEARCHBOX') && String(filter?.dropdownQuery || '').trim();
      });

      if (!dropdownFilters.length) {
        dropdownRequestSeqRef.current += 1;
        setDropdownOptions({});
        setFilterOptionErrors({});
        return;
      }

      try {
        const requestId = dropdownRequestSeqRef.current + 1;
        dropdownRequestSeqRef.current = requestId;
        dropdownControllersRef.current.forEach(controller => {
          try {
            controller.abort();
          } catch {}
        });
        dropdownControllersRef.current = [];

        const payload = {};
        filters.forEach(filter => {
          payload[filter.filterName] = filterValues[filter.filterName];
        });

        const results = await Promise.allSettled(
          dropdownFilters.map(async (filter) => {
            const controller = new AbortController();
            dropdownControllersRef.current.push(controller);
            const response = await axios.post(
              `/api/generic-reports/${encodeURIComponent(reportId)}/filter-options/${encodeURIComponent(filter.id)}`,
              payload,
              {
                ...tokenConfig,
                signal: controller.signal
              }
            );
            if (!response.data?.success) {
              throw new Error(response.data?.message || 'Failed to load options');
            }
            return [filter.filterName, response.data?.options || []];
          })
        );

        if (isClosingRef.current || requestId !== dropdownRequestSeqRef.current) return;
        const optionMap = {};
        const errorMap = {};
        results.forEach((result, index) => {
          const filter = dropdownFilters[index];
          if (!filter) return;
          if (result.status === 'fulfilled') {
            const [filterName, options] = result.value;
            optionMap[filterName] = Array.isArray(options) ? options : [];
            return;
          }
          if (result.reason?.code === 'ERR_CANCELED' || result.reason?.name === 'CanceledError') {
            return;
          }
          const filterName = filter.filterName;
          optionMap[filterName] = [];
          const message = result.reason?.response?.data?.message
            || result.reason?.message
            || 'Failed to load options';
          errorMap[filterName] = message;
        });
        if (!isClosingRef.current) {
          setDropdownOptions(optionMap);
          setFilterOptionErrors(errorMap);
        }
      } catch (error) {
        if (!isClosingRef.current && !(error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError')) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Failed to load dropdown options'
          });
        }
      }
    };

    loadDropdownOptions();
  }, [filterValues, filters, reportId, tokenConfig]);

  const handleInputChange = (filterName, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleMultiSelectToggle = useCallback((filterName, optionValue, checked) => {
    const normalizedValue = String(optionValue ?? '').trim();
    if (!normalizedValue) return;
    setFilterValues(prev => {
      const currentValues = Array.isArray(prev?.[filterName]) ? prev[filterName] : [];
      if (checked) {
        if (currentValues.includes(normalizedValue)) return prev;
        return {
          ...prev,
          [filterName]: [...currentValues, normalizedValue]
        };
      }
      return {
        ...prev,
        [filterName]: currentValues.filter(value => value !== normalizedValue)
      };
    });
  }, []);

  const handleMultiSelectSelectAll = useCallback((filterName, options) => {
    const values = (Array.isArray(options) ? options : [])
      .map(option => String(option?.value ?? '').trim())
      .filter(Boolean);
    handleInputChange(filterName, values);
  }, []);

  const handleMultiSelectClearAll = useCallback((filterName) => {
    handleInputChange(filterName, []);
  }, []);

  const focusMultiSelectOption = useCallback((filterName, index) => {
    if (!filterName || !Number.isInteger(index) || index < 0) return;
    setMultiSelectFocusedIndex(prev => ({
      ...prev,
      [filterName]: index
    }));
    const optionNode = multiSelectOptionRefs.current?.[filterName]?.[index];
    if (!optionNode) return;
    try {
      optionNode.focus();
      optionNode.scrollIntoView({ block: 'nearest' });
    } catch {}
  }, []);

  const handleCloseReport = useCallback(() => {
    isClosingRef.current = true;
    dropdownControllersRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch {}
    });
    dropdownControllersRef.current = [];
    try {
      executeControllerRef.current?.abort?.();
    } catch {}
    executeControllerRef.current = null;
    try {
      exportControllerRef.current?.abort?.();
    } catch {}
    exportControllerRef.current = null;
    try {
      document.activeElement?.blur?.();
    } catch {}
    if (onClose) {
      onClose();
      return;
    }
    navigate(-1);
  }, [navigate, onClose]);

  function getRowValue(row, key) {
    if (!row || !key) return '';
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    const matchedKey = Object.keys(row).find(item => String(item).toLowerCase() === String(key).toLowerCase());
    return matchedKey ? row[matchedKey] : '';
  }

  const selectableRowKeysAll = useMemo(() => (rows || []).map((_, index) => `gr:${index}`), [rows]);

  const selectableRowKeys = useMemo(() => {
    const keys = selectableRowKeysAll || [];
    if (!hiddenRowKeys || hiddenRowKeys.size === 0) return keys;
    return keys.filter(k => !hiddenRowKeys.has(k));
  }, [hiddenRowKeys, selectableRowKeysAll]);

  const getRowSearchText = useCallback((row) => {
    if (!row) return '';
    for (const col of columns) {
      const key = String(col?.key || '').trim();
      if (!key) continue;
      const raw = getRowValue(row, key);
      const txt = String(raw == null ? '' : raw).trim();
      if (txt) return txt;
    }
    const firstKey = Object.keys(row)[0];
    return String(firstKey ? row[firstKey] : '').trim();
  }, [columns]);

  const selectableRowSearch = useMemo(() => {
    const list = [];
    selectableRowKeys.forEach((k, idx) => {
      const rawIndex = Number(String(k).split(':')[1]);
      const row = Number.isFinite(rawIndex) ? rows?.[rawIndex] : null;
      const name = getRowSearchText(row);
      const normalized = String(name || '').trim().toLowerCase();
      list.push({ idx, normalized });
    });
    return list;
  }, [getRowSearchText, rows, selectableRowKeys]);

  const focusNextFilter = useCallback((filterName) => {
    if (isClosingRef.current) return;
    const currentIndex = filters.findIndex(filter => filter.filterName === filterName);
    for (let index = currentIndex + 1; index < filters.length; index += 1) {
      const nextFilterName = filters[index]?.filterName;
      const nextNode = nextFilterName ? filterInputRefs.current[nextFilterName] : null;
      if (!nextNode) continue;
      try {
        nextNode.focus();
        if (typeof nextNode.select === 'function') {
          nextNode.select();
        }
      } catch {}
      return;
    }
    try {
      searchButtonRef.current?.focus?.();
    } catch {}
  }, [filters]);

  const handleMultiSelectKeyDown = useCallback((filter, e, options) => {
    const filterName = String(filter?.filterName || '').trim();
    if (!filterName) return;

    const currentIndex = Number.isInteger(multiSelectFocusedIndex[filterName])
      ? multiSelectFocusedIndex[filterName]
      : -1;
    const normalizedOptions = Array.isArray(options) ? options : [];

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      focusNextFilter(filterName);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!normalizedOptions.length) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const baseIndex = currentIndex >= 0 ? currentIndex : (delta > 0 ? -1 : normalizedOptions.length);
      const nextIndex = Math.max(0, Math.min(normalizedOptions.length - 1, baseIndex + delta));
      focusMultiSelectOption(filterName, nextIndex);
      return;
    }

    if (e.key === 'Home' || e.key === 'End') {
      if (!normalizedOptions.length) return;
      e.preventDefault();
      e.stopPropagation();
      focusMultiSelectOption(filterName, e.key === 'Home' ? 0 : normalizedOptions.length - 1);
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;

    const typedChar = e.key.toLowerCase();
    const now = Date.now();
    const existing = multiSelectTypeaheadRef.current?.[filterName] || { text: '', at: 0 };
    const nextText = now - existing.at <= 700 ? `${existing.text}${typedChar}` : typedChar;
    multiSelectTypeaheadRef.current = {
      ...multiSelectTypeaheadRef.current,
      [filterName]: { text: nextText, at: now }
    };

    const labels = normalizedOptions.map(option => String(option?.label ?? option?.value ?? '').trim().toLowerCase());
    const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
    const matchIndex = labels.findIndex((label, index) => index >= startIndex && label.startsWith(nextText));
    const fallbackIndex = matchIndex >= 0 ? matchIndex : labels.findIndex(label => label.startsWith(nextText));
    if (fallbackIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      focusMultiSelectOption(filterName, fallbackIndex);
    }
  }, [focusMultiSelectOption, focusNextFilter, multiSelectFocusedIndex]);

  const focusFirstFilter = useCallback(() => {
    if (isClosingRef.current || !filters.length) return;
    const firstFilterName = filters[0]?.filterName;
    const firstNode = firstFilterName ? filterInputRefs.current[firstFilterName] : null;
    if (!firstNode) return;
    try {
      firstNode.focus();
      if (typeof firstNode.select === 'function') {
        firstNode.select();
      }
    } catch {}
  }, [filters]);

  const restoreLastFocus = useCallback(() => {
    if (isClosingRef.current) return;
    const meta = focusReturnRef.current || null;
    let node = null;
    if (meta?.kind === 'filter' && meta?.filterName) {
      node = filterInputRefs.current[meta.filterName];
    } else if (meta?.kind === 'search') {
      node = searchButtonRef.current;
    } else if (meta?.kind === 'grid') {
      node = tableContainerRef.current;
    }
    if (node && document.contains(node)) {
      try {
        node.focus();
        if (typeof node.select === 'function') node.select();
      } catch {}
      return;
    }
    focusFirstFilter();
  }, [focusFirstFilter]);

  const handleFilterKeyDown = useCallback((filterName, e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    focusNextFilter(filterName);
  }, [focusNextFilter]);

  const getSearchboxOptions = useCallback((filterName) => {
    const options = Array.isArray(dropdownOptions[filterName]) ? dropdownOptions[filterName] : [];
    const query = String(searchboxDisplayValues[filterName] ?? filterValues[filterName] ?? '').trim().toLowerCase();
    if (!query) return options.slice(0, 50);
    return options.filter(option => {
      const label = String(option?.label ?? '').toLowerCase();
      const value = String(option?.value ?? '').toLowerCase();
      return label.includes(query) || value.includes(query);
    }).slice(0, 50);
  }, [dropdownOptions, filterValues, searchboxDisplayValues]);

  const handleSearchboxSelect = useCallback((filter, option) => {
    const filterName = String(filter?.filterName || '').trim();
    if (!filterName) return;
    const optionValue = String(option?.value ?? '').trim();
    const optionLabel = String(option?.label ?? optionValue).trim();

    setSearchboxDisplayValues(prev => ({
      ...prev,
      [filterName]: optionLabel
    }));
    setFilterValues(prev => ({
      ...prev,
      [filterName]: optionValue
    }));
    setSearchboxSuggestionsOpen(prev => ({
      ...prev,
      [filterName]: false
    }));
    setSearchboxFocusedIndex(prev => ({
      ...prev,
      [filterName]: -1
    }));
    setTimeout(() => focusNextFilter(filterName), 0);
  }, [focusNextFilter]);

  const handleSearchboxInputChange = useCallback((filterName, rawValue) => {
    setSearchboxDisplayValues(prev => ({
      ...prev,
      [filterName]: rawValue
    }));
    setFilterValues(prev => ({
      ...prev,
      [filterName]: rawValue
    }));
    setSearchboxSuggestionsOpen(prev => ({
      ...prev,
      [filterName]: true
    }));
    setSearchboxFocusedIndex(prev => ({
      ...prev,
      [filterName]: -1
    }));
  }, []);

  const handleSearchboxKeyDown = useCallback((filter, e) => {
    const filterName = String(filter?.filterName || '').trim();
    if (!filterName) return;

    const list = getSearchboxOptions(filterName);
    const isOpen = !!searchboxSuggestionsOpen[filterName];
    const focusedIndex = Number.isInteger(searchboxFocusedIndex[filterName]) ? searchboxFocusedIndex[filterName] : -1;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCloseReport();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!list.length) return;
      setSearchboxSuggestionsOpen(prev => ({
        ...prev,
        [filterName]: true
      }));
      setSearchboxFocusedIndex(prev => ({
        ...prev,
        [filterName]: focusedIndex < 0 ? 0 : Math.min(focusedIndex + 1, list.length - 1)
      }));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!list.length) return;
      setSearchboxSuggestionsOpen(prev => ({
        ...prev,
        [filterName]: true
      }));
      setSearchboxFocusedIndex(prev => ({
        ...prev,
        [filterName]: focusedIndex < 0 ? list.length - 1 : Math.max(focusedIndex - 1, 0)
      }));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (list.length > 0) {
        const selected = list[focusedIndex >= 0 && focusedIndex < list.length ? focusedIndex : 0];
        if (selected) {
          handleSearchboxSelect(filter, selected);
          return;
        }
      }
      setSearchboxSuggestionsOpen(prev => ({
        ...prev,
        [filterName]: false
      }));
      focusNextFilter(filterName);
    }
  }, [focusNextFilter, getSearchboxOptions, handleCloseReport, handleSearchboxSelect, searchboxFocusedIndex, searchboxSuggestionsOpen]);

  const executeReport = useCallback(async () => {
    if (!reportId || isClosingRef.current) return;

    try {
      setRunning(true);
      try {
        executeControllerRef.current?.abort?.();
      } catch {}
      const controller = new AbortController();
      executeControllerRef.current = controller;
      const payload = {};
      filters.forEach(filter => {
        payload[filter.filterName] = filterValues[filter.filterName];
      });

      const response = await axios.post(
        `/api/generic-reports/${encodeURIComponent(reportId)}/execute`,
        payload,
        {
          ...tokenConfig,
          signal: controller.signal
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to execute report');
      }

      if (isClosingRef.current) return;
      setRows(response.data.rows || []);
      setHiddenRowKeys(new Set());
      setHiddenRowOrder([]);
      setSelectedRowKeys(new Set());
      setFocusedRowIndex(-1);
      const responseColumns = response.data.columns || [];
      if (responseColumns.length > 0) {
        setColumns(responseColumns.map(col => ({
          key: col.key || col.columnName,
          label: col.label || col.columnHeader || col.key || col.columnName,
          dataType: col.dataType || 'TEXT',
          width: col.width ?? null,
          sortOrder: col.sortOrder ?? 0
        })));
      }
    } catch (error) {
      if (!isClosingRef.current && !(error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError')) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || error.message || 'Failed to execute report'
        });
      }
    } finally {
      if (!isClosingRef.current) {
        setRunning(false);
      }
    }
  }, [filterValues, filters, reportId, tokenConfig]);
  searchActionRef.current = executeReport;

  const handleExport = useCallback(async () => {
    if (!reportId || isClosingRef.current) return;

    try {
      setRunning(true);
      try {
        exportControllerRef.current?.abort?.();
      } catch {}
      const controller = new AbortController();
      exportControllerRef.current = controller;
      const payload = {};
      filters.forEach(filter => {
        payload[filter.filterName] = filterValues[filter.filterName];
      });

      const response = await axios.post(
        `/api/generic-reports/${encodeURIComponent(reportId)}/export`,
        payload,
        {
          ...tokenConfig,
          signal: controller.signal,
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fallbackName = `${String(reportMaster?.reportName || 'generic_report').replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
      const headerName = response.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1];
      link.href = url;
      link.download = headerName || fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (!isClosingRef.current && !(error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError')) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || error.message || 'Failed to export report'
        });
      }
    } finally {
      if (!isClosingRef.current) {
        setRunning(false);
      }
    }
  }, [filterValues, filters, reportId, reportMaster?.reportName, tokenConfig]);
  exportActionRef.current = handleExport;

  useEffect(() => {
    if (selectableRowKeys.length === 0) {
      setFocusedRowIndex(-1);
      setSelectedRowKeys(new Set());
      return;
    }
    setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev, selectableRowKeys.length - 1)));
  }, [selectableRowKeys.length]);

  useEffect(() => {
    if (focusedRowIndex < 0) return;
    const rowKey = selectableRowKeys[focusedRowIndex];
    if (!rowKey) return;
    const container = tableContainerRef.current;
    const rowEl = container ? container.querySelector(`tr[data-row-key="${rowKey}"]`) : null;
    if (rowEl && typeof rowEl.scrollIntoView === 'function') {
      try {
        rowEl.scrollIntoView({ block: 'nearest' });
      } catch {}
    }
  }, [focusedRowIndex, selectableRowKeys]);

  const toggleSelectedRow = useCallback((rowKey) => {
    if (!rowKey) return;
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }, []);

  const hideSelectedOrFocusedRows = useCallback(() => {
    if (!selectableRowKeys.length) return;
    const selected = selectedRowKeys || new Set();
    const hasSelection = selected.size > 0;
    const idx = focusedRowIndex >= 0 ? focusedRowIndex : 0;
    const focusedKey = selectableRowKeys[idx];
    const keysToHide = hasSelection
      ? selectableRowKeys.filter(k => selected.has(k))
      : (focusedKey ? [focusedKey] : []);
    if (keysToHide.length === 0) return;

    setHiddenRowKeys(prev => {
      const next = new Set(prev);
      keysToHide.forEach(k => next.add(k));
      return next;
    });
    setHiddenRowOrder(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const existing = new Set(current);
      const next = [...current];
      keysToHide.forEach(k => {
        if (!k) return;
        if (hiddenRowKeys.has(k)) return;
        if (existing.has(k)) return;
        existing.add(k);
        next.push(k);
      });
      return next;
    });
    setSelectedRowKeys(prev => {
      const next = new Set(prev);
      keysToHide.forEach(k => next.delete(k));
      return next;
    });
  }, [focusedRowIndex, hiddenRowKeys, selectableRowKeys, selectedRowKeys]);

  const unhideLastRow = useCallback(() => {
    setHiddenRowOrder(prev => {
      const current = Array.isArray(prev) ? prev : [];
      if (current.length === 0) return current;
      const nextOrder = [...current];
      let keyToUnhide = '';
      while (nextOrder.length > 0) {
        const candidate = String(nextOrder[nextOrder.length - 1] || '');
        nextOrder.pop();
        if (!candidate) continue;
        keyToUnhide = candidate;
        break;
      }
      if (keyToUnhide) {
        setHiddenRowKeys(prevKeys => {
          const nextKeys = new Set(prevKeys);
          nextKeys.delete(keyToUnhide);
          return nextKeys;
        });
      }
      return nextOrder;
    });
  }, []);

  const unhideAllRows = useCallback(() => {
    setHiddenRowKeys(new Set());
    setHiddenRowOrder([]);
  }, []);

  const handleReportTableKeyDown = (e) => {
    const container = tableContainerRef.current;
    if (!container) return;

    const tag = String(document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && typeof e.key === 'string' && /^[a-zA-Z]$/.test(e.key)) {
      if (!selectableRowSearch || selectableRowSearch.length === 0) return;
      e.preventDefault();
      const letter = String(e.key).toLowerCase();
      const startFrom = focusedRowIndex >= 0 ? focusedRowIndex + 1 : 0;
      let match = selectableRowSearch.find(r => r.idx >= startFrom && r.normalized.startsWith(letter));
      if (!match) match = selectableRowSearch.find(r => r.normalized.startsWith(letter));
      if (match) setFocusedRowIndex(match.idx);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollLeft -= 80;
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollLeft += 80;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!selectableRowKeys.length) return;
      setFocusedRowIndex(prev => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!selectableRowKeys.length) return;
      setFocusedRowIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, selectableRowKeys.length - 1)));
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (!selectableRowKeys.length || focusedRowIndex < 0) return;
      toggleSelectedRow(selectableRowKeys[focusedRowIndex]);
    }
  };

  const periodFilters = useMemo(() => {
    const dateFilters = filters.filter(filter => String(filter?.type || '').toUpperCase() === 'DATE');
    if (dateFilters.length < 2) return null;

    const pickByTokens = (tokens) => dateFilters.find(filter => {
      const filterName = String(filter?.filterName || '').toLowerCase();
      const label = String(filter?.filterLabel || '').toLowerCase();
      const parameterName = String(filter?.parameterName || '').replace(/^@/, '').toLowerCase();
      return tokens.some(token => filterName.includes(token) || label.includes(token) || parameterName.includes(token));
    });

    const startFilter = pickByTokens(['from', 'start']) || dateFilters[0];
    const endFilter = pickByTokens(['to', 'end']) || dateFilters.find(filter => filter !== startFilter) || dateFilters[1];

    if (!startFilter || !endFilter || startFilter === endFilter) return null;
    return { startFilter, endFilter };
  }, [filters]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (e.defaultPrevented || isClosingRef.current) return;
        if (document.querySelector('.swal2-container')) return;
        e.preventDefault();
        handleCloseReport();
        return;
      }

      if (e.key === 'F2' && periodFilters) {
        e.preventDefault();
        if (!focusReturnRef.current) {
          const active = document.activeElement;
          const filterMatch = Object.keys(filterInputRefs.current || {}).find(name => filterInputRefs.current[name] === active);
          if (filterMatch) {
            focusReturnRef.current = { kind: 'filter', filterName: filterMatch };
          } else if (active && searchButtonRef.current && active === searchButtonRef.current) {
            focusReturnRef.current = { kind: 'search' };
          } else if (tableContainerRef.current && active && tableContainerRef.current.contains(active)) {
            focusReturnRef.current = { kind: 'grid' };
          }
        }
        setShowChangePeriodModal(true);
        return;
      }

      const k = String(e.key || '').toLowerCase();
      const tag = String(document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

      if (k === 'u' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        unhideAllRows();
        return;
      }

      if (!e.altKey) return;
      if (e.ctrlKey || e.metaKey) return;

      if (k === 's') {
        e.preventDefault();
        searchActionRef.current?.();
        return;
      }
      if (k === 'p') {
        e.preventDefault();
        exportActionRef.current?.();
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        unhideLastRow();
        return;
      }
      if (k === 'r' || k === 'h') {
        e.preventDefault();
        hideSelectedOrFocusedRows();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleCloseReport, hideSelectedOrFocusedRows, periodFilters, unhideAllRows, unhideLastRow]);

  useEffect(() => {
    if (loading || !filters.length) return;
    const timer = setTimeout(() => {
      focusFirstFilter();
    }, 60);
    return () => clearTimeout(timer);
  }, [filters, focusFirstFilter, loading]);

  useEffect(() => {
    const nextDisplayValues = {};
    filters.forEach(filter => {
      const type = String(filter?.type || '').toUpperCase();
      if (type !== 'SEARCHBOX') return;
      const filterName = String(filter?.filterName || '').trim();
      if (!filterName) return;
      const rawValue = filterValues[filterName];
      const options = Array.isArray(dropdownOptions[filterName]) ? dropdownOptions[filterName] : [];
      const matched = options.find(option => {
        const optionValue = String(option?.value ?? '').trim();
        const optionLabel = String(option?.label ?? optionValue).trim();
        const currentValue = String(rawValue ?? '').trim();
        return currentValue && (optionValue === currentValue || optionLabel === currentValue);
      });
      nextDisplayValues[filterName] = matched
        ? String(matched?.label ?? matched?.value ?? '').trim()
        : String(rawValue ?? '').trim();
    });
    setSearchboxDisplayValues(nextDisplayValues);
  }, [dropdownOptions, filterValues, filters]);

  useEffect(() => {
    Object.entries(searchboxFocusedIndex).forEach(([filterName, focusedIndex]) => {
      if (focusedIndex < 0 || !searchboxSuggestionsOpen[filterName]) return;
      const element = document.getElementById(`generic-searchbox-${filterName}-${focusedIndex}`);
      if (element && typeof element.scrollIntoView === 'function') {
        try {
          element.scrollIntoView({ block: 'nearest' });
        } catch {}
      }
    });
  }, [searchboxFocusedIndex, searchboxSuggestionsOpen]);

  const totals = useMemo(() => {
    const next = {};
    columns.forEach(column => {
      if (!isNumericDataType(column.dataType)) return;
      next[column.key] = selectableRowKeys.reduce((sum, rowKey) => {
        const rawIndex = Number(String(rowKey).split(':')[1]);
        const row = Number.isFinite(rawIndex) ? rows?.[rawIndex] : null;
        const value = Number(getRowValue(row, column.key));
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    });
    return next;
  }, [columns, rows, selectableRowKeys]);

  const renderCellValue = (value, dataType) => {
    if (value === null || value === undefined) return '';
    const type = String(dataType || '').toUpperCase();
    if (type === 'BOOLEAN') {
      return value === true || value === 1 || String(value).toLowerCase() === 'true' ? 'Yes' : 'No';
    }
    if (isNumericDataType(type)) {
      const number = Number(value);
      if (!Number.isFinite(number)) return String(value);
      if (isDecimalDataType(type)) {
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return number.toLocaleString();
    }
    return String(value);
  };

  const openDatePicker = (filterName) => {
    const input = dateInputRefs.current[filterName];
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {}
    }
    try {
      input.focus();
      input.click();
    } catch {}
  };

  const handleHeaderCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleCloseReport();
  };

  if (loading) {
    return <div className="loading-container">Loading generic report...</div>;
  }

  return (
    <div className="ho-reports-dashboard generic-report-page">
      <div className="reports-header">
        <h2>{reportMaster?.reportName || 'Generic Report'}</h2>
        <div className="header-actions">
          <button
            ref={searchButtonRef}
            className="search-btn generic-report-header-search-btn"
            onClick={executeReport}
            onFocus={() => {
              focusReturnRef.current = { kind: 'search' };
            }}
            disabled={running}
          >
            {running ? 'Running...' : 'Search'}
          </button>
          <button
            className="export-btn generic-report-export-btn"
            onClick={handleExport}
            disabled={running}
            title="Export"
            aria-label="Export"
          >
            <svg
              className="generic-report-export-icon"
              viewBox="0 0 64 64"
              aria-hidden="true"
              focusable="false"
            >
              <path className="excel-file-body" d="M10 6h28l16 16v36H10z" />
              <path className="excel-file-corner" d="M38 6v16h16z" />
              <path className="excel-x-mark" d="m21 22 7 10-7 10" />
              <path className="excel-x-mark" d="m35 22-7 10 7 10" />
              <path className="excel-download-bg" d="M39 40h15v8h6L46 62 32 48h7z" />
              <path className="excel-download-arrow" d="M46 42v11" />
              <path className="excel-download-arrow" d="m40 49 6 7 6-7" />
            </svg>
          </button>
          <button
            type="button"
            className="generic-report-close-btn"
            onClick={handleHeaderCloseClick}
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {descriptionText && (
        <div className="filter-section" style={{ display: 'block', marginBottom: '1rem' }}>
          <div style={{ color: '#34495e' }}>{descriptionText}</div>
        </div>
      )}

      <div className="filter-section" style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
        {filters.length === 0 ? (
          <div style={{ color: '#7f8c8d' }}>No filters configured for this report.</div>
        ) : (
          filters.map(filter => {
            const type = String(filter.type || '').trim().toUpperCase();
            const value = filterValues[filter.filterName] ?? (type === 'MULTISELECT' ? [] : '');
            const options = dropdownOptions[filter.filterName] || [];
            const searchboxOptions = type === 'SEARCHBOX' ? getSearchboxOptions(filter.filterName) : [];
            const optionError = filterOptionErrors[filter.filterName] || '';

            return (
              <div
                key={filter.id || filter.filterName}
                className={`date-input-group generic-report-filter-group${type === 'DATE' ? ' generic-report-date-input-group' : ''}${type === 'MULTISELECT' ? ' generic-report-filter-group-multiselect' : ''}`}
                style={{
                  minWidth: type === 'DATE' ? 150 : type === 'MULTISELECT' ? 280 : 190,
                  maxWidth: type === 'MULTISELECT' ? 320 : undefined,
                  flex: type === 'MULTISELECT' ? '0 0 300px' : undefined
                }}
              >
                <label htmlFor={filter.filterName}>
                  {filter.filterLabel || filter.filterName}
                  {filter.required ? ' *' : ''}
                </label>

                {type === 'DATE' ? (
                  <div className="generic-report-date-picker-wrapper">
                    <Calendar className="generic-report-date-picker-icon" size={18} />
                    <button
                      type="button"
                      ref={(node) => {
                        filterInputRefs.current[filter.filterName] = node;
                      }}
                      className="generic-report-date-picker-button"
                      onClick={() => openDatePicker(filter.filterName)}
                      onFocus={() => {
                        focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                      }}
                      onKeyDown={(e) => handleFilterKeyDown(filter.filterName, e)}
                      disabled={running}
                    >
                      {value ? toDdMmYyyy(value) : 'Select date'}
                    </button>
                    <input
                      ref={(node) => {
                        dateInputRefs.current[filter.filterName] = node;
                      }}
                      id={filter.filterName}
                      className="generic-report-date-picker-native"
                      type="date"
                      value={value}
                      onChange={(e) => handleInputChange(filter.filterName, e.target.value)}
                      onFocus={() => {
                        focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                      }}
                      onKeyDown={(e) => handleFilterKeyDown(filter.filterName, e)}
                    />
                  </div>
                ) : type === 'NUMBER' ? (
                  <input
                    id={filter.filterName}
                    ref={(node) => {
                      filterInputRefs.current[filter.filterName] = node;
                    }}
                    type="number"
                    value={value}
                    onChange={(e) => handleInputChange(filter.filterName, e.target.value)}
                    onFocus={() => {
                      focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                    }}
                    onKeyDown={(e) => handleFilterKeyDown(filter.filterName, e)}
                    placeholder={filter.parameterName || filter.filterName}
                  />
                ) : type === 'DROPDOWN' ? (
                  <select
                    className="generic-report-filter-select"
                    id={filter.filterName}
                    ref={(node) => {
                      filterInputRefs.current[filter.filterName] = node;
                    }}
                    value={value}
                    onChange={(e) => handleInputChange(filter.filterName, e.target.value)}
                    onFocus={() => {
                      focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                    }}
                    onKeyDown={(e) => handleFilterKeyDown(filter.filterName, e)}
                  >
                    <option value="">Select</option>
                    {options.map((option, index) => (
                      <option key={`${filter.filterName}-${index}`} value={option.value ?? ''}>
                        {option.label ?? option.value ?? ''}
                      </option>
                    ))}
                  </select>
                ) : type === 'MULTISELECT' ? (
                  <div
                    className="generic-report-filter-select generic-report-filter-multiselect"
                    id={filter.filterName}
                    ref={(node) => {
                      filterInputRefs.current[filter.filterName] = node;
                    }}
                    tabIndex={0}
                    onFocus={() => {
                      focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                      if (!Number.isInteger(multiSelectFocusedIndex[filter.filterName]) && options.length > 0) {
                        setMultiSelectFocusedIndex(prev => ({
                          ...prev,
                          [filter.filterName]: 0
                        }));
                      }
                    }}
                    onKeyDown={(e) => handleMultiSelectKeyDown(filter, e, options)}
                    role="group"
                    aria-label={filter.filterLabel || filter.filterName}
                  >
                    <div className="generic-report-filter-multiselect-actions">
                      <button
                        type="button"
                        className="generic-report-filter-multiselect-action-btn"
                        onClick={() => handleMultiSelectSelectAll(filter.filterName, options)}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="generic-report-filter-multiselect-action-btn"
                        onClick={() => handleMultiSelectClearAll(filter.filterName)}
                      >
                        Clear All
                      </button>
                    </div>
                    {options.map((option, index) => (
                      <label
                        key={`${filter.filterName}-${index}`}
                        className="generic-report-filter-multiselect-option"
                        title={String(option.label ?? option.value ?? '')}
                      >
                        <input
                          type="checkbox"
                          ref={(node) => {
                            if (!multiSelectOptionRefs.current[filter.filterName]) {
                              multiSelectOptionRefs.current[filter.filterName] = {};
                            }
                            if (node) {
                              multiSelectOptionRefs.current[filter.filterName][index] = node;
                            } else if (multiSelectOptionRefs.current[filter.filterName]) {
                              delete multiSelectOptionRefs.current[filter.filterName][index];
                            }
                          }}
                          className={index === (multiSelectFocusedIndex[filter.filterName] ?? -1) ? 'is-focused' : ''}
                          checked={(Array.isArray(value) ? value : []).includes(String(option.value ?? '').trim())}
                          onChange={(e) => handleMultiSelectToggle(filter.filterName, option.value, e.target.checked)}
                          onFocus={() => {
                            focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                            setMultiSelectFocusedIndex(prev => ({
                              ...prev,
                              [filter.filterName]: index
                            }));
                          }}
                          onKeyDown={(e) => handleMultiSelectKeyDown(filter, e, options)}
                        />
                        <span className="generic-report-filter-multiselect-label">
                          {option.label ?? option.value ?? ''}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : type === 'SEARCHBOX' ? (
                  <div
                    ref={(node) => {
                      searchboxWrapRefs.current[filter.filterName] = node;
                    }}
                    className="generic-report-searchbox-wrap"
                  >
                    <div className="generic-report-searchbox-input-wrap">
                      <Search className="generic-report-searchbox-icon" size={16} />
                      <input
                        id={filter.filterName}
                        ref={(node) => {
                          filterInputRefs.current[filter.filterName] = node;
                        }}
                        type="text"
                        value={searchboxDisplayValues[filter.filterName] ?? ''}
                        onChange={(e) => handleSearchboxInputChange(filter.filterName, e.target.value)}
                        onFocus={() => {
                          focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                          setSearchboxSuggestionsOpen(prev => ({
                            ...prev,
                            [filter.filterName]: true
                          }));
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            const wrap = searchboxWrapRefs.current[filter.filterName];
                            if (wrap && wrap.contains(document.activeElement)) return;
                            setSearchboxSuggestionsOpen(prev => ({
                              ...prev,
                              [filter.filterName]: false
                            }));
                            setSearchboxFocusedIndex(prev => ({
                              ...prev,
                              [filter.filterName]: -1
                            }));
                          }, 0);
                        }}
                        onKeyDown={(e) => handleSearchboxKeyDown(filter, e)}
                        placeholder={filter.parameterName || filter.filterName}
                        autoComplete="off"
                      />
                    </div>
                    {searchboxSuggestionsOpen[filter.filterName] && searchboxOptions.length > 0 && (
                      <div className="generic-report-searchbox-suggestions">
                        {searchboxOptions.map((option, index) => (
                          <div
                            key={`${filter.filterName}-${index}`}
                            id={`generic-searchbox-${filter.filterName}-${index}`}
                            className={`generic-report-searchbox-suggestion-item ${
                              index === (searchboxFocusedIndex[filter.filterName] ?? -1) ? 'active' : ''
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSearchboxSelect(filter, option);
                            }}
                          >
                            <div className="generic-report-searchbox-suggestion-label">
                              {option.label ?? option.value ?? ''}
                            </div>
                            {String(option.label ?? option.value ?? '') !== String(option.value ?? '') && (
                              <div className="generic-report-searchbox-suggestion-value">
                                {option.value ?? ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    id={filter.filterName}
                    ref={(node) => {
                      filterInputRefs.current[filter.filterName] = node;
                    }}
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(filter.filterName, e.target.value)}
                    onFocus={() => {
                      focusReturnRef.current = { kind: 'filter', filterName: filter.filterName };
                    }}
                    onKeyDown={(e) => handleFilterKeyDown(filter.filterName, e)}
                    placeholder={filter.parameterName || filter.filterName}
                  />
                )}
                {!!optionError && (type === 'DROPDOWN' || type === 'MULTISELECT' || type === 'SEARCHBOX') && (
                  <div style={{ color: '#c0392b', fontSize: 12, marginTop: 6 }}>
                    {optionError}
                  </div>
                )}
              </div>
            );
          })
        )}

      </div>

      <div className="table-section generic-report-table-section">
        <div style={{ fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
          Results {selectableRowKeys.length > 0 ? `(${selectableRowKeys.length})` : ''}
        </div>

        {selectableRowKeys.length === 0 ? (
          <div className="no-data">No data available. Apply filters and click Search.</div>
        ) : (
          <div
            ref={tableContainerRef}
            className="table-container generic-report-table-container"
            tabIndex={0}
            onKeyDown={handleReportTableKeyDown}
            onFocus={() => {
              focusReturnRef.current = { kind: 'grid' };
            }}
            onClick={() => {
              focusReturnRef.current = { kind: 'grid' };
              tableContainerRef.current?.focus();
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th
                      key={column.key}
                      className={isNumericDataType(column.dataType) ? 'amount-column' : ''}
                      style={column.width ? { minWidth: `${column.width}px` } : undefined}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectableRowKeys.map((rowKey, visibleIndex) => {
                  const rawIndex = Number(String(rowKey).split(':')[1]);
                  const row = Number.isFinite(rawIndex) ? rows?.[rawIndex] : null;
                  return (
                  <tr
                    key={rowKey}
                    data-row-key={rowKey}
                    className={`${visibleIndex === focusedRowIndex ? 'focused-row' : ''} ${selectedRowKeys.has(rowKey) ? 'selected-row' : ''}`}
                    onClick={() => {
                      setFocusedRowIndex(visibleIndex);
                      toggleSelectedRow(rowKey);
                    }}
                  >
                    {columns.map(column => (
                      <td
                        key={`${rowKey}-${column.key}`}
                        className={isNumericDataType(column.dataType) ? 'amount-column' : ''}
                      >
                        {renderCellValue(getRowValue(row, column.key), column.dataType)}
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
              {Object.keys(totals).length > 0 && (
                <tfoot>
                  <tr>
                    {columns.map((column, index) => {
                      if (index === 0) {
                        return <td key={column.key} style={{ fontWeight: 700 }}>TOTAL</td>;
                      }
                      if (!Object.prototype.hasOwnProperty.call(totals, column.key)) {
                        return <td key={column.key} />;
                      }
                      const totalValue = totals[column.key];
                      return (
                        <td key={column.key} className="amount-column" style={{ fontWeight: 700 }}>
                          {renderCellValue(totalValue, column.dataType)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <ChangePeriodModal
        open={showChangePeriodModal && !!periodFilters}
        startDate={periodFilters ? String(filterValues[periodFilters.startFilter.filterName] || '') : ''}
        endDate={periodFilters ? String(filterValues[periodFilters.endFilter.filterName] || '') : ''}
        onClose={() => {
          setShowChangePeriodModal(false);
          setTimeout(() => {
            restoreLastFocus();
          }, 0);
        }}
        onApply={({ startDate, endDate }) => {
          if (!periodFilters) return;
          setFilterValues(prev => ({
            ...prev,
            [periodFilters.startFilter.filterName]: startDate,
            [periodFilters.endFilter.filterName]: endDate
          }));
          setShowChangePeriodModal(false);
          setTimeout(() => {
            restoreLastFocus();
          }, 0);
          setTimeout(() => {
            if (!isClosingRef.current) {
              searchActionRef.current?.();
            }
          }, 0);
        }}
      />
    </div>
  );
};

export default GenericReportPage;
