import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import './CustomerLedger.css';

const CustomerLedger = () => {
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [ledgerData, setLedgerData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            const response = await axios.get('/api/sales/parties');
            setParties(response.data);
        } catch (error) {
            console.error("Error fetching parties", error);
            Swal.fire('Error', 'Failed to fetch parties', 'error');
        }
    };

    const handlePartyChange = async (e) => {
        const partyCode = e.target.value;
        setSelectedParty(partyCode);
        if (partyCode) {
            fetchLedger(partyCode);
        } else {
            setLedgerData([]);
        }
    };

    const fetchLedger = async (partyCode) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/sales/customer-ledger/${partyCode}`);
            // Sort by date ASC for running balance calculation
            const sortedData = response.data.sort((a, b) => {
                if (!a.invoiceDate) return -1;
                if (!b.invoiceDate) return 1;
                return new Date(a.invoiceDate) - new Date(b.invoiceDate);
            });
            setLedgerData(sortedData);
        } catch (error) {
            console.error("Error fetching ledger", error);
            Swal.fire('Error', 'Failed to fetch ledger', 'error');
            setLedgerData([]);
        } finally {
            setLoading(false);
        }
    };

    let runningBalance = 0;

    return (
        <div className="customer-ledger-container">
            <h2>Customer Ledger</h2>
            <div className="filter-section">
                <label>Select Customer:</label>
                <select 
                    className="form-control" 
                    value={selectedParty} 
                    onChange={handlePartyChange}
                    style={{ maxWidth: '400px', display: 'inline-block', marginLeft: '10px' }}
                >
                    <option value="">-- Select Customer --</option>
                    {parties.map(party => (
                        <option key={party.code} value={party.code}>
                            {party.name} ({party.code})
                        </option>
                    ))}
                </select>
            </div>

            <div className="ledger-table-section">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <table className="table table-bordered table-striped">
                        <thead className="thead-dark">
                            <tr>
                                <th>Date</th>
                                <th>Invoice No</th>
                                <th style={{ textAlign: 'right' }}>Debit (Sale)</th>
                                <th style={{ textAlign: 'right' }}>Credit (Paid)</th>
                                <th style={{ textAlign: 'right' }}>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerData.length > 0 ? (
                                ledgerData.map((row, index) => {
                                    const debit = row.totalAmount || 0; // Use totalAmount (which includes sale + other - expense?)
                                    // Actually totalAmount is the final invoice value.
                                    // Let's check TranHead: totalAmount is what customer owes.
                                    
                                    const credit = row.totalTender || 0;
                                    runningBalance = runningBalance + debit - credit;
                                    
                                    return (
                                        <tr key={index}>
                                            <td>{row.invoiceDate}</td>
                                            <td>{row.invoiceNo}</td>
                                            <td style={{ textAlign: 'right' }}>{debit.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{credit.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{runningBalance.toFixed(2)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>
                                        {selectedParty ? "No transactions found for this customer." : "Please select a customer."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CustomerLedger;
