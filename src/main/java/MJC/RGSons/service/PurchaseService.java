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

    @Transactional
    public PurHead savePurchase(PurHead purHead, List<PurItem> purItems, List<PurLedger> purLedgers) {
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

        // Update Inventory Master
        inventoryService.updateInventoryFromPurchase(purItems);

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
