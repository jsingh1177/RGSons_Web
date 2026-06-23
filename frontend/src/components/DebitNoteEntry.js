import React from 'react';
import { PurchaseLikeEntry } from './PurchaseEntry';

const DebitNoteEntry = () => (
    <PurchaseLikeEntry
        apiBase="/api/debit-note"
        voucherType="DEBIT_NOTE"
        lastVoucherKeyBase="debit-note"
        title="Debit Note"
        successName="Debit Note"
    />
);

export default DebitNoteEntry;

