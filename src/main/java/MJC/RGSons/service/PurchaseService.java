package MJC.RGSons.service;

import MJC.RGSons.dto.PurchaseTransactionDTO;
import MJC.RGSons.model.*;
import MJC.RGSons.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public List<PurHead> getDraftVouchers() {
        return purHeadRepository.findByStatus("DRAFT");
    }

    public PurchaseTransactionDTO getPurchaseDetails(String invoiceNo) {
        PurHead head = purHeadRepository.findByInvoiceNo(invoiceNo);
        if (head == null) return null;

        List<PurItem> items = purItemRepository.findByInvoiceNo(invoiceNo);
        List<PurLedger> ledgers = purLedgerRepository.findByInvoiceNo(invoiceNo);

        PurchaseTransactionDTO dto = new PurchaseTransactionDTO();
        dto.setId(head.getId());
        dto.setInvoiceNo(head.getInvoiceNo());
        dto.setInvoiceDate(head.getInvoiceDate());
        dto.setPartyCode(head.getPartyCode());
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

        // If updating an existing invoice (check by Invoice No or ID), we should clear old items/ledgers
        // to avoid duplication or orphans.
        // Assuming InvoiceNo is unique identifier for the transaction business-wise.
        if (purHead.getId() != null) {
             // It's an update. 
             // We can rely on Hibernate merge if IDs are present in items, but usually frontend sends new list.
             // Safer to delete old items/ledgers for this invoice.
             List<PurItem> existingItems = purItemRepository.findByInvoiceNo(purHead.getInvoiceNo());
             purItemRepository.deleteAll(existingItems);
             
             List<PurLedger> existingLedgers = purLedgerRepository.findByInvoiceNo(purHead.getInvoiceNo());
             purLedgerRepository.deleteAll(existingLedgers);
        } else {
            // Check if invoice exists by InvoiceNo to handle "Edit" where ID might not be passed but InvoiceNo is same?
            // Or assume InvoiceNo is unique and if it exists, it's an update?
            // For now, let's rely on ID being passed for updates.
        }

        PurHead savedHead = purHeadRepository.save(purHead);

        for (PurItem item : purItems) {
            item.setInvoiceNo(savedHead.getInvoiceNo());
            if (item.getStoreCode() == null) {
                item.setStoreCode(savedHead.getStoreCode());
            }
            if (item.getInvoiceDate() == null) {
                item.setInvoiceDate(savedHead.getInvoiceDate());
            }
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
        
        // Update Inventory Master ONLY if NOT draft
        if (!isDraft) {
            inventoryService.updateInventoryFromPurchase(purItems);
        }

        return savedHead;
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
        List<PurHead> heads = purHeadRepository.findAll();
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
