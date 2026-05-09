package MJC.RGSons.service;

import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.StoItemRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import MJC.RGSons.model.VoucherConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class StoService {

    @Autowired
    private StoHeadRepository stoHeadRepository;

    @Autowired
    private StoItemRepository stoItemRepository;

    @Autowired
    private DSRService dsrService;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Transactional
    public StoHead saveStockTransfer(StoHead stoHead, List<StoItem> stoItems, boolean isDraft) {
        stoHead.setTranDate(parseToLocalDate(stoHead.getDate()));
        java.util.Map<String, Integer> oldQtyByKey = new java.util.HashMap<>();
        if (stoHead.getId() == null && stoHead.getStoNumber() != null && !stoHead.getStoNumber().trim().isEmpty()) {
            List<StoHead> existingByNumber = stoHeadRepository.findByStoNumber(stoHead.getStoNumber().trim());
            if (!existingByNumber.isEmpty()) {
                StoHead existing = existingByNumber.get(0);
                if ("RECEIVED".equalsIgnoreCase(existing.getReceivedStatus())) {
                    throw new IllegalStateException("Cannot edit STO. It is already received in Stock Transfer In.");
                }
            }
        }
        if (stoHead.getId() != null) {
            Optional<StoHead> existingOpt = stoHeadRepository.findById(stoHead.getId());
            if (existingOpt.isPresent()) {
                StoHead existingHead = existingOpt.get();
                if ("RECEIVED".equalsIgnoreCase(existingHead.getReceivedStatus())) {
                    throw new IllegalStateException("Cannot edit STO. It is already received in Stock Transfer In.");
                }
                String existingStoNumber = existingHead.getStoNumber();
                if (existingStoNumber != null && !existingStoNumber.isEmpty()) {
                    if (!"DRAFT".equalsIgnoreCase(existingHead.getStatus())) {
                        List<StoItem> existingItems = stoItemRepository.findByStoNumber(existingStoNumber);
                        for (StoItem it : existingItems) {
                            String key = (it.getItemCode() != null ? it.getItemCode() : "") + "|" + (it.getSizeCode() != null ? it.getSizeCode() : "");
                            if (!key.equals("|")) {
                                int q = it.getQuantity() != null ? it.getQuantity() : 0;
                                oldQtyByKey.put(key, oldQtyByKey.getOrDefault(key, 0) + q);
                            }
                        }
                    }
                    System.out.println("Deleting old items for STO Number: " + existingStoNumber);
                    stoItemRepository.deleteByStoNumber(existingStoNumber);
                    stoItemRepository.flush();
                }

                String existingFromStore = existingHead.getFromStore() != null ? existingHead.getFromStore().trim() : "";
                String newFromStore = stoHead.getFromStore() != null ? stoHead.getFromStore().trim() : "";
                boolean fromStoreChanged = !existingFromStore.equalsIgnoreCase(newFromStore);
                if (fromStoreChanged && !newFromStore.isEmpty()) {
                    String newStoNumber = generateStoNumberForSave(newFromStore);
                    stoHead.setStoNumber(newStoNumber);
                } else {
                    stoHead.setStoNumber(existingStoNumber);
                }
            }
        }

        if (stoHead.getId() == null) {
            String newStoNumber = generateStoNumberForSave(stoHead.getFromStore());
            stoHead.setStoNumber(newStoNumber);
        }
        
        stoHead.setStatus(isDraft ? "DRAFT" : "SUBMITTED");
        stoHead.setTallySync("0");

        if (!isDraft) {
            boolean allowNegative = false;
            try {
                VoucherConfig config = voucherService.getVoucherConfig("STOCK_TRANSFER_OUT");
                allowNegative = config != null && Boolean.TRUE.equals(config.getIsNegativeInventoryAllowed());
            } catch (Exception ignored) {
            }

            if (!allowNegative && stoItems != null && !stoItems.isEmpty()) {
                java.time.LocalDate tranDate = stoHead.getTranDate();
                java.util.Map<String, Integer> newQtyByKey = new java.util.HashMap<>();
                for (StoItem it : stoItems) {
                    String itemCode = it.getItemCode();
                    String sizeCode = it.getSizeCode();
                    if (itemCode == null || itemCode.isBlank() || sizeCode == null || sizeCode.isBlank()) {
                        continue;
                    }
                    int qty = it.getQuantity() != null ? it.getQuantity() : 0;
                    String key = itemCode + "|" + sizeCode;
                    newQtyByKey.put(key, newQtyByKey.getOrDefault(key, 0) + qty);
                }

                for (java.util.Map.Entry<String, Integer> entry : newQtyByKey.entrySet()) {
                    String[] parts = entry.getKey().split("\\|", 2);
                    String itemCode = parts.length > 0 ? parts[0] : "";
                    String sizeCode = parts.length > 1 ? parts[1] : "";
                    int requiredQty = entry.getValue() != null ? entry.getValue() : 0;
                    int oldQty = oldQtyByKey.getOrDefault(entry.getKey(), 0);
                    int available = inventoryService.getClosingStock(stoHead.getFromStore(), itemCode, sizeCode, tranDate) + oldQty;
                    if (requiredQty > available) {
                        String itemName = itemRepository.findByItemCode(itemCode).map(MJC.RGSons.model.Item::getItemName).orElse(itemCode);
                        String sizeName = sizeRepository.findByCode(sizeCode).map(MJC.RGSons.model.Size::getName).orElse(sizeCode);
                        throw new IllegalStateException("Insufficient stock for " + itemName + " (" + itemCode + "), " + sizeName + " (" + sizeCode + "). Available: " + available + ", Required: " + requiredQty);
                    }
                }
            }
        }

        // Save the head
        int totalQty = 0;
        if (stoItems != null) {
            for (StoItem it : stoItems) {
                totalQty += it != null && it.getQuantity() != null ? it.getQuantity() : 0;
            }
        }
        stoHead.setTotalQty(totalQty);
        stoHead.setUpdatedAt(java.time.LocalDateTime.now());
        StoHead savedHead = stoHeadRepository.save(stoHead);
        if (savedHead.getStoNumber() != null && !savedHead.getStoNumber().isBlank()) {
            stoHeadRepository.syncTranDateFromStoNumber(savedHead.getStoNumber());
        }

        // Save items
        for (StoItem item : stoItems) {
            item.setStoNumber(savedHead.getStoNumber()); // Ensure link
            if (item.getStoDate() == null || item.getStoDate().isBlank()) {
                item.setStoDate(savedHead.getDate());
            }
            item.setTranDate(parseToLocalDate(item.getStoDate()));
            stoItemRepository.save(item);
        }
        if (savedHead.getStoNumber() != null && !savedHead.getStoNumber().isBlank()) {
            stoItemRepository.syncTranDateFromStoNumber(savedHead.getStoNumber());
        }

        if (!isDraft) {
            // Update DSR (Sync STO quantities to DSR Outward) only if not draft
            try {
                System.out.println("Updating DSR after STO Save: " + stoHead.getFromStore() + ", " + stoHead.getDate());
                dsrService.populateDSR(stoHead.getFromStore(), stoHead.getDate(), stoHead.getUserName());
            } catch (Exception e) {
                System.err.println("Error updating DSR from STO: " + e.getMessage());
                e.printStackTrace();
            }
        }

        savedHead.setItems(stoItems);
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

    public List<StoHead> getDraftVouchers() {
        return getDraftVouchers(null);
    }

    public List<StoHead> getDraftVouchers(String storeCode) {
        if (storeCode == null || storeCode.isEmpty()) {
            return stoHeadRepository.findByStatus("DRAFT");
        }
        return stoHeadRepository.findByFromStoreAndStatus(storeCode, "DRAFT");
    }

    @Transactional
    public boolean deleteDraftVoucher(String stoNumber) {
        if (stoNumber == null || stoNumber.trim().isEmpty()) {
            return false;
        }

        List<StoHead> heads = stoHeadRepository.findByStoNumber(stoNumber.trim());
        if (heads.isEmpty()) {
            return false;
        }

        boolean hasNonDraft = heads.stream().anyMatch(h -> h.getStatus() == null || !"DRAFT".equalsIgnoreCase(h.getStatus()));
        if (hasNonDraft) {
            throw new IllegalStateException("Only DRAFT vouchers can be deleted.");
        }

        stoItemRepository.deleteByStoNumber(stoNumber.trim());
        stoHeadRepository.deleteAll(heads);
        return true;
    }

    @Transactional
    public boolean deleteVoucher(String stoNumber) {
        if (stoNumber == null || stoNumber.trim().isEmpty()) {
            return false;
        }

        String normalized = stoNumber.trim();
        List<StoHead> heads = stoHeadRepository.findByStoNumber(normalized);
        if (heads.isEmpty()) {
            return false;
        }

        StoHead head = heads.get(0);
        if ("RECEIVED".equalsIgnoreCase(head.getReceivedStatus())) {
            throw new IllegalStateException("Cannot delete STO. It is already received in Stock Transfer In.");
        }

        boolean wasSubmitted = heads.stream().anyMatch(h -> h.getStatus() != null && "SUBMITTED".equalsIgnoreCase(h.getStatus()));
        String fromStore = head.getFromStore();
        String businessDate = head.getDate();
        String userName = head.getUserName() != null ? head.getUserName() : "";

        stoItemRepository.deleteByStoNumber(normalized);
        stoHeadRepository.deleteAll(heads);

        if (wasSubmitted && fromStore != null && !fromStore.isBlank() && businessDate != null && !businessDate.isBlank()) {
            dsrService.populateDSR(fromStore, businessDate, userName);
        }

        return true;
    }

    public List<StoHead> getAllStockTransfers() {
        List<StoHead> heads = stoHeadRepository.findByStatusAndTallySync("SUBMITTED", "0");
        heads.forEach(head -> {
            populateStoreNames(head);
            populateItemDetails(head.getItems());
        });
        return heads;
    }

    public StoHead getStoHeadByNumber(String stoNumber) {
        List<StoHead> heads = stoHeadRepository.findByStoNumber(stoNumber);
        if (heads.isEmpty()) {
            return null;
        }
        StoHead head = heads.get(0);
        populateStoreNames(head);
        populateItemDetails(head.getItems());
        return head;
    }

    private void populateStoreNames(StoHead head) {
        if (head.getFromStore() != null) {
            System.out.println("Populating FromStore: " + head.getFromStore());
            Optional<MJC.RGSons.model.Store> fromStoreOpt = storeRepository.findByStoreCode(head.getFromStore());
            if (fromStoreOpt.isPresent()) {
                head.setFromStoreName(fromStoreOpt.get().getStoreName());
            } else {
                System.out.println("FromStore not found: " + head.getFromStore());
                head.setFromStoreName(head.getFromStore()); // Fallback to code
            }
        }
        if (head.getToStore() != null) {
            System.out.println("Populating ToStore: " + head.getToStore());
            Optional<MJC.RGSons.model.Store> toStoreOpt = storeRepository.findByStoreCode(head.getToStore());
            if (toStoreOpt.isPresent()) {
                head.setToStoreName(toStoreOpt.get().getStoreName());
            } else {
                System.out.println("ToStore not found: " + head.getToStore());
                head.setToStoreName(head.getToStore()); // Fallback to code
            }
        }
    }

    public List<StoItem> getStoItemsByNumber(String stoNumber) {
        List<StoItem> items = stoItemRepository.findByStoNumberOrderByIdAsc(stoNumber);
        populateItemDetails(items);
        return items;
    }

    private void populateItemDetails(List<StoItem> items) {
        if (items == null) return;
        items.forEach(item -> {
            if (item.getItemCode() != null) {
                itemRepository.findByItemCode(item.getItemCode())
                    .ifPresent(masterItem -> item.setItemName(masterItem.getItemName()));
            }
            if (item.getSizeCode() != null) {
                sizeRepository.findByCode(item.getSizeCode())
                    .ifPresent(masterSize -> item.setSizeName(masterSize.getName()));
            }
        });
    }

    public String generateStoNumber(String storeCode) {
        try {
            return voucherService.getProvisionalVoucherNumber("STOCK_TRANSFER_OUT", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating STO voucher preview: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic (peek max + 1)
            Long max = stoHeadRepository.findMaxStoNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }

    public String generateStoNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("STOCK_TRANSFER_OUT", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating STO voucher number: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic
            Long max = stoHeadRepository.findMaxStoNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }
}
