package MJC.RGSons.controller;

import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.service.StoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        return ResponseEntity.ok(Map.of("head", head, "items", items));
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
            // Extract Head Data
            Map<String, Object> headData = (Map<String, Object>) payload.get("head");
            StoHead stoHead = new StoHead();
            stoHead.setStoNumber((String) headData.get("stoNumber"));
            stoHead.setDate((String) headData.get("date"));
            stoHead.setFromStore((String) headData.get("fromStore"));
            stoHead.setToStore((String) headData.get("toStore"));
            stoHead.setUserName((String) headData.get("userName"));
            stoHead.setNarration((String) headData.get("narration"));
            stoHead.setReceivedStatus("PENDING"); // Default

            // Extract Items Data
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            List<StoItem> stoItems = itemsData.stream().map(itemData -> {
                StoItem item = new StoItem();
                item.setStoNumber(stoHead.getStoNumber());
                item.setStoDate(stoHead.getDate());
                item.setFromStore(stoHead.getFromStore());
                item.setToStore(stoHead.getToStore());
                
                item.setItemCode((String) itemData.get("itemCode"));
                item.setItemName((String) itemData.get("itemName"));
                item.setSizeCode((String) itemData.get("sizeCode"));
                item.setSizeName((String) itemData.get("sizeName"));
                
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

            StoHead savedHead = stoService.saveStockTransfer(stoHead, stoItems);
            return ResponseEntity.ok(Map.of("success", true, "message", "Stock Transfer saved successfully", "data", savedHead));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving stock transfer: " + e.getMessage()));
        }
    }

    // Helper methods for safe conversion
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
}
