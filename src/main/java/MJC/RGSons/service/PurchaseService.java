package MJC.RGSons.service;

import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.model.PurLedger;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.PurItemRepository;
import MJC.RGSons.repository.PurLedgerRepository;
import MJC.RGSons.repository.LedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PurchaseService {

    @Autowired
    private PurHeadRepository purHeadRepository;

    @Autowired
    private PurItemRepository purItemRepository;

    @Autowired
    private PurLedgerRepository purLedgerRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    @Transactional
    public PurHead savePurchase(PurHead purHead, List<PurItem> purItems, List<PurLedger> purLedgers) {
        double headTotal = purHead.getTotalAmount() != null ? purHead.getTotalAmount() : 0.0;
        double ledgerTotal = 0.0;

        if (purLedgers != null) {
            for (PurLedger ledger : purLedgers) {
                if (ledger.getAmount() != null) {
                    ledgerTotal += ledger.getAmount();
                }
            }
        }

        if (Math.abs(headTotal - ledgerTotal) > 0.01) {
            throw new IllegalArgumentException("Invoice Value and Total Allocated amount must match.");
        }

        PurHead savedHead = purHeadRepository.save(purHead);

        for (PurItem item : purItems) {
            item.setInvoiceNo(savedHead.getInvoiceNo());
            purItemRepository.save(item);
        }

        if (purLedgers != null) {
            for (PurLedger ledger : purLedgers) {
                ledger.setInvoiceNo(savedHead.getInvoiceNo());
                ledger.setPurId(savedHead.getId());
                Ledger masterLedger = ledgerRepository.findByCode(ledger.getLedgerCode()).orElse(null);
                if (masterLedger != null) {
                    ledger.setType(masterLedger.getType());
                } else {
                    ledger.setType(null);
                }
                purLedgerRepository.save(ledger);
            }
        }

        return savedHead;
    }

    public List<PurHead> getAllPurchases() {
        return purHeadRepository.findAll();
    }
}
