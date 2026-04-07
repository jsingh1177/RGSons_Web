package MJC.RGSons.service;

import MJC.RGSons.dto.PurchaseTransactionDTO;
import MJC.RGSons.model.*;
import MJC.RGSons.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private VoucherService voucherService;

    public List<PurHead> getDraftVouchers() {
        return purHeadRepository.findByStatus("DRAFT");
    }

    public String generateInvoiceNumber(String storeCode) {
        try {
            return voucherService.getProvisionalVoucherNumber("PURCHASE", storeCode);
        } catch (Exception e) {
            String storePart = (storeCode != null && !storeCode.isBlank()) ? storeCode.trim() : "NA";
            return "PUR-" + storePart + "-" + System.currentTimeMillis();
        }
    }

    public String generateInvoiceNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("PURCHASE", storeCode);
        } catch (Exception e) {
            String storePart = (storeCode != null && !storeCode.isBlank()) ? storeCode.trim() : "NA";
            return "PUR-" + storePart + "-" + System.currentTimeMillis();
        }
    }

    @Transactional
    public boolean deleteDraftVoucher(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) {
            return false;
        }

        String normalizedInvoiceNo = invoiceNo.trim();
        PurHead head = purHeadRepository.findTopByInvoiceNoAndStatusOrderByIdDesc(normalizedInvoiceNo, "DRAFT")
                .orElseGet(() -> purHeadRepository.findTopByInvoiceNoOrderByIdDesc(normalizedInvoiceNo).orElse(null));
        if (head == null) {
            return false;
        }

        if (!"DRAFT".equalsIgnoreCase(head.getStatus())) {
            throw new IllegalStateException("Only DRAFT vouchers can be deleted.");
        }

        purItemRepository.deleteByInvoiceNo(head.getInvoiceNo());
        purLedgerRepository.deleteByInvoiceNo(head.getInvoiceNo());
        purHeadRepository.delete(head);
        return true;
    }

    public PurchaseTransactionDTO getPurchaseDetails(String invoiceNo) {
        PurHead head = null;
        if (invoiceNo != null && !invoiceNo.trim().isEmpty()) {
            String normalizedInvoiceNo = invoiceNo.trim();
            head = purHeadRepository.findTopByInvoiceNoAndStatusOrderByIdDesc(normalizedInvoiceNo, "DRAFT")
                    .orElseGet(() -> purHeadRepository.findTopByInvoiceNoOrderByIdDesc(normalizedInvoiceNo).orElse(null));
        }
        if (head == null) return null;

        List<PurItem> items = purItemRepository.findByInvoiceNo(invoiceNo);
        List<PurLedger> ledgers = purLedgerRepository.findByInvoiceNo(invoiceNo);
        return buildPurchaseTransactionDTO(head, items, ledgers);
    }

    public PurchaseTransactionDTO getPurchaseDetailsById(Integer id) {
        if (id == null) return null;
        PurHead head = purHeadRepository.findById(id).orElse(null);
        if (head == null) return null;

        String invoiceNo = head.getInvoiceNo();
        String invoiceDate = head.getInvoiceDate();
        String storeCode = head.getStoreCode();

        List<PurItem> items = purItemRepository.findByInvoiceNoAndInvoiceDateAndStoreCode(invoiceNo, invoiceDate, storeCode);
        List<PurLedger> ledgers = purLedgerRepository.findByInvoiceNoAndInvoiceDateAndStoreCode(invoiceNo, invoiceDate, storeCode);
        return buildPurchaseTransactionDTO(head, items, ledgers);
    }

    private PurchaseTransactionDTO buildPurchaseTransactionDTO(PurHead head, List<PurItem> items, List<PurLedger> ledgers) {

        PurchaseTransactionDTO dto = new PurchaseTransactionDTO();
        dto.setId(head.getId());
        dto.setInvoiceNo(head.getInvoiceNo());
        dto.setInvoiceDate(head.getInvoiceDate());
        dto.setPartyCode(head.getPartyCode());
        dto.setPartyInvoiceNo(head.getPartyInvoiceNo());
        Party party = partyRepository.findByCode(head.getPartyCode());
        if (party != null) {
            dto.setPartyName(party.getName());
        }
        
        dto.setPurchaseAmount(head.getPurchaseAmount());
        dto.setTotalAmount(head.getTotalAmount());
        dto.setStoreCode(head.getStoreCode());
        storeRepository.findByStoreCode(head.getStoreCode()).ifPresent(s -> dto.setStoreName(s.getStoreName()));
        
        dto.setNarration(head.getNarration());
        dto.setUserName(head.getUserName());
        dto.setPurLed(head.getPurLed());
        ledgerRepository.findByCode(head.getPurLed()).ifPresent(l -> dto.setPurLedName(l.getName()));

        dto.setItems(items.stream().map(item -> {
            PurchaseTransactionDTO.PurchaseItemDTO itemDto = new PurchaseTransactionDTO.PurchaseItemDTO();
            itemDto.setItemCode(item.getItemCode());
            itemRepository.findByItemCode(item.getItemCode()).ifPresent(i -> itemDto.setItemName(i.getItemName()));
            
            itemDto.setSizeCode(item.getSizeCode());
            sizeRepository.findByCode(item.getSizeCode()).ifPresent(s -> itemDto.setSizeName(s.getName()));
            
            itemDto.setPrice(item.getPrice());
            itemDto.setQuantity(item.getQuantity());
            itemDto.setAmount(item.getAmount());
            return itemDto;
        }).collect(Collectors.toList()));

        dto.setLedgerDetails(ledgers.stream().map(ledger -> {
            PurchaseTransactionDTO.PurchaseLedgerDTO ledgerDto = new PurchaseTransactionDTO.PurchaseLedgerDTO();
            ledgerDto.setLedgerCode(ledger.getLedgerCode());
            ledgerRepository.findByCode(ledger.getLedgerCode()).ifPresent(l -> ledgerDto.setLedgerName(l.getName()));
            ledgerDto.setAmount(ledger.getAmount());
            ledgerDto.setType(ledger.getType());
            return ledgerDto;
        }).collect(Collectors.toList()));

        return dto;
    }
    
    @Transactional
    public PurHead savePurchase(PurHead purHead, List<PurItem> purItems, List<PurLedger> purLedgers, boolean isDraft) {
        // Set Status
        purHead.setStatus(isDraft ? "DRAFT" : "SUBMITTED");
        purHead.setTranDate(parseToLocalDate(purHead.getInvoiceDate()));

        PurHead existingById = null;
        if (purHead.getId() != null) {
            existingById = purHeadRepository.findById(purHead.getId()).orElse(null);
        }

        double headTotal = purHead.getTotalAmount() != null ? purHead.getTotalAmount() : 0.0;
        double itemsTotal = purHead.getPurchaseAmount() != null ? purHead.getPurchaseAmount() : 0.0;
        double ledgerTotal = 0.0;

        if (purLedgers != null) {
            for (PurLedger ledger : purLedgers) {
                if (ledger.getAmount() != null) {
                    ledgerTotal += ledger.getAmount();
                }
            }
        }

        if (Math.abs(headTotal - (itemsTotal + ledgerTotal)) > 0.01) {
            throw new IllegalArgumentException("Invoice Value and Total Allocated amount must match.");
        }

        String invoiceNoToClear = null;
        if (existingById != null && existingById.getInvoiceNo() != null && !existingById.getInvoiceNo().isEmpty()) {
            invoiceNoToClear = existingById.getInvoiceNo();
        }

        if (existingById != null) {
            if ("DRAFT".equalsIgnoreCase(existingById.getStatus()) && !isDraft) {
                if (existingById.getInvoiceNo() != null && existingById.getInvoiceNo().startsWith("DRAFT-")) {
                    purHead.setInvoiceNo(generateInvoiceNumberForSave(purHead.getStoreCode()));
                } else {
                    purHead.setInvoiceNo(existingById.getInvoiceNo());
                }
            } else {
                purHead.setInvoiceNo(existingById.getInvoiceNo());
            }
        } else {
            if (!isDraft) {
                purHead.setInvoiceNo(generateInvoiceNumberForSave(purHead.getStoreCode()));
            } else {
                String storePart = (purHead.getStoreCode() != null && !purHead.getStoreCode().isBlank()) ? purHead.getStoreCode().trim() : "NA";
                String current = purHead.getInvoiceNo();
                if (current == null || current.isBlank() || "New".equalsIgnoreCase(current) || !current.startsWith("DRAFT-")) {
                    purHead.setInvoiceNo("DRAFT-" + storePart + "-" + System.currentTimeMillis());
                }
            }
        }

        if (invoiceNoToClear != null) {
            purItemRepository.deleteByInvoiceNo(invoiceNoToClear);
            purItemRepository.flush();
            purLedgerRepository.deleteByInvoiceNo(invoiceNoToClear);
            purLedgerRepository.flush();
        }

        PurHead savedHead = purHeadRepository.save(purHead);
        if (savedHead.getInvoiceNo() != null && !savedHead.getInvoiceNo().isBlank()) {
            purHeadRepository.syncTranDateFromInvoiceNo(savedHead.getInvoiceNo());
        }

        for (PurItem item : purItems) {
            item.setInvoiceNo(savedHead.getInvoiceNo());
            if (item.getStoreCode() == null) {
                item.setStoreCode(savedHead.getStoreCode());
            }
            if (item.getInvoiceDate() == null || item.getInvoiceDate().isBlank()) {
                item.setInvoiceDate(savedHead.getInvoiceDate());
            }
            item.setTranDate(parseToLocalDate(item.getInvoiceDate()));
            purItemRepository.save(item);
        }
        if (savedHead.getInvoiceNo() != null && !savedHead.getInvoiceNo().isBlank()) {
            purItemRepository.syncTranDateFromInvoiceNo(savedHead.getInvoiceNo());
        }

        if (purLedgers != null) {
            for (PurLedger ledger : purLedgers) {
                ledger.setInvoiceNo(savedHead.getInvoiceNo());
                if (ledger.getStoreCode() == null || ledger.getStoreCode().isBlank()) {
                    ledger.setStoreCode(savedHead.getStoreCode());
                }
                if (ledger.getInvoiceDate() == null || ledger.getInvoiceDate().isBlank()) {
                    ledger.setInvoiceDate(savedHead.getInvoiceDate());
                }
                ledger.setTranDate(parseToLocalDate(ledger.getInvoiceDate()));
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
        if (savedHead.getInvoiceNo() != null && !savedHead.getInvoiceNo().isBlank()) {
            purLedgerRepository.syncTranDateFromInvoiceNo(savedHead.getInvoiceNo());
        }
        
        // Update Inventory Master ONLY if NOT draft
        if (!isDraft) {
            inventoryService.updateInventoryFromPurchase(purItems);
        }

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
    
    // Overload for backward compatibility if needed (defaults to SUBMITTED/non-draft behavior?)
    // Or just refactor callers.
    @Transactional
    public PurHead savePurchase(PurHead purHead, List<PurItem> purItems, List<PurLedger> purLedgers) {
        return savePurchase(purHead, purItems, purLedgers, false);
    }

    public List<PurHead> getAllPurchases() {
        return purHeadRepository.findAll();
    }

    public List<PurchaseTransactionDTO> getPurchaseData() {
        List<PurHead> heads = purHeadRepository.findByStatus("SUBMITTED");
        List<PurItem> items = purItemRepository.findAll();
        List<PurLedger> ledgers = purLedgerRepository.findAll();

        // Fetch all lookup data
        Map<String, String> partyNames = partyRepository.findAll().stream()
                .collect(Collectors.toMap(Party::getCode, Party::getName, (a, b) -> a));

        Map<String, String> itemNames = itemRepository.findAll().stream()
                .collect(Collectors.toMap(Item::getItemCode, Item::getItemName, (a, b) -> a));

        Map<String, String> sizeNames = sizeRepository.findAll().stream()
                .filter(s -> s.getCode() != null && s.getName() != null)
                .collect(Collectors.toMap(Size::getCode, Size::getName, (a, b) -> a));

        Map<String, Store> storeMap = storeRepository.findAll().stream()
                .collect(Collectors.toMap(Store::getStoreCode, store -> store, (a, b) -> a));

        Map<String, String> ledgerNames = ledgerRepository.findAll().stream()
                .collect(Collectors.toMap(Ledger::getCode, Ledger::getName, (a, b) -> a));

        // Group items by invoice number
        Map<String, List<PurItem>> itemsMap = items.stream()
                .collect(Collectors.groupingBy(PurItem::getInvoiceNo));

        // Group ledgers by purId
        Map<Integer, List<PurLedger>> ledgersMap = ledgers.stream()
                .filter(l -> l.getPurId() != null)
                .collect(Collectors.groupingBy(PurLedger::getPurId));

        return heads.stream().map(head -> {
            PurchaseTransactionDTO dto = new PurchaseTransactionDTO();
            dto.setId(head.getId());
            dto.setInvoiceNo(head.getInvoiceNo());
            dto.setInvoiceDate(head.getInvoiceDate());
            dto.setPartyCode(head.getPartyCode());
            dto.setPartyName(partyNames.getOrDefault(head.getPartyCode(), ""));
            dto.setPurchaseAmount(head.getPurchaseAmount());
            dto.setTotalAmount(head.getTotalAmount());
            dto.setStoreCode(head.getStoreCode());
            Store store = storeMap.get(head.getStoreCode());
            if (store != null) {
                dto.setStoreName(store.getStoreName());
            }
            dto.setNarration(head.getNarration());
            dto.setUserName(head.getUserName());
            
            dto.setPurLed(head.getPurLed());
            dto.setPurLedName(ledgerNames.getOrDefault(head.getPurLed(), ""));

            // Map Items
            List<PurItem> headItems = itemsMap.getOrDefault(head.getInvoiceNo(), java.util.Collections.emptyList());
            // Filter by storeCode to ensure correctness if invoiceNo is not unique across stores
            headItems = headItems.stream()
                    .filter(i -> i.getStoreCode() != null && i.getStoreCode().equals(head.getStoreCode()))
                    .collect(Collectors.toList());

            List<PurchaseTransactionDTO.PurchaseItemDTO> itemDtos = headItems.stream().map(item -> {
                PurchaseTransactionDTO.PurchaseItemDTO itemDto = new PurchaseTransactionDTO.PurchaseItemDTO();
                itemDto.setItemCode(item.getItemCode());
                itemDto.setItemName(itemNames.getOrDefault(item.getItemCode(), ""));
                itemDto.setSizeCode(item.getSizeCode());
                itemDto.setSizeName(sizeNames.getOrDefault(item.getSizeCode(), ""));
                itemDto.setPrice(item.getPrice());
                itemDto.setQuantity(item.getQuantity());
                itemDto.setAmount(item.getAmount());
                return itemDto;
            }).collect(Collectors.toList());
            dto.setItems(itemDtos);

            // Map Ledgers
            List<PurLedger> headLedgers = ledgersMap.getOrDefault(head.getId(), java.util.Collections.emptyList());
            List<PurchaseTransactionDTO.PurchaseLedgerDTO> ledgerDtos = headLedgers.stream().map(ledger -> {
                PurchaseTransactionDTO.PurchaseLedgerDTO ledgerDto = new PurchaseTransactionDTO.PurchaseLedgerDTO();
                ledgerDto.setLedgerCode(ledger.getLedgerCode());
                ledgerDto.setLedgerName(ledgerNames.getOrDefault(ledger.getLedgerCode(), ""));
                ledgerDto.setAmount(ledger.getAmount());
                ledgerDto.setType(ledger.getType());
                return ledgerDto;
            }).collect(Collectors.toList());
            dto.setLedgerDetails(ledgerDtos);

            return dto;
        }).collect(Collectors.toList());
    }
}
