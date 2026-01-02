package MJC.RGSons.service;

import MJC.RGSons.dto.SalesTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.TranHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.PartyRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranItemRepository;
import MJC.RGSons.repository.TranLedgerRepository;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.SizeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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

    @Transactional
    public void saveTransaction(SalesTransactionDTO dto) {
        // Save Header
        TranHead head = new TranHead();
        head.setInvoiceNo(dto.getInvoiceNo());
        head.setInvoiceDate(dto.getInvoiceDate());
        head.setPartyCode(dto.getPartyCode());
        head.setSaleAmount(dto.getSaleAmount());
        head.setTotalAmount(dto.getSaleAmount()); // Populate legacy field
        head.setTenderType(dto.getTenderType());
        head.setStoreCode(dto.getStoreCode());
        head.setUserId(dto.getUserId());
        
        head.setOtherSale(dto.getOtherSale());
        head.setTotalExpenses(dto.getTotalExpenses());
        head.setTotalTender(dto.getTotalTender());
        
        tranHeadRepository.save(head);

        // Save Items
        if (dto.getItems() != null) {
            for (SalesTransactionDTO.SalesItemDTO itemDto : dto.getItems()) {
                TranItem item = new TranItem();
                item.setInvoiceNo(dto.getInvoiceNo());
                item.setInvoiceDate(dto.getInvoiceDate()); // Added
                item.setItemCode(itemDto.getItemCode());
                item.setSizeCode(itemDto.getSizeCode());
                item.setMrp(itemDto.getMrp());
                item.setQuantity(itemDto.getQuantity());
                item.setAmount(itemDto.getAmount());
                item.setStoreCode(dto.getStoreCode());
                tranItemRepository.save(item);

                // Update Inventory
                updateInventory(item.getItemCode(), item.getSizeCode(), item.getQuantity(), dto.getStoreCode());
            }
        }

        // Save Ledger Details
        saveLedgerDetails(head.getId(), dto.getOtherSaleDetails(), "Other Sale", dto);
        saveLedgerDetails(head.getId(), dto.getExpenseDetails(), "Expense", dto);
        saveLedgerDetails(head.getId(), dto.getTenderDetails(), "Tender", dto);
    }

    private void updateInventory(String itemCode, String sizeCode, int quantity, String storeCode) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                storeCode, itemCode, sizeCode);

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setOutward(currentOutward + quantity);

            // Recalculate Closing: Closing = Opening + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int inward = inv.getInward() != null ? inv.getInward() : 0;
            int outward = inv.getOutward();
            inv.setClosing(opening + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            // Handle case where inventory record doesn't exist?
            // For now, creating a new record with negative closing if allowed, or just tracking outward
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(storeCode);
            inv.setItemCode(itemCode);
            inv.setSizeCode(sizeCode);
            inv.setOpening(0);
            inv.setInward(0);
            inv.setOutward(quantity);
            inv.setClosing(0 + 0 - quantity);
            inventoryMasterRepository.save(inv);
        }
    }

    private void saveLedgerDetails(Long tranId, List<SalesTransactionDTO.LedgerEntryDTO> details, String type, SalesTransactionDTO headDto) {
        if (details != null) {
            for (SalesTransactionDTO.LedgerEntryDTO detail : details) {
                if (detail.getAmount() != null && detail.getAmount() != 0) {
                    TranLedger ledger = new TranLedger();
                    ledger.setTranId(tranId);
                    ledger.setInvoiceNo(headDto.getInvoiceNo()); // Added
                    ledger.setInvoiceDate(headDto.getInvoiceDate()); // Added
                    ledger.setStoreCode(headDto.getStoreCode()); // Added
                    ledger.setLedgerCode(detail.getLedgerCode());
                    ledger.setAmount(detail.getAmount());
                    ledger.setType(type);
                    tranLedgerRepository.save(ledger);
                }
            }
        }
    }
    
    public String generateInvoiceNumber() {
        long count = tranHeadRepository.count();
        return "INV-" + (count + 1);
    }

    public List<SalesTransactionDTO> getSalesData() {
        List<TranHead> heads = tranHeadRepository.findAll();
        List<TranItem> items = tranItemRepository.findAll();
        
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
            dto.setTenderType(head.getTenderType());
            dto.setStoreCode(head.getStoreCode());
            dto.setUserId(head.getUserId());
            
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
                itemDto.setQuantity(item.getQuantity());
                itemDto.setAmount(item.getAmount());
                return itemDto;
            }).collect(java.util.stream.Collectors.toList());
            
            dto.setItems(itemDtos);
            return dto;
        }).collect(java.util.stream.Collectors.toList());
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
