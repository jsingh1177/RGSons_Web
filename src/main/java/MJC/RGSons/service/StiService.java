package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.StiHead;
import MJC.RGSons.model.StiItem;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.StiHeadRepository;
import MJC.RGSons.repository.StiItemRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.StoItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@Service
public class StiService {

    private static final Logger logger = LoggerFactory.getLogger(StiService.class);

    @Autowired
    private StiHeadRepository stiHeadRepository;

    @Autowired
    private StiItemRepository stiItemRepository;

    @Autowired
    private StoHeadRepository stoHeadRepository;

    @Autowired
    private StoItemRepository stoItemRepository;

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private DSRService dsrService;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private FifoDirtyService fifoDirtyService;

    @Autowired
    private InventoryUpdateTriggerService inventoryUpdateTriggerService;

    @Transactional
    public StiHead saveStockTransferIn(StiHead stiHead, List<StiItem> stiItems) {
        // Always generate a fresh voucher number on save to ensure sequence integrity
        // This overrides any preview number sent from frontend
        String newStiNumber = generateStiNumberForSave(stiHead.getToStore());
        stiHead.setStiNumber(newStiNumber);
        stiHead.setTranDate(parseToLocalDate(stiHead.getDate()));
        int totalQty = 0;
        if (stiItems != null) {
            for (StiItem it : stiItems) {
                totalQty += it != null && it.getQuantity() != null ? it.getQuantity() : 0;
            }
        }
        stiHead.setTotalQty(totalQty);
        stiHead.setUpdatedAt(java.time.LocalDateTime.now());

        StiHead savedHead = stiHeadRepository.save(stiHead);
        if (savedHead.getStiNumber() != null && !savedHead.getStiNumber().isBlank()) {
            stiHeadRepository.syncTranDateFromStiNumber(savedHead.getStiNumber());
        }
        updateOptionalTallySync(savedHead.getStiNumber(), "0");
        
        for (StiItem item : stiItems) {
            item.setStiNumber(savedHead.getStiNumber());
            if (item.getStiDate() == null || item.getStiDate().isBlank()) {
                item.setStiDate(savedHead.getDate());
            }
            item.setTranDate(parseToLocalDate(item.getStiDate()));
            stiItemRepository.save(item);
            
            // Update Inventory (Inward to Receiving Store)
            updateInventoryInward(item);
        }
        if (savedHead.getStiNumber() != null && !savedHead.getStiNumber().isBlank()) {
            stiItemRepository.syncTranDateFromStiNumber(savedHead.getStiNumber());
        }
        fifoDirtyService.markDirty(savedHead.getToStore(), savedHead.getTranDate());
        
        // Update STO Status to RECEIVED
        List<StoHead> stoHeads = stoHeadRepository.findByStoNumber(stiHead.getStoNumber());
        if (!stoHeads.isEmpty()) {
            StoHead stoHead = stoHeads.get(0);
            stoHead.setReceivedStatus("RECEIVED");
            stoHead.setReceivedBy(stiHead.getUserName());
            stoHeadRepository.save(stoHead);
        }

        // Update DSR (Sync STI quantities to DSR Inward)
        try {
            logger.debug("Updating DSR after STI save for store {} on {}", stiHead.getToStore(), stiHead.getDate());
            dsrService.populateDSR(stiHead.getToStore(), stiHead.getDate(), stiHead.getUserName());
        } catch (Exception e) {
            logger.warn("Error updating DSR from STI {}", savedHead.getStiNumber(), e);
            // Don't fail the transaction just because DSR update failed, or do?
            // Usually DSR is secondary, so logging is enough.
        }

        inventoryUpdateTriggerService.triggerAfterCommitIfRequired(true, savedHead.getTranDate());
        return savedHead;
    }

    private LocalDate parseToLocalDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        String s = dateStr.trim();
        if (s.isEmpty()) return null;
        try {
            return LocalDate.parse(s, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        } catch (Exception ignored) {
        }
        try {
            return LocalDate.parse(s);
        } catch (Exception ignored) {
        }
        return null;
    }

    private void updateInventoryInward(StiItem item) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                item.getToStore(), item.getItemCode(), item.getSizeCode());

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentInward = inv.getInward() != null ? inv.getInward() : 0;
            inv.setInward(currentInward + item.getQuantity());

            // Recalculate Closing: Closing = Opening + Purchase + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int purchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
            int inward = inv.getInward();
            int outward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setClosing(opening + purchase + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty <= 0) {
                return;
            }
            // Create new inventory record if not exists
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(item.getToStore());
            inv.setItemCode(item.getItemCode());
            inv.setItemName(item.getItemName());
            inv.setSizeCode(item.getSizeCode());
            inv.setSizeName(item.getSizeName());
            inv.setOpening(0);
            inv.setPurchase(0);
            inv.setInward(qty);
            inv.setOutward(0);
            inv.setClosing(qty);
            inventoryMasterRepository.save(inv);
        }
    }

    public List<StoHead> getPendingStos(String toStore, String businessDate) {
        if (businessDate != null && !businessDate.isEmpty()) {
            return stoHeadRepository.findPendingStosByDate(toStore, "PENDING", businessDate);
        }
        return stoHeadRepository.findByToStoreAndReceivedStatusAndStatus(toStore, "PENDING", "SUBMITTED");
    }

    public List<StoItem> getStoItems(String stoNumber) {
        return stoItemRepository.findByStoNumber(stoNumber);
    }

    public Map<String, Object> getStiDetails(String stiNumber) {
        if (stiNumber == null || stiNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("stiNumber is required");
        }
        StiHead head = stiHeadRepository.findByStiNumber(stiNumber.trim());
        if (head == null) {
            throw new IllegalArgumentException("STI not found: " + stiNumber);
        }
        List<StiItem> items = stiItemRepository.findByStiNumber(stiNumber.trim());
        Map<String, Object> result = new HashMap<>();
        result.put("head", head);
        result.put("items", items);
        return result;
    }

    @Transactional
    public void updateStockTransferIn(StiHead updatedHead, List<StiItem> updatedItems) {
        if (updatedHead == null || updatedHead.getStiNumber() == null || updatedHead.getStiNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("stiNumber is required");
        }
        String stiNumber = updatedHead.getStiNumber().trim();
        StiHead existing = stiHeadRepository.findByStiNumber(stiNumber);
        if (existing == null) {
            throw new IllegalArgumentException("STI not found: " + stiNumber);
        }
        LocalDate previousTranDate = existing.getTranDate();
        fifoDirtyService.markDirty(existing.getToStore(), previousTranDate);

        List<StiItem> oldItems = stiItemRepository.findByStiNumber(stiNumber);
        for (StiItem old : oldItems) {
            StiItem delta = new StiItem();
            delta.setToStore(old.getToStore());
            delta.setItemCode(old.getItemCode());
            delta.setItemName(old.getItemName());
            delta.setSizeCode(old.getSizeCode());
            delta.setSizeName(old.getSizeName());
            delta.setQuantity(old.getQuantity() != null ? -old.getQuantity() : 0);
            updateInventoryInward(delta);
        }

        stiItemRepository.deleteByStiNumber(stiNumber);

        existing.setDate(updatedHead.getDate());
        existing.setTranDate(parseToLocalDate(updatedHead.getDate()));
        existing.setStoNumber(updatedHead.getStoNumber());
        existing.setStoDate(updatedHead.getStoDate());
        existing.setFromStore(updatedHead.getFromStore());
        existing.setToStore(updatedHead.getToStore());
        existing.setUserName(updatedHead.getUserName());
        existing.setNarration(updatedHead.getNarration());
        existing.setReceivedStatus("RECEIVED");
        int totalQty = 0;
        if (updatedItems != null) {
            for (StiItem it : updatedItems) {
                totalQty += it != null && it.getQuantity() != null ? it.getQuantity() : 0;
            }
        }
        existing.setTotalQty(totalQty);
        existing.setUpdatedAt(java.time.LocalDateTime.now());
        stiHeadRepository.save(existing);
        if (existing.getStiNumber() != null && !existing.getStiNumber().isBlank()) {
            stiHeadRepository.syncTranDateFromStiNumber(existing.getStiNumber());
        }
        updateOptionalTallySync(existing.getStiNumber(), "1");

        if (updatedItems != null) {
            for (StiItem item : updatedItems) {
                item.setId(null);
                item.setStiNumber(stiNumber);
                item.setStiDate(existing.getDate());
                item.setTranDate(parseToLocalDate(existing.getDate()));
                item.setFromStore(existing.getFromStore());
                item.setToStore(existing.getToStore());
                stiItemRepository.save(item);
                updateInventoryInward(item);
            }
            stiItemRepository.syncTranDateFromStiNumber(stiNumber);
        }
        fifoDirtyService.markDirty(existing.getToStore(), existing.getTranDate());

        if (existing.getToStore() != null && existing.getDate() != null && existing.getUserName() != null) {
            dsrService.populateDSR(existing.getToStore(), existing.getDate(), existing.getUserName());
        }

        inventoryUpdateTriggerService.triggerAfterCommitIfRequired(true, previousTranDate, existing.getTranDate());
    }

    private void updateOptionalTallySync(String stiNumber, String value) {
        String normalizedStiNumber = stiNumber == null ? "" : stiNumber.trim();
        if (normalizedStiNumber.isEmpty()) return;
        try {
            jdbcTemplate.update(
                    "UPDATE sti_head SET Tally_Sync = ? WHERE sti_number = ?",
                    value,
                    normalizedStiNumber
            );
        } catch (Exception ignored) {
            // Some databases may not have Tally_Sync on sti_head yet.
        }
    }

    @Transactional
    public boolean deleteVoucher(String stiNumber) {
        if (stiNumber == null || stiNumber.trim().isEmpty()) {
            return false;
        }

        String normalized = stiNumber.trim();
        StiHead head = stiHeadRepository.findByStiNumber(normalized);
        if (head == null) {
            return false;
        }
        fifoDirtyService.markDirty(head.getToStore(), head.getTranDate());

        List<StiItem> items = stiItemRepository.findByStiNumber(normalized);
        for (StiItem item : items) {
            StiItem delta = new StiItem();
            delta.setToStore(item.getToStore());
            delta.setItemCode(item.getItemCode());
            delta.setItemName(item.getItemName());
            delta.setSizeCode(item.getSizeCode());
            delta.setSizeName(item.getSizeName());
            delta.setQuantity(item.getQuantity() != null ? -item.getQuantity() : 0);
            updateInventoryInward(delta);
        }

        stiItemRepository.deleteByStiNumber(normalized);
        stiHeadRepository.delete(head);

        if (head.getStoNumber() != null && !head.getStoNumber().isBlank()) {
            List<StoHead> stoHeads = stoHeadRepository.findByStoNumber(head.getStoNumber());
            if (!stoHeads.isEmpty()) {
                StoHead stoHead = stoHeads.get(0);
                stoHead.setReceivedStatus("PENDING");
                stoHead.setReceivedBy(null);
                stoHeadRepository.save(stoHead);
            }
        }

        if (head.getToStore() != null && !head.getToStore().isBlank() && head.getDate() != null && !head.getDate().isBlank()) {
            String userName = head.getUserName() != null ? head.getUserName() : "";
            dsrService.populateDSR(head.getToStore(), head.getDate(), userName);
        }

        inventoryUpdateTriggerService.triggerAfterCommitIfRequired(true, head.getTranDate());
        return true;
    }

    public String generateStiNumber(String storeCode) {
        try {
            // "STOCK_TRANSFER_IN" is the voucher type code for Stock Transfer In
            return voucherService.getProvisionalVoucherNumber("STOCK_TRANSFER_IN", storeCode);
        } catch (Exception e) {
            logger.warn("Error generating STI voucher preview for store {}", storeCode, e);
            // Fallback to legacy logic
            Long max = stiHeadRepository.findMaxStiNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }

    public String generateStiNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("STOCK_TRANSFER_IN", storeCode);
        } catch (Exception e) {
            logger.warn("Error generating STI voucher number for store {}", storeCode, e);
            // Fallback to legacy logic
            Long max = stiHeadRepository.findMaxStiNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }
}
