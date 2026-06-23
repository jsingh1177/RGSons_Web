package MJC.RGSons.controller;

import MJC.RGSons.dto.DebitNoteTransactionDTO;
import MJC.RGSons.model.PrHead;
import MJC.RGSons.model.PrItem;
import MJC.RGSons.model.PrLedger;
import MJC.RGSons.service.DebitNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debit-note")
@CrossOrigin(origins = "*")
public class DebitNoteController {

    @Autowired
    private DebitNoteService debitNoteService;

    @GetMapping("/DebitNoteData")
    public ResponseEntity<Map<String, Object>> getDebitNoteData() {
        List<DebitNoteTransactionDTO> transactions = debitNoteService.getDebitNoteData();
        return ResponseEntity.ok(Map.of("Invoices", transactions));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<PrHead>> getDraftVouchers() {
        return ResponseEntity.ok(debitNoteService.getDraftVouchers());
    }

    @DeleteMapping("/drafts/{invoiceNo}")
    public ResponseEntity<?> deleteDraftVoucher(@PathVariable String invoiceNo) {
        try {
            boolean deleted = debitNoteService.deleteDraftVoucher(invoiceNo);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Draft not found"));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Draft deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{invoiceNo}")
    public ResponseEntity<?> deleteVoucher(@PathVariable String invoiceNo) {
        try {
            boolean deleted = debitNoteService.deleteVoucher(invoiceNo);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Voucher not found"));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Voucher deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/details/{invoiceNo}")
    public ResponseEntity<DebitNoteTransactionDTO> getDebitNoteDetails(@PathVariable String invoiceNo) {
        DebitNoteTransactionDTO dto = debitNoteService.getDebitNoteDetails(invoiceNo);
        if (dto != null) return ResponseEntity.ok(dto);
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/details-by-id/{id}")
    public ResponseEntity<DebitNoteTransactionDTO> getDebitNoteDetailsById(@PathVariable Integer id) {
        DebitNoteTransactionDTO dto = debitNoteService.getDebitNoteDetailsById(id);
        if (dto != null) return ResponseEntity.ok(dto);
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/generate-invoice-no")
    public ResponseEntity<String> generateInvoiceNo(@RequestParam(required = false) String storeCode) {
        return ResponseEntity.ok(debitNoteService.generateInvoiceNumber(storeCode));
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveDebitNote(@RequestBody Map<String, Object> payload) {
        try {
            boolean isDraft = Boolean.TRUE.equals(payload.get("isDraft"));

            Map<String, Object> headData = toStringObjectMap(payload.get("head"));
            if (headData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid head data"));
            }

            PrHead head = new PrHead();
            if (headData.containsKey("id") && headData.get("id") != null) {
                head.setId(Integer.parseInt(headData.get("id").toString()));
            }
            head.setInvoiceNo(trim(asString(headData.get("invoiceNo"))));
            head.setStoreCode(trim(asString(headData.get("storeCode"))));
            head.setPartyCode(trim(asString(headData.get("partyCode"))));
            head.setPurLed(trim(asString(headData.get("purLed"))));
            head.setNarration(trim(asString(headData.get("narration"))));

            Object userNameValue = headData.get("userName");
            if (userNameValue != null) {
                head.setUserName(trim(String.valueOf(userNameValue)));
            } else {
                Object userIdValue = headData.get("userId");
                if (userIdValue != null) {
                    head.setUserName(trim(String.valueOf(userIdValue)));
                }
            }

            head.setPurchaseAmount(convertToDouble(headData.get("purchaseAmount")));
            head.setTotalAmount(convertToDouble(headData.get("totalAmount")));

            String invoiceDateRaw = normalizeDate(asString(headData.get("invoiceDate")));
            LocalDate tranDate = debitNoteService.parseToLocalDate(invoiceDateRaw);
            head.setTranDate(tranDate);

            String orgInvNoHead = trim(asString(headData.get("orgInvNo")));
            String orgInvDateHeadRaw = normalizeDate(asString(headData.get("orgInvDate")));
            LocalDate orgInvDateHead = debitNoteService.parseToLocalDate(orgInvDateHeadRaw);

            List<Map<String, Object>> itemsData = toListOfStringObjectMap(payload.get("items"));
            if (itemsData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Items are required"));
            }

            List<PrItem> items = itemsData.stream().map(itemData -> {
                PrItem item = new PrItem();
                item.setInvoiceNo(head.getInvoiceNo());
                item.setTranDate(head.getTranDate());
                item.setStoreCode(head.getStoreCode());
                item.setItemCode(trim(asString(itemData.get("itemCode"))));
                item.setSizeCode(trim(asString(itemData.get("sizeCode"))));
                item.setPrice(convertToDouble(itemData.get("price")));
                item.setQuantity(convertToInteger(itemData.get("quantity")));
                item.setAmount(convertToDouble(itemData.get("amount")));

                String orgInvNo = trim(asString(itemData.get("orgInvNo")));
                String orgInvDateRaw = normalizeDate(asString(itemData.get("orgInvDate")));
                LocalDate orgInvDate = debitNoteService.parseToLocalDate(orgInvDateRaw);
                item.setOrgInvNo(orgInvNo != null ? orgInvNo : orgInvNoHead);
                item.setOrgInvDate(orgInvDate != null ? orgInvDate : orgInvDateHead);
                return item;
            }).toList();

            Object ledgersObj = payload.get("ledgers");
            List<Map<String, Object>> ledgerData = ledgersObj != null ? toListOfStringObjectMap(ledgersObj) : List.of();
            List<PrLedger> ledgers = null;
            if (!ledgerData.isEmpty()) {
                ledgers = ledgerData.stream().map(ld -> {
                    PrLedger l = new PrLedger();
                    l.setInvoiceNo(head.getInvoiceNo());
                    l.setTranDate(head.getTranDate());
                    l.setStoreCode(head.getStoreCode());
                    l.setLedgerCode(trim(asString(ld.get("ledgerCode"))));
                    l.setAmount(convertToDouble(ld.get("amount")));
                    l.setType(trim(asString(ld.get("type"))));
                    return l;
                }).toList();
            }

            PrHead savedHead = debitNoteService.saveDebitNote(head, items, ledgers, isDraft);
            return ResponseEntity.ok(Map.of("success", true, "message", "Debit Note saved successfully", "data", savedHead));

        } catch (DataIntegrityViolationException e) {
            String root = getRootMessage(e);
            return ResponseEntity.status(409).body(Map.of("success", false, "message", root != null && !root.isBlank() ? root : "Duplicate data"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving debit note: " + e.getMessage()));
        }
    }

    private String getRootMessage(Throwable t) {
        Throwable cur = t;
        while (cur.getCause() != null && cur.getCause() != cur) {
            cur = cur.getCause();
        }
        String msg = cur.getMessage();
        return msg != null ? msg : "";
    }

    private String asString(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private Map<String, Object> toStringObjectMap(Object obj) {
        if (!(obj instanceof Map<?, ?> m)) return Map.of();
        Map<String, Object> out = new HashMap<>();
        for (Map.Entry<?, ?> e : m.entrySet()) {
            if (e.getKey() == null) continue;
            out.put(String.valueOf(e.getKey()), e.getValue());
        }
        return out;
    }

    private List<Map<String, Object>> toListOfStringObjectMap(Object obj) {
        if (!(obj instanceof List<?> list)) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object v : list) {
            if (!(v instanceof Map<?, ?>)) continue;
            out.add(toStringObjectMap(v));
        }
        return out;
    }

    private Double convertToDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof Double) return (Double) value;
        if (value instanceof String) {
            String s = ((String) value).trim();
            if (s.isEmpty()) return 0.0;
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ex) {
                return 0.0;
            }
        }
        return 0.0;
    }

    private Integer convertToInteger(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Double) return ((Double) value).intValue();
        if (value instanceof String) {
            String s = ((String) value).trim();
            if (s.isEmpty()) return 0;
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ex) {
                return 0;
            }
        }
        return 0;
    }

    private String normalizeDate(String date) {
        if (date == null || date.isEmpty()) return date;
        String trimmed = date.trim();
        if (trimmed.matches("^\\d{2}-\\d{2}-\\d{4}$")) return trimmed;
        if (trimmed.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            String[] parts = trimmed.split("-");
            return parts[2] + "-" + parts[1] + "-" + parts[0];
        }
        if (trimmed.matches("^\\d{2}/\\d{2}/\\d{4}$")) {
            String[] parts = trimmed.split("/");
            return parts[0] + "-" + parts[1] + "-" + parts[2];
        }
        return trimmed;
    }

    private String trim(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }
}

