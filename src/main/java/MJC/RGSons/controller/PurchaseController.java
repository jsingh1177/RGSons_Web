package MJC.RGSons.controller;

import MJC.RGSons.dto.PurchaseTransactionDTO;
import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.model.PurLedger;
import MJC.RGSons.service.PurchaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase")
@CrossOrigin(origins = "*")
public class PurchaseController {

    @Autowired
    private PurchaseService purchaseService;

    @GetMapping("/PurchaseData")
    public ResponseEntity<Map<String, Object>> getPurchaseData() {
        List<PurchaseTransactionDTO> transactions = purchaseService.getPurchaseData();
        return ResponseEntity.ok(Map.of("Invoices", transactions));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<PurHead>> getDraftVouchers() {
        return ResponseEntity.ok(purchaseService.getDraftVouchers());
    }

    @DeleteMapping("/drafts/{invoiceNo}")
    public ResponseEntity<?> deleteDraftVoucher(@PathVariable String invoiceNo) {
        try {
            boolean deleted = purchaseService.deleteDraftVoucher(invoiceNo);
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
            boolean deleted = purchaseService.deleteVoucher(invoiceNo);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Voucher not found"));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Voucher deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/details/{invoiceNo}")
    public ResponseEntity<PurchaseTransactionDTO> getPurchaseDetails(@PathVariable String invoiceNo) {
        PurchaseTransactionDTO dto = purchaseService.getPurchaseDetails(invoiceNo);
        if (dto != null) {
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/details-by-id/{id}")
    public ResponseEntity<PurchaseTransactionDTO> getPurchaseDetailsById(@PathVariable Integer id) {
        PurchaseTransactionDTO dto = purchaseService.getPurchaseDetailsById(id);
        if (dto != null) {
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/generate-invoice-no")
    public ResponseEntity<String> generateInvoiceNo(@RequestParam(required = false) String storeCode) {
        return ResponseEntity.ok(purchaseService.generateInvoiceNumber(storeCode));
    }

    @PostMapping("/save")
    public ResponseEntity<?> savePurchase(@RequestBody Map<String, Object> payload) {
        try {
            boolean isDraft = Boolean.TRUE.equals(payload.get("isDraft"));

            // Extract Head Data
            Map<String, Object> headData = toStringObjectMap(payload.get("head"));
            if (headData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid head data"));
            }
            PurHead purHead = new PurHead();
            if (headData.containsKey("id") && headData.get("id") != null) {
                purHead.setId(Integer.parseInt(headData.get("id").toString()));
            }
            purHead.setInvoiceNo(trim(asString(headData.get("invoiceNo"))));
            purHead.setInvoiceDate(normalizeDate(asString(headData.get("invoiceDate"))));
            purHead.setPartyCode(trim(asString(headData.get("partyCode"))));
            purHead.setPartyInvoiceNo(trim(asString(headData.get("partyInvoiceNo"))));
            purHead.setPurLed(trim(asString(headData.get("purLed"))));
            purHead.setNarration(trim(asString(headData.get("narration"))));
            purHead.setStoreCode(trim(asString(headData.get("storeCode"))));
            Object userNameValue = headData.get("userName");
            if (userNameValue != null) {
                purHead.setUserName(trim(String.valueOf(userNameValue)));
            } else {
                Object userIdValue = headData.get("userId");
                if (userIdValue != null) {
                    purHead.setUserName(trim(String.valueOf(userIdValue)));
                }
            }
            
            // Handle numeric fields safely
            purHead.setPurchaseAmount(convertToDouble(headData.get("purchaseAmount")));
            purHead.setTotalAmount(convertToDouble(headData.get("totalAmount")));

            List<Map<String, Object>> itemsData = toListOfStringObjectMap(payload.get("items"));
            if (itemsData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Items are required"));
            }
            List<PurItem> purItems = itemsData.stream().map(itemData -> {
                PurItem item = new PurItem();
                item.setInvoiceNo(purHead.getInvoiceNo());
                item.setInvoiceDate(purHead.getInvoiceDate());
                item.setItemCode(trim(asString(itemData.get("itemCode"))));
                item.setSizeCode(trim(asString(itemData.get("sizeCode"))));
                item.setStoreCode(purHead.getStoreCode());
                item.setPrice(convertToDouble(itemData.get("price")));
                item.setQuantity(convertToInteger(itemData.get("quantity")));
                item.setAmount(convertToDouble(itemData.get("amount")));
                return item;
            }).toList();

            Object ledgersObj = payload.get("ledgers");
            List<Map<String, Object>> ledgerData = ledgersObj != null ? toListOfStringObjectMap(ledgersObj) : List.of();
            List<PurLedger> purLedgers = null;
            if (!ledgerData.isEmpty()) {
                purLedgers = ledgerData.stream().map(ld -> {
                    PurLedger ledger = new PurLedger();
                    ledger.setInvoiceNo(purHead.getInvoiceNo());
                    ledger.setInvoiceDate(purHead.getInvoiceDate());
                    ledger.setStoreCode(purHead.getStoreCode());
                    ledger.setLedgerCode(trim(asString(ld.get("ledgerCode"))));
                    ledger.setAmount(convertToDouble(ld.get("amount")));
                    return ledger;
                }).toList();
            }

            PurHead savedHead = purchaseService.savePurchase(purHead, purItems, purLedgers, isDraft);
            return ResponseEntity.ok(Map.of("success", true, "message", "Purchase saved successfully", "data", savedHead));

        } catch (DataIntegrityViolationException e) {
            String root = getRootMessage(e);
            String rootLower = root.toLowerCase();
            if (rootLower.contains("uk_pur_invoice")) {
                return ResponseEntity.status(409).body(Map.of("success", false, "message", "Duplicate Party Invoice#"));
            }
            return ResponseEntity.status(409).body(Map.of("success", false, "message", "Duplicate data"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving purchase: " + e.getMessage()));
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

    // Helper methods for safe conversion
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
