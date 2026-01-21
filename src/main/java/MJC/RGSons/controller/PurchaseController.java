package MJC.RGSons.controller;

import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.service.PurchaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase")
@CrossOrigin(origins = "*")
public class PurchaseController {

    @Autowired
    private PurchaseService purchaseService;

    @PostMapping("/save")
    public ResponseEntity<?> savePurchase(@RequestBody Map<String, Object> payload) {
        try {
            // Extract Head Data
            Map<String, Object> headData = (Map<String, Object>) payload.get("head");
            PurHead purHead = new PurHead();
            purHead.setInvoiceNo((String) headData.get("invoiceNo"));
            purHead.setInvoiceDate((String) headData.get("invoiceDate"));
            purHead.setPartyCode((String) headData.get("partyCode"));
            purHead.setNarration((String) headData.get("narration"));
            purHead.setStoreCode((String) headData.get("storeCode"));
            purHead.setUserId((String) headData.get("userId"));
            
            // Handle numeric fields safely
            purHead.setPurchaseAmount(convertToDouble(headData.get("purchaseAmount")));
            purHead.setTotalAmount(convertToDouble(headData.get("totalAmount")));
            purHead.setOtherCharges(convertToDouble(headData.get("otherCharges")));
            purHead.setTotalExpenses(convertToDouble(headData.get("totalExpenses")));

            // Extract Items Data
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            List<PurItem> purItems = itemsData.stream().map(itemData -> {
                PurItem item = new PurItem();
                item.setInvoiceNo(purHead.getInvoiceNo());
                item.setInvoiceDate(purHead.getInvoiceDate());
                item.setItemCode((String) itemData.get("itemCode"));
                item.setSizeCode((String) itemData.get("sizeCode"));
                item.setStoreCode(purHead.getStoreCode());
                
                item.setMrp(convertToDouble(itemData.get("mrp")));
                item.setRate(convertToDouble(itemData.get("rate")));
                item.setQuantity(convertToInteger(itemData.get("quantity")));
                item.setAmount(convertToDouble(itemData.get("amount")));
                
                return item;
            }).toList();

            PurHead savedHead = purchaseService.savePurchase(purHead, purItems);
            return ResponseEntity.ok(Map.of("success", true, "message", "Purchase saved successfully", "data", savedHead));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error saving purchase: " + e.getMessage()));
        }
    }

    // Helper methods for safe conversion
    private Double convertToDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof Double) return (Double) value;
        if (value instanceof String) return Double.parseDouble((String) value);
        return 0.0;
    }

    private Integer convertToInteger(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Double) return ((Double) value).intValue();
        if (value instanceof String) return Integer.parseInt((String) value);
        return 0;
    }
}
