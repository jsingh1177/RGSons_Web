package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.StoItemRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
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
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private DSRService dsrService;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Transactional
    public StoHead saveStockTransfer(StoHead stoHead, List<StoItem> stoItems, boolean isDraft) {
        stoHead.setTranDate(parseToLocalDate(stoHead.getDate()));
        if (stoHead.getId() != null) {
            Optional<StoHead> existingOpt = stoHeadRepository.findById(stoHead.getId());
            if (existingOpt.isPresent()) {
                String existingStoNumber = existingOpt.get().getStoNumber();
                if (existingStoNumber != null && !existingStoNumber.isEmpty()) {
                    System.out.println("Deleting old items for STO Number: " + existingStoNumber);
                    stoItemRepository.deleteByStoNumber(existingStoNumber);
                    stoItemRepository.flush();
                    stoHead.setStoNumber(existingStoNumber);
                }
            }
        }

        if (stoHead.getId() == null) {
            String newStoNumber = generateStoNumberForSave(stoHead.getFromStore());
            stoHead.setStoNumber(newStoNumber);
        }
        
        stoHead.setStatus(isDraft ? "DRAFT" : "SUBMITTED");

        // Save the head
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

            if (!isDraft) {
                // Update Inventory (Outward from Source Store) only if not draft
                updateInventoryOutward(item);
            }
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

    private void updateInventoryOutward(StoItem item) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                item.getFromStore(), item.getItemCode(), item.getSizeCode());

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setOutward(currentOutward + item.getQuantity());

            // Recalculate Closing: Closing = Opening + Purchase + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int purchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
            int inward = inv.getInward() != null ? inv.getInward() : 0;
            int outward = inv.getOutward();
            inv.setClosing(opening + purchase + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            // Create new inventory record if not exists (though unusual for outward)
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(item.getFromStore());
            inv.setItemCode(item.getItemCode());
            inv.setItemName(item.getItemName());
            inv.setSizeCode(item.getSizeCode());
            inv.setSizeName(item.getSizeName());
            inv.setOpening(0);
            inv.setPurchase(0);
            inv.setInward(0);
            inv.setOutward(item.getQuantity());
            inv.setClosing(-item.getQuantity()); // Negative stock
            inventoryMasterRepository.save(inv);
        }
    }

    public List<StoHead> getAllStockTransfers() {
        List<StoHead> heads = stoHeadRepository.findByStatus("SUBMITTED");
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
        List<StoItem> items = stoItemRepository.findByStoNumber(stoNumber);
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
