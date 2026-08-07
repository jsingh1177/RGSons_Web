package MJC.RGSons.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class InventoryUpdateAsyncService {

    private static final Logger logger = LoggerFactory.getLogger(InventoryUpdateAsyncService.class);

    @Autowired
    private FifoSnapshotService fifoSnapshotService;

    @Async("inventoryUpdateExecutor")
    public void runInventoryUpdate(LocalDate rebuildToDate) {
        try {
            fifoSnapshotService.rebuildDirtySnapshots(rebuildToDate);
        } catch (Exception e) {
            logger.warn("Error running backend inventory update asynchronously", e);
        }
    }
}
