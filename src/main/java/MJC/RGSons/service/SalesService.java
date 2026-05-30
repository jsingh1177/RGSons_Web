package MJC.RGSons.service;

import MJC.RGSons.dto.SalesTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.Store;
import MJC.RGSons.model.TranHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.VoucherConfig;
import MJC.RGSons.repository.DSRRepository;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.PartyRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranItemRepository;
import MJC.RGSons.repository.TranLedgerRepository;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.SizeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;

@Service
public class SalesService {

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private TranLedgerRepository tranLedgerRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private DSRRepository dsrRepository;

    @Autowired
    private VoucherService voucherService;

    @Autowired
    private InventoryService inventoryService;

    public List<SalesTransactionDTO> getDrafts(String storeCode) {
        List<TranHead> heads = tranHeadRepository.findByStoreCodeAndStatus(storeCode, "DRAFT");
        List<SalesTransactionDTO> drafts = new ArrayList<>();

        for (TranHead head : heads) {
            SalesTransactionDTO dto = new SalesTransactionDTO();
            dto.setInvoiceNo(head.getInvoiceNo());
            dto.setInvoiceDate(head.getInvoiceDate());
            dto.setPartyCode(head.getPartyCode());
            dto.setSaleAmount(head.getSaleAmount());
            dto.setTotalAmount(head.getTotalAmount());
            dto.setTenderType(head.getTenderType());
            dto.setStoreCode(head.getStoreCode());
            dto.setUserName(head.getUserName());
            dto.setStatus(head.getStatus());
            dto.setOtherSale(head.getOtherSale());
            dto.setTotalExpenses(head.getTotalExpenses());
            dto.setTotalTender(head.getTotalTender());

            // Get Party Name
            Party party = partyRepository.findByCode(head.getPartyCode());
            if (party != null) {
                dto.setPartyName(party.getName());
            }

            // Get Items
            List<TranItem> items = tranItemRepository.findByInvoiceNoOrderByIdAsc(head.getInvoiceNo());
            List<SalesTransactionDTO.SalesItemDTO> itemDTOs = new ArrayList<>();
            for (TranItem item : items) {
                SalesTransactionDTO.SalesItemDTO itemDTO = new SalesTransactionDTO.SalesItemDTO();
                itemDTO.setItemCode(item.getItemCode());
                itemDTO.setSizeCode(item.getSizeCode());
                itemDTO.setMrp(item.getMrp());
                itemDTO.setPrice(item.getPrice());
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setAmount(item.getAmount());
                
                // Fetch Item Name & Size Name
                Optional<Item> itemObj = itemRepository.findByItemCode(item.getItemCode());
                itemObj.ifPresent(i -> itemDTO.setItemName(i.getItemName()));
                
                Optional<Size> sizeObj = sizeRepository.findByCode(item.getSizeCode());
                sizeObj.ifPresent(s -> itemDTO.setSizeName(s.getName()));
                
                itemDTOs.add(itemDTO);
            }
            dto.setItems(itemDTOs);

            // Get Ledger Details (Other Sale, Expense, Tender)
            // Note: For drafts, we might not have saved ledger details if they were skipped.
            // But if we decide to save them even for drafts (without posting to actual ledgers), we can fetch them here.
            // Currently, saveTransaction skips saving ledger details for drafts.
            // So we might need to rely on TranHead fields (otherSale, totalExpenses, totalTender) 
            // and maybe we need to store the breakdown somewhere if we want to restore it fully.
            // However, the current requirement is just "draft list button".
            // If the user wants to EDIT a draft, we might need those details.
            // For now, let's just return what we have.
            
            drafts.add(dto);
        }
        return drafts;
    }

    public SalesTransactionDTO getTransactionDetails(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) {
            throw new IllegalArgumentException("invoiceNo is required");
        }
        TranHead head = tranHeadRepository.findByInvoiceNo(invoiceNo.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceNo));

        SalesTransactionDTO dto = new SalesTransactionDTO();
        dto.setInvoiceNo(head.getInvoiceNo());
        dto.setInvoiceDate(head.getInvoiceDate());
        dto.setPartyCode(head.getPartyCode());
        dto.setSaleAmount(head.getSaleAmount());
        dto.setTotalAmount(head.getTotalAmount());
        dto.setTenderType(head.getTenderType());
        dto.setStoreCode(head.getStoreCode());
        dto.setUserName(head.getUserName());
        dto.setStatus(head.getStatus());
        dto.setNarration(head.getNarration());
        dto.setOtherSale(head.getOtherSale());
        dto.setTotalExpenses(head.getTotalExpenses());
        dto.setTotalTender(head.getTotalTender());

        Party party = partyRepository.findByCode(head.getPartyCode());
        if (party != null) {
            dto.setPartyName(party.getName());
        }

        storeRepository.findByStoreCode(head.getStoreCode())
                .ifPresent(s -> dto.setStoreName(s.getStoreName()));

        List<TranItem> items = tranItemRepository.findByInvoiceNoOrderByIdAsc(head.getInvoiceNo());
        List<SalesTransactionDTO.SalesItemDTO> itemDTOs = new ArrayList<>();
        for (TranItem item : items) {
            SalesTransactionDTO.SalesItemDTO itemDTO = new SalesTransactionDTO.SalesItemDTO();
            itemDTO.setItemCode(item.getItemCode());
            itemDTO.setSizeCode(item.getSizeCode());
            itemDTO.setMrp(item.getMrp());
            itemDTO.setPrice(item.getPrice());
            itemDTO.setQuantity(item.getQuantity());
            itemDTO.setAmount(item.getAmount());
            itemRepository.findByItemCode(item.getItemCode()).ifPresent(i -> itemDTO.setItemName(i.getItemName()));
            sizeRepository.findByCode(item.getSizeCode()).ifPresent(s -> itemDTO.setSizeName(s.getName()));
            itemDTOs.add(itemDTO);
        }
        dto.setItems(itemDTOs);

        List<TranLedger> ledgers = tranLedgerRepository.findByInvoiceNo(head.getInvoiceNo());
        List<SalesTransactionDTO.LedgerEntryDTO> otherSaleDetails = new ArrayList<>();
        List<SalesTransactionDTO.LedgerEntryDTO> expenseDetails = new ArrayList<>();
        List<SalesTransactionDTO.LedgerEntryDTO> tenderDetails = new ArrayList<>();

        for (TranLedger l : ledgers) {
            SalesTransactionDTO.LedgerEntryDTO le = new SalesTransactionDTO.LedgerEntryDTO();
            le.setLedgerCode(l.getLedgerCode());
            le.setAmount(l.getAmount());
            ledgerRepository.findByCode(l.getLedgerCode()).ifPresent(led -> le.setLedgerName(led.getName()));
            if ("Other Sale".equalsIgnoreCase(l.getType())) {
                otherSaleDetails.add(le);
            } else if ("Expense".equalsIgnoreCase(l.getType())) {
                expenseDetails.add(le);
            } else if ("Tender".equalsIgnoreCase(l.getType())) {
                tenderDetails.add(le);
            }
        }

        dto.setOtherSaleDetails(otherSaleDetails);
        dto.setExpenseDetails(expenseDetails);
        dto.setTenderDetails(tenderDetails);

        return dto;
    }

    @Transactional
    public boolean deleteDraft(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) {
            return false;
        }

        Optional<TranHead> headOpt = tranHeadRepository.findByInvoiceNo(invoiceNo.trim());
        if (headOpt.isEmpty()) {
            return false;
        }

        TranHead head = headOpt.get();
        if (!"DRAFT".equalsIgnoreCase(head.getStatus())) {
            throw new IllegalStateException("Only DRAFT vouchers can be deleted.");
        }

        tranLedgerRepository.deleteByInvoiceNo(head.getInvoiceNo());
        tranItemRepository.deleteByInvoiceNo(head.getInvoiceNo());
        tranHeadRepository.delete(head);
        return true;
    }

    @Transactional
    public boolean deleteVoucher(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) {
            return false;
        }

        Optional<TranHead> headOpt = tranHeadRepository.findByInvoiceNo(invoiceNo.trim());
        if (headOpt.isEmpty()) {
            return false;
        }

        TranHead head = headOpt.get();
        List<TranItem> items = tranItemRepository.findByInvoiceNoOrderByIdAsc(head.getInvoiceNo());

        if ("SUBMITTED".equalsIgnoreCase(head.getStatus())) {
            String storeCode = head.getStoreCode();
            for (TranItem item : items) {
                String itemCode = item.getItemCode();
                String sizeCode = item.getSizeCode();
                int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                if (qty == 0 || storeCode == null || storeCode.isBlank() || itemCode == null || itemCode.isBlank() || sizeCode == null || sizeCode.isBlank()) {
                    continue;
                }
                Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(storeCode, itemCode, sizeCode);
                if (invOpt.isPresent()) {
                    InventoryMaster inv = invOpt.get();
                    int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
                    int nextOutward = currentOutward - qty;
                    inv.setOutward(Math.max(0, nextOutward));

                    int opening = inv.getOpening() != null ? inv.getOpening() : 0;
                    int purchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
                    int inward = inv.getInward() != null ? inv.getInward() : 0;
                    int outward = inv.getOutward() != null ? inv.getOutward() : 0;
                    inv.setClosing(opening + purchase + inward - outward);

                    inventoryMasterRepository.save(inv);
                }
            }
        }

        tranLedgerRepository.deleteByInvoiceNo(head.getInvoiceNo());
        tranItemRepository.deleteByInvoiceNo(head.getInvoiceNo());
        tranHeadRepository.delete(head);
        return true;
    }

    @jakarta.annotation.PostConstruct
    public void initParties() {
        if (partyRepository.count() == 0) {
            Party p1 = new Party();
            p1.setName("Cash Customer");
            p1.setCode("P001");
            p1.setAddress("Local");
            p1.setPhone("9999999999");
            p1.setStatus(true);
            partyRepository.save(p1);

            Party p2 = new Party();
            p2.setName("Regular Customer");
            p2.setCode("P002");
            p2.setAddress("City");
            p2.setPhone("8888888888");
            p2.setStatus(true);
            partyRepository.save(p2);
        }
    }

    public List<Party> getAllParties() {
        return partyRepository.findAll();
    }

    public List<Party> getPartiesByType(String type) {
        return partyRepository.findByType(type);
    }

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public Optional<Item> getItemByCode(String itemCode) {
        return itemRepository.findByItemCode(itemCode);
    }

    public List<TranItem> getTranItemsByDate(String date) {
        return tranItemRepository.findByInvoiceDate(date);
    }

    public List<TranItem> getTranItemsByStoreAndDate(String date, String storeCode) {
        return tranItemRepository.findByStoreCodeAndInvoiceDate(storeCode, date);
    }

    public List<TranLedger> getTranLedgersByStoreAndDate(String date, String storeCode) {
        return tranLedgerRepository.findByStoreCodeAndInvoiceDate(storeCode, date);
    }

    @Transactional
    public String saveTransaction(SalesTransactionDTO dto) {
        String status = dto.getStatus();
        if (status == null || status.isEmpty()) {
            status = "SUBMITTED";
        }

        boolean editMode = Boolean.TRUE.equals(dto.getEditMode());
        String invoiceNo = dto.getInvoiceNo();
        boolean isDraftInvoiceNo = invoiceNo != null && invoiceNo.startsWith("DRAFT-");
        boolean allowUpdateByVoucherNo = editMode || isDraftInvoiceNo;
        boolean isNew = invoiceNo == null || invoiceNo.isEmpty() || "New".equalsIgnoreCase(invoiceNo) || !allowUpdateByVoucherNo;

        Optional<TranHead> existingHeadOpt = (isNew || !allowUpdateByVoucherNo) ? Optional.empty() : tranHeadRepository.findByInvoiceNo(invoiceNo);
        TranHead head;
        java.util.Map<String, Integer> oldQtyByKey = new java.util.HashMap<>();

        if (existingHeadOpt.isPresent()) {
            head = existingHeadOpt.get();
            String requestedStoreCode = dto.getStoreCode();
            if (requestedStoreCode == null || requestedStoreCode.isBlank()) {
                requestedStoreCode = head.getStoreCode();
                dto.setStoreCode(requestedStoreCode);
            }
            String oldStoreCode = head.getStoreCode();
            String oldInvoiceNo = head.getInvoiceNo();
            boolean storeChanged =
                    oldStoreCode != null &&
                    !oldStoreCode.isBlank() &&
                    requestedStoreCode != null &&
                    !requestedStoreCode.isBlank() &&
                    !oldStoreCode.equalsIgnoreCase(requestedStoreCode);

            List<TranItem> existingItemsForReverse = null;
            if ("SUBMITTED".equalsIgnoreCase(head.getStatus())) {
                existingItemsForReverse = tranItemRepository.findByInvoiceNoOrderByIdAsc(oldInvoiceNo);
                for (TranItem it : existingItemsForReverse) {
                    String key = (it.getItemCode() != null ? it.getItemCode() : "") + "|" + (it.getSizeCode() != null ? it.getSizeCode() : "");
                    if (!key.equals("|")) {
                        int q = it.getQuantity() != null ? it.getQuantity() : 0;
                        oldQtyByKey.put(key, oldQtyByKey.getOrDefault(key, 0) + q);
                    }
                }
            }
            if (!"DRAFT".equalsIgnoreCase(head.getStatus())) {
                // oldQtyByKey already populated above (for stock validation)
            }
            
            // Converting Draft -> Final
            if ("DRAFT".equalsIgnoreCase(head.getStatus()) && "SUBMITTED".equalsIgnoreCase(status)) {
                if (oldInvoiceNo != null && oldInvoiceNo.startsWith("DRAFT-")) {
                    invoiceNo = generateInvoiceNumberForSave(requestedStoreCode);
                    head.setInvoiceNo(invoiceNo);
                    tranItemRepository.deleteByInvoiceNo(oldInvoiceNo);
                    tranLedgerRepository.deleteByInvoiceNo(oldInvoiceNo);
                } else {
                    tranItemRepository.deleteByInvoiceNo(oldInvoiceNo);
                    tranLedgerRepository.deleteByInvoiceNo(oldInvoiceNo);
                }
            } else {
                 if (storeChanged) {
                     if ("SUBMITTED".equalsIgnoreCase(status)) {
                         invoiceNo = generateInvoiceNumberForSave(requestedStoreCode);
                     } else {
                         String storeCodePart = (requestedStoreCode != null && !requestedStoreCode.isBlank()) ? requestedStoreCode.trim() : "NA";
                         invoiceNo = "DRAFT-" + storeCodePart + "-" + System.currentTimeMillis();
                     }
                     head.setInvoiceNo(invoiceNo);
                 } else {
                     invoiceNo = oldInvoiceNo;
                 }

                 if ("SUBMITTED".equalsIgnoreCase(head.getStatus()) && "SUBMITTED".equalsIgnoreCase(status)) {
                     reverseInventory(existingItemsForReverse, oldStoreCode);
                 }

                 tranItemRepository.deleteByInvoiceNo(oldInvoiceNo);
                 tranLedgerRepository.deleteByInvoiceNo(oldInvoiceNo);
            }
        } else {
            // New Transaction or Not Found
            head = new TranHead();
            
            if ("SUBMITTED".equalsIgnoreCase(status)) {
                invoiceNo = generateInvoiceNumberForSave(dto.getStoreCode());
            } else {
                if (isNew || invoiceNo == null || invoiceNo.isBlank() || !invoiceNo.startsWith("DRAFT-")) {
                    String storeCodePart = (dto.getStoreCode() != null && !dto.getStoreCode().isBlank()) ? dto.getStoreCode().trim() : "NA";
                    invoiceNo = "DRAFT-" + storeCodePart + "-" + System.currentTimeMillis();
                }
            }
            head.setInvoiceNo(invoiceNo);
        }

        dto.setInvoiceNo(invoiceNo);

        int totalQty = 0;
        if (dto.getItems() != null) {
            for (SalesTransactionDTO.SalesItemDTO it : dto.getItems()) {
                totalQty += it != null ? it.getQuantity() : 0;
            }
        }

        String normalizedInvoiceDate = formatDate(dto.getInvoiceDate());
        head.setInvoiceDate(normalizedInvoiceDate);
        head.setTranDate(parseToLocalDate(normalizedInvoiceDate));
        head.setPartyCode(dto.getPartyCode());
        head.setSaleAmount(dto.getSaleAmount());
        head.setTotalAmount(dto.getSaleAmount());
        head.setTenderType(dto.getTenderType());
        head.setStoreCode(dto.getStoreCode());
        head.setUserName(dto.getUserName());
        head.setNarration(dto.getNarration());
        head.setStatus(status);
        head.setTallySync("0");
        head.setTotalQty(totalQty);
        
        head.setOtherSale(dto.getOtherSale());
        head.setTotalExpenses(dto.getTotalExpenses());
        head.setTotalTender(dto.getTotalTender());
        head.setUpdatedAt(java.time.LocalDateTime.now());
        
        tranHeadRepository.save(head);
        if (head.getId() != null) {
            tranHeadRepository.syncTranDateFromInvoiceDate(head.getId());
        }
        if (head.getInvoiceNo() != null && !head.getInvoiceNo().isBlank()) {
            tranHeadRepository.syncTranDateFromInvoiceNo(head.getInvoiceNo());
        }

        if (!"DRAFT".equalsIgnoreCase(status)) {
            boolean allowNegative = false;
            try {
                VoucherConfig config = voucherService.getVoucherConfig("SALE");
                allowNegative = config != null && Boolean.TRUE.equals(config.getIsNegativeInventoryAllowed());
            } catch (Exception ignored) {
            }

            if (!allowNegative && dto.getItems() != null && !dto.getItems().isEmpty()) {
                java.time.LocalDate tranDate = parseToLocalDate(normalizedInvoiceDate);
                java.util.Map<String, Integer> newQtyByKey = new java.util.HashMap<>();
                for (SalesTransactionDTO.SalesItemDTO itemDto : dto.getItems()) {
                    String itemCode = itemDto.getItemCode();
                    String sizeCode = itemDto.getSizeCode();
                    if (itemCode == null || itemCode.isBlank() || sizeCode == null || sizeCode.isBlank()) {
                        continue;
                    }
                    int qty = itemDto.getQuantity();
                    String key = itemCode + "|" + sizeCode;
                    newQtyByKey.put(key, newQtyByKey.getOrDefault(key, 0) + qty);
                }

                for (java.util.Map.Entry<String, Integer> entry : newQtyByKey.entrySet()) {
                    String[] parts = entry.getKey().split("\\|", 2);
                    String itemCode = parts.length > 0 ? parts[0] : "";
                    String sizeCode = parts.length > 1 ? parts[1] : "";
                    int requiredQty = entry.getValue() != null ? entry.getValue() : 0;
                    int oldQty = oldQtyByKey.getOrDefault(entry.getKey(), 0);
                    int available = inventoryService.getClosingStock(dto.getStoreCode(), itemCode, sizeCode, tranDate) + oldQty;
                    if (requiredQty > available) {
                        String itemName = itemRepository.findByItemCode(itemCode).map(Item::getItemName).orElse(itemCode);
                        String sizeName = sizeRepository.findByCode(sizeCode).map(Size::getName).orElse(sizeCode);
                        throw new IllegalStateException("Insufficient stock for " + itemName + " (" + itemCode + "), " + sizeName + " (" + sizeCode + "). Available: " + available + ", Required: " + requiredQty);
                    }
                }
            }
        }

        // Save Items
        if (dto.getItems() != null) {
            for (SalesTransactionDTO.SalesItemDTO itemDto : dto.getItems()) {
                TranItem item = new TranItem();
                item.setInvoiceNo(dto.getInvoiceNo());
                item.setInvoiceDate(normalizedInvoiceDate);
                item.setTranDate(parseToLocalDate(normalizedInvoiceDate));
                item.setItemCode(itemDto.getItemCode());
                item.setSizeCode(itemDto.getSizeCode());
                item.setMrp(itemDto.getMrp());
                item.setPrice(itemDto.getPrice());
                item.setQuantity(itemDto.getQuantity());
                item.setAmount(itemDto.getAmount());
                item.setStoreCode(dto.getStoreCode());
                tranItemRepository.save(item);

                // Update Inventory ONLY if status is NOT DRAFT
                if (!"DRAFT".equalsIgnoreCase(status)) {
                    updateInventory(item.getItemCode(), item.getSizeCode(), item.getQuantity(), dto.getStoreCode());
                }
            }
        }
        if (head.getInvoiceNo() != null && !head.getInvoiceNo().isBlank()) {
            tranItemRepository.syncTranDateFromInvoiceNo(head.getInvoiceNo());
        }

        saveLedgerDetails(head.getId(), dto.getOtherSaleDetails(), "Other Sale", dto);
        saveLedgerDetails(head.getId(), dto.getExpenseDetails(), "Expense", dto);
        saveLedgerDetails(head.getId(), dto.getTenderDetails(), "Tender", dto);
        if (head.getInvoiceNo() != null && !head.getInvoiceNo().isBlank()) {
            tranLedgerRepository.syncTranDateFromInvoiceNo(head.getInvoiceNo());
        }

        return dto.getInvoiceNo();
    }

    private void reverseInventory(List<TranItem> items, String storeCode) {
        if (items == null || items.isEmpty()) return;
        if (storeCode == null || storeCode.isBlank()) return;
        for (TranItem item : items) {
            String itemCode = item.getItemCode();
            String sizeCode = item.getSizeCode();
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty == 0 || itemCode == null || itemCode.isBlank() || sizeCode == null || sizeCode.isBlank()) {
                continue;
            }
            Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(storeCode, itemCode, sizeCode);
            if (invOpt.isPresent()) {
                InventoryMaster inv = invOpt.get();
                int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
                int nextOutward = currentOutward - qty;
                inv.setOutward(Math.max(0, nextOutward));

                int opening = inv.getOpening() != null ? inv.getOpening() : 0;
                int purchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
                int inward = inv.getInward() != null ? inv.getInward() : 0;
                int outward = inv.getOutward() != null ? inv.getOutward() : 0;
                inv.setClosing(opening + purchase + inward - outward);
                inventoryMasterRepository.save(inv);
            }
        }
    }

    private LocalDate parseToLocalDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        } catch (Exception ignored) {
        }
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception ignored) {
        }
        return null;
    }

    private String formatDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            // Try parsing as dd-MM-yyyy
            java.time.format.DateTimeFormatter targetFormatter = java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy");
            java.time.LocalDate.parse(dateStr, targetFormatter);
            return dateStr;
        } catch (java.time.format.DateTimeParseException e) {
            try {
                // Try parsing as yyyy-MM-dd and convert
                java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
                return date.format(java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            } catch (java.time.format.DateTimeParseException ex) {
                try {
                    // Try parsing as d-MMM-yy (e.g. 4-Jan-26) and convert
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("d-MMM-yy", java.util.Locale.ENGLISH);
                    java.time.LocalDate date = java.time.LocalDate.parse(dateStr, formatter);
                    return date.format(java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                } catch (java.time.format.DateTimeParseException ex2) {
                    // Return original if parsing fails
                    return dateStr;
                }
            }
        }
    }

    private void updateInventory(String itemCode, String sizeCode, int quantity, String storeCode) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                storeCode, itemCode, sizeCode);

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setOutward(currentOutward + quantity);

            // Recalculate Closing: Closing = Opening + Purchase + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int purchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
            int inward = inv.getInward() != null ? inv.getInward() : 0;
            int outward = inv.getOutward();
            inv.setClosing(opening + purchase + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            // Handle case where inventory record doesn't exist?
            // For now, creating a new record with negative closing if allowed, or just tracking outward
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(storeCode);
            inv.setItemCode(itemCode);
            inv.setSizeCode(sizeCode);
            inv.setOpening(0);
            inv.setPurchase(0);
            inv.setInward(0);
            inv.setOutward(quantity);
            inv.setClosing(0 + 0 + 0 - quantity);
            inventoryMasterRepository.save(inv);
        }
    }

    private void saveLedgerDetails(Integer tranId, List<SalesTransactionDTO.LedgerEntryDTO> details, String type, SalesTransactionDTO headDto) {
        if (details != null) {
            for (SalesTransactionDTO.LedgerEntryDTO detail : details) {
                if (detail.getAmount() != null && detail.getAmount() != 0) {
                    TranLedger ledger = new TranLedger();
                    ledger.setTranId(tranId);
                    ledger.setInvoiceNo(headDto.getInvoiceNo());
                    String normalizedInvoiceDate = formatDate(headDto.getInvoiceDate());
                    ledger.setInvoiceDate(normalizedInvoiceDate);
                    ledger.setTranDate(parseToLocalDate(normalizedInvoiceDate));
                    ledger.setStoreCode(headDto.getStoreCode());
                    ledger.setLedgerCode(detail.getLedgerCode());
                    ledger.setAmount(detail.getAmount());
                    ledger.setType(type);
                    tranLedgerRepository.save(ledger);
                }
            }
        }
    }
    
    public String generateInvoiceNumber(String storeCode) {
        try {
            return voucherService.getProvisionalVoucherNumber("SALE", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating voucher preview: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic if voucher generation fails (e.g. no config)
            Long max = tranHeadRepository.findMaxInvoiceNo();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }

    public String generateInvoiceNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("SALE", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating voucher number: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic if voucher generation fails (e.g. no config)
            Long max = tranHeadRepository.findMaxInvoiceNo();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }

    public List<SalesTransactionDTO> getSalesData() {
        List<TranHead> heads = tranHeadRepository.findByStatusAndTallySync("SUBMITTED", "0");
        List<TranItem> items = tranItemRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        
        // Fetch all lookup data
        java.util.Map<String, String> partyNames = partyRepository.findAll().stream()
            .collect(Collectors.toMap(Party::getCode, Party::getName, (a, b) -> a));
            
        java.util.Map<String, String> itemNames = itemRepository.findAll().stream()
            .collect(Collectors.toMap(Item::getItemCode, Item::getItemName, (a, b) -> a));
            
        java.util.Map<String, String> ledgerNames = ledgerRepository.findAll().stream()
            .collect(Collectors.toMap(Ledger::getCode, Ledger::getName, (a, b) -> a));

        java.util.Map<String, String> sizeNames = sizeRepository.findAll().stream()
            .filter(s -> s.getCode() != null && s.getName() != null)
            .collect(Collectors.toMap(Size::getCode, Size::getName, (a, b) -> a));

        java.util.Map<String, Store> storeMap = storeRepository.findAll().stream()
            .collect(Collectors.toMap(Store::getStoreCode, store -> store, (a, b) -> a));
        
        // Group items by invoice number
        java.util.Map<String, List<TranItem>> itemsMap = items.stream()
            .collect(java.util.stream.Collectors.groupingBy(TranItem::getInvoiceNo));
            
        return heads.stream().map(head -> {
            SalesTransactionDTO dto = new SalesTransactionDTO();
            dto.setInvoiceNo(head.getInvoiceNo());
            dto.setInvoiceDate(head.getInvoiceDate());
            dto.setPartyCode(head.getPartyCode());
            dto.setPartyName(partyNames.getOrDefault(head.getPartyCode(), ""));
            dto.setSaleAmount(head.getSaleAmount());
            dto.setTotalAmount(head.getTotalAmount());
            dto.setTenderType(head.getTenderType());
            dto.setStoreCode(head.getStoreCode());
            Store store = storeMap.get(head.getStoreCode());
            if (store != null) {
                dto.setStoreName(store.getStoreName());
                dto.setSaleLed(store.getSaleLed());
            }
            dto.setUserId(head.getUserName());
            dto.setNarration(head.getNarration());
            
            dto.setOtherSale(head.getOtherSale());
            dto.setTotalExpenses(head.getTotalExpenses());
            dto.setTotalTender(head.getTotalTender());
            
            // Populate Ledger Details (Fetching separately for now, could be optimized)
            List<TranLedger> ledgers = tranLedgerRepository.findByTranId(head.getId());
            
            dto.setOtherSaleDetails(mapToLedgerDTO(ledgers, "Other Sale", ledgerNames));
            dto.setExpenseDetails(mapToLedgerDTO(ledgers, "Expense", ledgerNames));
            dto.setTenderDetails(mapToLedgerDTO(ledgers, "Tender", ledgerNames));

            List<TranItem> headItems = itemsMap.getOrDefault(head.getInvoiceNo(), java.util.Collections.emptyList());
            List<SalesTransactionDTO.SalesItemDTO> itemDtos = headItems.stream().map(item -> {
                SalesTransactionDTO.SalesItemDTO itemDto = new SalesTransactionDTO.SalesItemDTO();
                itemDto.setItemCode(item.getItemCode());
                itemDto.setItemName(itemNames.getOrDefault(item.getItemCode(), ""));
                itemDto.setSizeCode(item.getSizeCode());
                itemDto.setSizeName(sizeNames.getOrDefault(item.getSizeCode(), ""));
                itemDto.setMrp(item.getMrp());
                itemDto.setPrice(item.getPrice());
                itemDto.setQuantity(item.getQuantity());
                itemDto.setAmount(item.getAmount());
                return itemDto;
            }).collect(java.util.stream.Collectors.toList());
            
            dto.setItems(itemDtos);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

    public List<SalesTransactionDTO> getCustomerLedger(String partyCode) {
        List<TranHead> heads = tranHeadRepository.findByPartyCode(partyCode);
        
        Party party = partyRepository.findByCode(partyCode);
        String partyName = (party != null) ? party.getName() : "";

        return heads.stream().map(head -> {
            SalesTransactionDTO dto = new SalesTransactionDTO();
            dto.setInvoiceNo(head.getInvoiceNo());
            dto.setInvoiceDate(head.getInvoiceDate());
            dto.setPartyCode(head.getPartyCode());
            dto.setPartyName(partyName);
            dto.setSaleAmount(head.getSaleAmount());
            dto.setTotalAmount(head.getTotalAmount());
            dto.setTenderType(head.getTenderType());
            dto.setStoreCode(head.getStoreCode());
            dto.setUserId(head.getUserName());
            dto.setOtherSale(head.getOtherSale());
            dto.setTotalExpenses(head.getTotalExpenses());
            dto.setTotalTender(head.getTotalTender());
            return dto;
        }).sorted((a, b) -> {
             // Sort by date descending (assuming YYYY-MM-DD or comparable string)
             if (a.getInvoiceDate() == null) return 1;
             if (b.getInvoiceDate() == null) return -1;
             return b.getInvoiceDate().compareTo(a.getInvoiceDate());
        }).collect(Collectors.toList());
    }

    private List<SalesTransactionDTO.LedgerEntryDTO> mapToLedgerDTO(List<TranLedger> ledgers, String type, java.util.Map<String, String> ledgerNames) {
        return ledgers.stream()
                .filter(l -> l.getType().equals(type))
                .map(l -> {
                    SalesTransactionDTO.LedgerEntryDTO entry = new SalesTransactionDTO.LedgerEntryDTO();
                    entry.setLedgerCode(l.getLedgerCode());
                    entry.setLedgerName(ledgerNames.getOrDefault(l.getLedgerCode(), ""));
                    entry.setAmount(l.getAmount());
                    return entry;
                })
                .collect(Collectors.toList());
    }
}
