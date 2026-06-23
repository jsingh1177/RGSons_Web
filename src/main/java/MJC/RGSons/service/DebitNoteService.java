package MJC.RGSons.service;

import MJC.RGSons.dto.DebitNoteTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.LedMaster;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.PrHead;
import MJC.RGSons.model.PrItem;
import MJC.RGSons.model.PrLedger;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.Store;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.LedMasterRepository;
import MJC.RGSons.repository.LedgerRepository;
import MJC.RGSons.repository.PartyRepository;
import MJC.RGSons.repository.PrHeadRepository;
import MJC.RGSons.repository.PrItemRepository;
import MJC.RGSons.repository.PrLedgerRepository;
import MJC.RGSons.repository.SizeRepository;
import MJC.RGSons.repository.StoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DebitNoteService {

    @Autowired
    private PrHeadRepository prHeadRepository;

    @Autowired
    private PrItemRepository prItemRepository;

    @Autowired
    private PrLedgerRepository prLedgerRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private LedMasterRepository ledMasterRepository;

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

    public List<PrHead> getDraftVouchers() {
        return prHeadRepository.findByStatus("DRAFT");
    }

    public String generateInvoiceNumber(String storeCode) {
        try {
            return voucherService.getProvisionalVoucherNumber("DEBIT_NOTE", storeCode);
        } catch (Exception e) {
            String storePart = (storeCode != null && !storeCode.isBlank()) ? storeCode.trim() : "NA";
            return "DN-" + storePart + "-" + System.currentTimeMillis();
        }
    }

    public String generateInvoiceNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("DEBIT_NOTE", storeCode);
        } catch (Exception e) {
            String storePart = (storeCode != null && !storeCode.isBlank()) ? storeCode.trim() : "NA";
            return "DN-" + storePart + "-" + System.currentTimeMillis();
        }
    }

    public DebitNoteTransactionDTO getDebitNoteDetails(String invoiceNo) {
        PrHead head = null;
        if (invoiceNo != null && !invoiceNo.trim().isEmpty()) {
            String normalizedInvoiceNo = invoiceNo.trim();
            head = prHeadRepository.findTopByInvoiceNoAndStatusOrderByIdDesc(normalizedInvoiceNo, "DRAFT")
                    .orElseGet(() -> prHeadRepository.findTopByInvoiceNoOrderByIdDesc(normalizedInvoiceNo).orElse(null));
        }
        if (head == null) return null;

        List<PrItem> items = prItemRepository.findByInvoiceNoOrderByIdAsc(head.getInvoiceNo());
        List<PrLedger> ledgers = prLedgerRepository.findByInvoiceNo(head.getInvoiceNo());
        return buildDebitNoteTransactionDTO(head, items, ledgers);
    }

    public DebitNoteTransactionDTO getDebitNoteDetailsById(Integer id) {
        if (id == null) return null;
        PrHead head = prHeadRepository.findById(id).orElse(null);
        if (head == null) return null;

        String invoiceNo = head.getInvoiceNo();
        LocalDate tranDate = head.getTranDate();
        String storeCode = head.getStoreCode();

        List<PrItem> items = prItemRepository.findByInvoiceNoAndTranDateAndStoreCodeOrderByIdAsc(invoiceNo, tranDate, storeCode);
        List<PrLedger> ledgers = prLedgerRepository.findByInvoiceNoAndTranDateAndStoreCode(invoiceNo, tranDate, storeCode);
        return buildDebitNoteTransactionDTO(head, items, ledgers);
    }

    private DebitNoteTransactionDTO buildDebitNoteTransactionDTO(PrHead head, List<PrItem> items, List<PrLedger> ledgers) {
        DebitNoteTransactionDTO dto = new DebitNoteTransactionDTO();
        dto.setId(head.getId());
        dto.setInvoiceNo(head.getInvoiceNo());
        dto.setInvoiceDate(formatDate(head.getTranDate()));
        dto.setPartyCode(head.getPartyCode());

        Party party = head.getPartyCode() != null ? partyRepository.findByCode(head.getPartyCode()) : null;
        if (party != null) {
            dto.setPartyName(party.getName());
        } else {
            LedMaster ledMaster = head.getPartyCode() != null ? ledMasterRepository.findByCode(head.getPartyCode()) : null;
            if (ledMaster != null) dto.setPartyName(ledMaster.getName());
        }

        dto.setPurchaseAmount(head.getPurchaseAmount());
        dto.setTotalAmount(head.getTotalAmount());
        dto.setStoreCode(head.getStoreCode());
        storeRepository.findByStoreCode(head.getStoreCode()).ifPresent(s -> dto.setStoreName(s.getStoreName()));

        dto.setNarration(head.getNarration());
        dto.setUserName(head.getUserName());
        dto.setPurLed(head.getPurLed());

        String purLedName = "";
        if (head.getPurLed() != null) {
            purLedName = ledgerRepository.findByCode(head.getPurLed()).map(l -> l.getName()).orElse("");
            if (purLedName.isBlank()) {
                LedMaster lm = ledMasterRepository.findByCode(head.getPurLed());
                if (lm != null) purLedName = lm.getName();
            }
        }
        dto.setPurLedName(purLedName);

        if (items != null && !items.isEmpty()) {
            PrItem first = items.get(0);
            if (first != null) {
                dto.setOrgInvNo(first.getOrgInvNo());
                dto.setOrgInvDate(formatDate(first.getOrgInvDate()));
            }
        }

        Map<String, String> itemNames = itemRepository.findAll().stream()
                .collect(Collectors.toMap(Item::getItemCode, Item::getItemName, (a, b) -> a));
        Map<String, String> sizeNames = sizeRepository.findAll().stream()
                .filter(s -> s.getCode() != null && s.getName() != null)
                .collect(Collectors.toMap(Size::getCode, Size::getName, (a, b) -> a));

        if (items != null) {
            dto.setItems(items.stream().map(it -> {
                DebitNoteTransactionDTO.DebitNoteItemDTO d = new DebitNoteTransactionDTO.DebitNoteItemDTO();
                d.setItemCode(it.getItemCode());
                d.setItemName(itemNames.getOrDefault(it.getItemCode(), it.getItemCode()));
                d.setSizeCode(it.getSizeCode());
                d.setSizeName(sizeNames.getOrDefault(it.getSizeCode(), it.getSizeCode()));
                d.setOrgInvNo(it.getOrgInvNo());
                d.setOrgInvDate(formatDate(it.getOrgInvDate()));
                d.setPrice(it.getPrice());
                d.setQuantity(it.getQuantity());
                d.setAmount(it.getAmount());
                return d;
            }).toList());
        }

        if (ledgers != null) {
            Map<String, String> ledgerNames = ledgerRepository.findAll().stream()
                    .collect(Collectors.toMap(MJC.RGSons.model.Ledger::getCode, MJC.RGSons.model.Ledger::getName, (a, b) -> a));
            Map<String, String> ledMasterNames = ledMasterRepository.findAll().stream()
                    .filter(l -> l.getCode() != null && l.getName() != null)
                    .collect(Collectors.toMap(LedMaster::getCode, LedMaster::getName, (a, b) -> a));

            dto.setLedgerDetails(ledgers.stream().map(l -> {
                DebitNoteTransactionDTO.DebitNoteLedgerDTO d = new DebitNoteTransactionDTO.DebitNoteLedgerDTO();
                d.setLedgerCode(l.getLedgerCode());
                d.setLedgerName(ledgerNames.getOrDefault(l.getLedgerCode(), ledMasterNames.getOrDefault(l.getLedgerCode(), l.getLedgerCode())));
                d.setAmount(l.getAmount());
                d.setType(l.getType());
                return d;
            }).toList());
        }

        return dto;
    }

    @Transactional
    public boolean deleteDraftVoucher(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) return false;
        String normalizedInvoiceNo = invoiceNo.trim();
        PrHead head = prHeadRepository.findTopByInvoiceNoAndStatusOrderByIdDesc(normalizedInvoiceNo, "DRAFT").orElse(null);
        if (head == null) return false;

        prItemRepository.deleteByInvoiceNo(head.getInvoiceNo());
        prLedgerRepository.deleteByInvoiceNo(head.getInvoiceNo());
        prHeadRepository.delete(head);
        return true;
    }

    @Transactional
    public boolean deleteVoucher(String invoiceNo) {
        if (invoiceNo == null || invoiceNo.trim().isEmpty()) return false;
        String normalizedInvoiceNo = invoiceNo.trim();
        PrHead head = prHeadRepository.findTopByInvoiceNoOrderByIdDesc(normalizedInvoiceNo).orElse(null);
        if (head == null) return false;

        List<PrItem> items = prItemRepository.findByInvoiceNo(head.getInvoiceNo());
        if ("SUBMITTED".equalsIgnoreCase(head.getStatus())) {
            List<PurItem> reverse = new ArrayList<>();
            for (PrItem it : items) {
                PurItem r = new PurItem();
                r.setStoreCode(it.getStoreCode() != null ? it.getStoreCode() : head.getStoreCode());
                r.setItemCode(it.getItemCode());
                r.setSizeCode(it.getSizeCode());
                Integer q = it.getQuantity() != null ? it.getQuantity() : 0;
                r.setQuantity(q);
                reverse.add(r);
            }
            inventoryService.updateInventoryFromPurchase(reverse);
        }

        prItemRepository.deleteByInvoiceNo(head.getInvoiceNo());
        prLedgerRepository.deleteByInvoiceNo(head.getInvoiceNo());
        prHeadRepository.delete(head);
        return true;
    }

    @Transactional
    public PrHead saveDebitNote(PrHead prHead, List<PrItem> prItems, List<PrLedger> prLedgers, boolean isDraft) {
        if (prHead == null) {
            throw new IllegalArgumentException("Invalid head data");
        }
        if (prItems == null || prItems.isEmpty()) {
            throw new IllegalArgumentException("Items are required");
        }

        if (prHead.getTranDate() == null) {
            throw new IllegalArgumentException("Date is required");
        }
        if (prHead.getStoreCode() == null || prHead.getStoreCode().isBlank()) {
            throw new IllegalArgumentException("Store Code is required");
        }

        PrHead existingById = null;
        if (prHead.getId() != null) {
            existingById = prHeadRepository.findById(prHead.getId()).orElse(null);
        }

        if (existingById != null && "SUBMITTED".equalsIgnoreCase(existingById.getStatus()) && isDraft) {
            throw new IllegalArgumentException("Cannot save a submitted Debit Note as draft.");
        }

        double headTotal = prHead.getTotalAmount() != null ? prHead.getTotalAmount() : 0.0;
        double itemsTotal = prHead.getPurchaseAmount() != null ? prHead.getPurchaseAmount() : 0.0;
        double ledgerTotal = 0.0;
        if (prLedgers != null) {
            for (PrLedger l : prLedgers) {
                ledgerTotal += l != null && l.getAmount() != null ? l.getAmount() : 0.0;
            }
        }
        if (Math.abs(headTotal - (itemsTotal + ledgerTotal)) > 0.01) {
            throw new IllegalArgumentException("Invoice Value and Total Allocated amount must match.");
        }

        String invoiceNoToClear = null;
        if (existingById != null && existingById.getInvoiceNo() != null && !existingById.getInvoiceNo().isBlank()) {
            invoiceNoToClear = existingById.getInvoiceNo();
        }

        if (existingById != null) {
            prHead.setInvoiceNo(existingById.getInvoiceNo());
        } else {
            if (!isDraft) {
                prHead.setInvoiceNo(generateInvoiceNumberForSave(prHead.getStoreCode()));
            } else {
                String storePart = (prHead.getStoreCode() != null && !prHead.getStoreCode().isBlank()) ? prHead.getStoreCode().trim() : "NA";
                String current = prHead.getInvoiceNo();
                if (current == null || current.isBlank() || "New".equalsIgnoreCase(current) || !current.startsWith("DRAFT-")) {
                    prHead.setInvoiceNo("DRAFT-DN-" + storePart + "-" + System.currentTimeMillis());
                }
            }
        }

        prHead.setStatus(isDraft ? "DRAFT" : "SUBMITTED");

        if (invoiceNoToClear != null) {
            if (!isDraft && existingById != null && "SUBMITTED".equalsIgnoreCase(existingById.getStatus())) {
                List<PrItem> oldItems = prItemRepository.findByInvoiceNo(invoiceNoToClear);
                String existingStoreCode = existingById.getStoreCode();
                List<PurItem> reverseOld = new ArrayList<>();
                for (PrItem oi : oldItems) {
                    PurItem r = new PurItem();
                    r.setStoreCode(oi.getStoreCode() != null ? oi.getStoreCode() : existingStoreCode);
                    r.setItemCode(oi.getItemCode());
                    r.setSizeCode(oi.getSizeCode());
                    Integer q = oi.getQuantity() != null ? oi.getQuantity() : 0;
                    r.setQuantity(q);
                    reverseOld.add(r);
                }
                inventoryService.updateInventoryFromPurchase(reverseOld);
            }
            prItemRepository.deleteByInvoiceNo(invoiceNoToClear);
            prLedgerRepository.deleteByInvoiceNo(invoiceNoToClear);
        }

        int totalQty = 0;
        for (PrItem it : prItems) {
            totalQty += it != null && it.getQuantity() != null ? it.getQuantity() : 0;
        }
        prHead.setTotalQty(totalQty);
        prHead.setUpdatedAt(java.time.LocalDateTime.now());
        PrHead savedHead = prHeadRepository.save(prHead);

        if (prItems != null) {
            for (PrItem item : prItems) {
                item.setInvoiceNo(savedHead.getInvoiceNo());
                if (item.getStoreCode() == null || item.getStoreCode().isBlank()) {
                    item.setStoreCode(savedHead.getStoreCode());
                }
                if (item.getTranDate() == null) {
                    item.setTranDate(savedHead.getTranDate());
                }
                prItemRepository.save(item);
            }
        }

        if (prLedgers != null) {
            for (PrLedger ledger : prLedgers) {
                ledger.setPrId(savedHead.getId());
                ledger.setInvoiceNo(savedHead.getInvoiceNo());
                ledger.setStoreCode(savedHead.getStoreCode());
                if (ledger.getTranDate() == null) {
                    ledger.setTranDate(savedHead.getTranDate());
                }
                prLedgerRepository.save(ledger);
            }
        }

        if (!isDraft) {
            List<PurItem> negative = new ArrayList<>();
            for (PrItem it : prItems) {
                PurItem p = new PurItem();
                p.setStoreCode(it.getStoreCode() != null ? it.getStoreCode() : savedHead.getStoreCode());
                p.setItemCode(it.getItemCode());
                p.setSizeCode(it.getSizeCode());
                Integer q = it.getQuantity() != null ? it.getQuantity() : 0;
                p.setQuantity(-q);
                negative.add(p);
            }
            inventoryService.updateInventoryFromPurchase(negative);
        }

        return savedHead;
    }

    private String formatDate(LocalDate date) {
        if (date == null) return null;
        return date.format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
    }

    public LocalDate parseToLocalDate(String dateStr) {
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

    public List<DebitNoteTransactionDTO> getDebitNoteData() {
        List<PrHead> heads = prHeadRepository.findByStatusAndTallySync("SUBMITTED", false);
        List<PrItem> items = prItemRepository.findAll();
        List<PrLedger> ledgers = prLedgerRepository.findAll();

        Map<String, String> partyNames = partyRepository.findAll().stream()
                .collect(Collectors.toMap(Party::getCode, Party::getName, (a, b) -> a));
        Map<String, String> ledMasterNames = ledMasterRepository.findAll().stream()
                .filter(l -> l.getCode() != null && l.getName() != null)
                .collect(Collectors.toMap(LedMaster::getCode, LedMaster::getName, (a, b) -> a));
        Map<String, String> itemNames = itemRepository.findAll().stream()
                .collect(Collectors.toMap(Item::getItemCode, Item::getItemName, (a, b) -> a));
        Map<String, String> sizeNames = sizeRepository.findAll().stream()
                .filter(s -> s.getCode() != null && s.getName() != null)
                .collect(Collectors.toMap(Size::getCode, Size::getName, (a, b) -> a));
        Map<String, Store> storeMap = storeRepository.findAll().stream()
                .collect(Collectors.toMap(Store::getStoreCode, s -> s, (a, b) -> a));
        Map<String, String> ledgerNames = ledgerRepository.findAll().stream()
                .collect(Collectors.toMap(MJC.RGSons.model.Ledger::getCode, MJC.RGSons.model.Ledger::getName, (a, b) -> a));

        Map<String, List<PrItem>> itemsMap = items.stream()
                .collect(Collectors.groupingBy(PrItem::getInvoiceNo));
        Map<Integer, List<PrLedger>> ledgersMap = ledgers.stream()
                .filter(l -> l.getPrId() != null)
                .collect(Collectors.groupingBy(PrLedger::getPrId));

        return heads.stream().map(head -> {
            DebitNoteTransactionDTO dto = new DebitNoteTransactionDTO();
            dto.setId(head.getId());
            dto.setInvoiceNo(head.getInvoiceNo());
            dto.setInvoiceDate(formatDate(head.getTranDate()));
            dto.setPartyCode(head.getPartyCode());
            dto.setPartyName(partyNames.getOrDefault(head.getPartyCode(), ledMasterNames.getOrDefault(head.getPartyCode(), "")));
            dto.setPurchaseAmount(head.getPurchaseAmount());
            dto.setTotalAmount(head.getTotalAmount());
            dto.setStoreCode(head.getStoreCode());
            Store store = storeMap.get(head.getStoreCode());
            if (store != null) dto.setStoreName(store.getStoreName());
            dto.setNarration(head.getNarration());
            dto.setUserName(head.getUserName());
            dto.setPurLed(head.getPurLed());
            dto.setPurLedName(ledgerNames.getOrDefault(head.getPurLed(), ledMasterNames.getOrDefault(head.getPurLed(), "")));

            List<PrItem> headItems = itemsMap.getOrDefault(head.getInvoiceNo(), java.util.Collections.emptyList());
            dto.setItems(headItems.stream()
                    .filter(it -> head.getStoreCode() == null || head.getStoreCode().equalsIgnoreCase(it.getStoreCode()))
                    .map(it -> {
                        DebitNoteTransactionDTO.DebitNoteItemDTO d = new DebitNoteTransactionDTO.DebitNoteItemDTO();
                        d.setItemCode(it.getItemCode());
                        d.setItemName(itemNames.getOrDefault(it.getItemCode(), it.getItemCode()));
                        d.setSizeCode(it.getSizeCode());
                        d.setSizeName(sizeNames.getOrDefault(it.getSizeCode(), it.getSizeCode()));
                        d.setOrgInvNo(it.getOrgInvNo());
                        d.setOrgInvDate(formatDate(it.getOrgInvDate()));
                        d.setPrice(it.getPrice());
                        d.setQuantity(it.getQuantity());
                        d.setAmount(it.getAmount());
                        return d;
                    }).toList());

            List<PrLedger> headLedgers = ledgersMap.getOrDefault(head.getId(), java.util.Collections.emptyList());
            dto.setLedgerDetails(headLedgers.stream().map(l -> {
                DebitNoteTransactionDTO.DebitNoteLedgerDTO d = new DebitNoteTransactionDTO.DebitNoteLedgerDTO();
                d.setLedgerCode(l.getLedgerCode());
                d.setLedgerName(ledgerNames.getOrDefault(l.getLedgerCode(), ledMasterNames.getOrDefault(l.getLedgerCode(), "")));
                d.setAmount(l.getAmount());
                d.setType(l.getType());
                return d;
            }).toList());
            return dto;
        }).toList();
    }
}

