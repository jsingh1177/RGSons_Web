package MJC.RGSons.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;

@Service
public class InventoryUpdateTriggerService {

    private static final Logger logger = LoggerFactory.getLogger(InventoryUpdateTriggerService.class);

    @Autowired
    private InventoryUpdateAsyncService inventoryUpdateAsyncService;

    public void triggerAfterCommitIfRequired(boolean shouldRun, LocalDate... affectedDates) {
        if (!shouldRun) {
            return;
        }

        LocalDate rebuildToDate = resolveRebuildToDate(affectedDates);

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatchInventoryUpdate(rebuildToDate);
                }
            });
            return;
        }

        dispatchInventoryUpdate(rebuildToDate);
    }

    private LocalDate resolveRebuildToDate(LocalDate... affectedDates) {
        LocalDate maxDate = LocalDate.now();
        if (affectedDates != null) {
            for (LocalDate affectedDate : affectedDates) {
                if (affectedDate == null) {
                    continue;
                }
                if (affectedDate.isAfter(maxDate)) {
                    maxDate = affectedDate;
                }
            }
        }
        return maxDate;
    }

    private void dispatchInventoryUpdate(LocalDate rebuildToDate) {
        try {
            inventoryUpdateAsyncService.runInventoryUpdate(rebuildToDate);
        } catch (Exception e) {
            logger.warn("Error dispatching backend inventory update after voucher save/edit/delete", e);
        }
    }
}
