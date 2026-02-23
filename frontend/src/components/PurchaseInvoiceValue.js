import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ArrowLeft } from 'lucide-react';

const PurchaseInvoiceValue = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const invoiceValue = location.state?.invoiceValue ?? 0;

    const [ledgers, setLedgers] = useState([]);
    const [rows, setRows] = useState([{ ledgerCode: '', amount: '' }]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLedgers = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/ledgers/screen/Purchase', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const data = Array.isArray(response.data) ? response.data : [];
                const activeLedgers = data.filter(l => l.status === 1 || l.status === true);
                setLedgers(activeLedgers);
            } catch (error) {
                console.error('Error fetching ledgers for Purchase screen', error);
                Swal.fire('Error', 'Failed to load Purchase ledgers', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchLedgers();
    }, []);

    const handleRowLedgerChange = (index, value) => {
        setRows(prev =>
            prev.map((row, i) =>
                i === index ? { ...row, ledgerCode: value } : row
            )
        );
    };

    const handleRowAmountChange = (index, value) => {
        setRows(prev =>
            prev.map((row, i) =>
                i === index ? { ...row, amount: value } : row
            )
        );
    };

    const handleAddRow = () => {
        setRows(prev => [...prev, { ledgerCode: '', amount: '' }]);
    };

    const handleRemoveRow = (index) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const totalAllocated = rows.reduce((sum, row) => {
        const value = parseFloat(row.amount);
        if (isNaN(value)) {
            return sum;
        }
        return sum + value;
    }, 0);

    const formatAmount = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return '0.00';
        }
        return num.toFixed(2);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="max-w-6xl w-full mx-auto mt-4 mb-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-bold text-slate-800">
                            Invoice Value Allocation (Purchase)
                        </h2>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Invoice Value
                        </span>
                        <span className="text-xl font-bold text-slate-800">
                            ₹{formatAmount(invoiceValue)}
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            Select ledgers for Purchase and enter the respective amounts.
                        </div>
                        <div className="text-xs text-slate-500">
                            Total Allocated:&nbsp;
                            <span className="font-semibold text-slate-800">
                                ₹{formatAmount(totalAllocated)}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                                        Sr No
                                    </th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                                        Ledger
                                    </th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                        Amount
                                    </th>
                                    <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 text-slate-700">
                                            {index + 1}
                                        </td>
                                        <td className="py-2 px-3">
                                            <select
                                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                value={row.ledgerCode}
                                                onChange={(e) => handleRowLedgerChange(index, e.target.value)}
                                                disabled={loading}
                                            >
                                                <option value="">Select Ledger</option>
                                                {ledgers.map(ledger => (
                                                    <option key={ledger.code} value={ledger.code}>
                                                        {ledger.name} ({ledger.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono"
                                                value={row.amount}
                                                onChange={(e) => handleRowAmountChange(index, e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(index)}
                                                className="text-xs px-2 py-1 border border-rose-200 text-rose-600 rounded-full hover:bg-rose-50"
                                                disabled={rows.length === 1}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            Add Row
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-slate-500">
                                Total Allocated:&nbsp;
                                <span className="font-semibold text-slate-800">
                                    ₹{formatAmount(totalAllocated)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseInvoiceValue;

