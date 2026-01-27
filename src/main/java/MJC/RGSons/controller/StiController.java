package MJC.RGSons.controller;

import MJC.RGSons.model.StiHead;
import MJC.RGSons.model.StiItem;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.service.StiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sti")
@CrossOrigin(origins = "*")
public class StiController {

    @Autowired
    private StiService stiService;

    @PostMapping("/save")
    public ResponseEntity<?> saveStockTransferIn(@RequestBody Map<String, Object> payload) {
        try {
            // Extract Head Data
            Map<String, Object> headData = (Map<String, Object>) payload.get("head");
            StiHead stiHead = new StiHead();
            stiHead.setStiNumber((String) headData.get("stiNumber"));
            stiHead.setDate((String) headData.get("date"));
            stiHead.setStoNumber((String) headData.get("stoNumber"));
            stiHead.setStoDate((String) headData.get("stoDate"));
            stiHead.setFromStore((String) headData.get("fromStore"));
            stiHead.setToStore((String) headData.get("toStore"));
            stiHead.setUserName((String) headData.get("userName"));
            stiHead.setNarration((String) headData.get("narration"));
            stiHead.setReceivedStatus("RECEIVED");

            // Extract Items Data
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            List<StiItem> stiItems = itemsData.stream().map(itemData -> {
                StiItem item = new StiItem();
                item.setStiNumber(stiHead.getStiNumber());
                item.setStiDate(stiHead.getDate());
                item.setFromStore(stiHead.getFromStore());
                item.setToStore(stiHead.getToStore());
                
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

            StiHead savedHead = stiService.saveStockTransferIn(stiHead, stiItems);
            return ResponseEntity.ok(Map.of("success", true, "message", "Stock Transfer In saved successfully", "data", savedHead));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving stock transfer in: " + e.getMessage()));
        }
    }

    @GetMapping("/pending-stos/{toStore}")
    public ResponseEntity<?> getPendingStos(@PathVariable String toStore, @RequestParam(required = false) String businessDate) {
        try {
            List<StoHead> stos = stiService.getPendingStos(toStore, businessDate);
            return ResponseEntity.ok(Map.of("success", true, "stos", stos));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error fetching pending STOs: " + e.getMessage()));
        }
    }

    @GetMapping("/sto-items/{stoNumber}")
    public ResponseEntity<?> getStoItems(@PathVariable String stoNumber) {
        try {
            List<StoItem> items = stiService.getStoItems(stoNumber);
            return ResponseEntity.ok(Map.of("success", true, "items", items));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error fetching STO items: " + e.getMessage()));
        }
    }

    @GetMapping("/next-number")
    public ResponseEntity<?> getNextStiNumber(@RequestParam String storeCode) {
        try {
            String nextNo = stiService.generateStiNumber(storeCode);
            // Don't persist yet, just preview. 
            // Actually generateStiNumber in service calls voucherService.generateVoucherNumber which IS Transactional and persists sequence.
            // But usually for "next number" display we might want a preview or just return the next number.
            // Wait, SalesService.generateInvoiceNumber calls voucherService.generateVoucherNumber which increments sequence!
            // If I call this on page load, I burn numbers. 
            // SalesEntry.js calls fetchNextInvoiceNo -> SalesController.generateInvoiceNo -> SalesService.generateInvoiceNumber -> VoucherService.generateVoucherNumber.
            // So yes, it burns numbers on load. That seems to be the current design.
            return ResponseEntity.ok(Map.of("success", true, "stiNumber", nextNo));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error generating STI number: " + e.getMessage()));
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
