package MJC.RGSons.controller;

import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoLedger;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.service.StoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sto")
@CrossOrigin(origins = "*")
public class StoController {

    @Autowired
    private StoService stoService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllStockTransfers() {
        List<StoHead> transfers = stoService.getAllStockTransfers();
        return ResponseEntity.ok(Map.of("StockTransfers", transfers));
    }

    @GetMapping("/{stoNumber}")
    public ResponseEntity<?> getStockTransferByNumber(@PathVariable String stoNumber) {
        StoHead head = stoService.getStoHeadByNumber(stoNumber);
        if (head == null) {
            return ResponseEntity.notFound().build();
        }
        List<StoItem> items = stoService.getStoItemsByNumber(stoNumber);
        List<StoLedger> ledgers = stoService.getStoLedgersByNumber(stoNumber);
        return ResponseEntity.ok(Map.of("head", head, "items", items, "ledgers", ledgers));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<StoHead>> getDraftVouchers(@RequestParam(required = false) String storeCode) {
        return ResponseEntity.ok(stoService.getDraftVouchers(storeCode));
    }

    @DeleteMapping("/drafts/{stoNumber}")
    public ResponseEntity<?> deleteDraftVoucher(@PathVariable String stoNumber) {
        try {
            boolean deleted = stoService.deleteDraftVoucher(stoNumber);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Draft not found"));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Draft deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{stoNumber}")
    public ResponseEntity<?> deleteVoucher(@PathVariable String stoNumber) {
        try {
            boolean deleted = stoService.deleteVoucher(stoNumber);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "Voucher not found"));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Voucher deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/next-number")
    public ResponseEntity<?> getNextStoNumber(@RequestParam String storeCode) {
        try {
            String nextNo = stoService.generateStoNumber(storeCode);
            return ResponseEntity.ok(Map.of("success", true, "stoNumber", nextNo));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error generating STO number: " + e.getMessage()));
        }
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveStockTransfer(@RequestBody Map<String, Object> payload) {
        try {
            boolean isDraft = Boolean.TRUE.equals(payload.get("isDraft"));

            // Extract Head Data
            Map<String, Object> headData = toStringObjectMap(payload.get("head"));
            if (headData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid head data"));
            }
            StoHead stoHead = new StoHead();
            if (headData.containsKey("id") && headData.get("id") != null) {
                stoHead.setId(Integer.parseInt(headData.get("id").toString()));
            }
            stoHead.setStoNumber(trim(asString(headData.get("stoNumber"))));
            stoHead.setDate(normalizeDate(asString(headData.get("date"))));
            stoHead.setFromStore(trim(asString(headData.get("fromStore"))));
            stoHead.setToStore(trim(asString(headData.get("toStore"))));
            stoHead.setUserName(trim(asString(headData.get("userName"))));
            stoHead.setNarration(trim(asString(headData.get("narration"))));
            stoHead.setTotalAmount(convertToDouble(headData.get("totalAmount")));
            stoHead.setReceivedStatus("PENDING"); // Default

            // Extract Items Data
            List<Map<String, Object>> itemsData = toListOfStringObjectMap(payload.get("items"));
            if (itemsData.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Items are required"));
            }
            List<StoItem> stoItems = itemsData.stream().map(itemData -> {
                StoItem item = new StoItem();
                item.setStoNumber(stoHead.getStoNumber());
                item.setStoDate(stoHead.getDate());
                item.setFromStore(stoHead.getFromStore());
                item.setToStore(stoHead.getToStore());
                
                item.setItemCode(asString(itemData.get("itemCode")));
                item.setItemName(asString(itemData.get("itemName")));
                item.setSizeCode(asString(itemData.get("sizeCode")));
                item.setSizeName(asString(itemData.get("sizeName")));
                
                Double price = convertToDouble(itemData.get("price"));
                // Fallback for backward compatibility or if frontend sends 'mrp'
                if (price == 0.0 && itemData.containsKey("mrp")) {
                    price = convertToDouble(itemData.get("mrp"));
                }
                item.setPrice(price);
                item.setQuantity(convertToInteger(itemData.get("quantity")));
                item.setAmount(convertToDouble(itemData.get("amount")));
                
                return item;
            }).toList();

            Object ledgersObj = payload.get("ledgers");
            List<Map<String, Object>> ledgerData = ledgersObj != null ? toListOfStringObjectMap(ledgersObj) : List.of();
            List<StoLedger> stoLedgers = ledgerData.stream().map(row -> {
                StoLedger l = new StoLedger();
                l.setLedgerCode(trim(asString(row.get("ledgerCode"))));
                l.setAmount(convertToDouble(row.get("amount")));
                l.setType(trim(asString(row.get("type"))));
                return l;
            }).toList();

            StoHead savedHead = stoService.saveStockTransfer(stoHead, stoItems, stoLedgers, isDraft);
            return ResponseEntity.ok(Map.of("success", true, "message", "Stock Transfer saved successfully", "data", savedHead));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving stock transfer: " + e.getMessage()));
        }
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
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
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
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    private String normalizeDate(String date) {
        if (date == null || date.isEmpty()) return date;
        if (date.matches("^\\d{2}-\\d{2}-\\d{4}$")) return date;
        if (date.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            String[] parts = date.split("-");
            return parts[2] + "-" + parts[1] + "-" + parts[0];
        }
        if (date.matches("^\\d{2}/\\d{2}/\\d{4}$")) {
            String[] parts = date.split("/");
            return parts[0] + "-" + parts[1] + "-" + parts[2];
        }
        return date;
    }

    private String trim(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }
}
