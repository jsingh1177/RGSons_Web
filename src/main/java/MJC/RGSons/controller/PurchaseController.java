package MJC.RGSons.controller;

import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.model.PurLedger;
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
            Object userNameValue = headData.get("userName");
            if (userNameValue != null) {
                purHead.setUserName(String.valueOf(userNameValue));
            } else {
                Object userIdValue = headData.get("userId");
                if (userIdValue != null) {
                    purHead.setUserName(String.valueOf(userIdValue));
                }
            }
            
            // Handle numeric fields safely
            purHead.setPurchaseAmount(convertToDouble(headData.get("purchaseAmount")));
            purHead.setTotalAmount(convertToDouble(headData.get("totalAmount")));

            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) payload.get("items");
            List<PurItem> purItems = itemsData.stream().map(itemData -> {
                PurItem item = new PurItem();
                item.setInvoiceNo(purHead.getInvoiceNo());
                item.setInvoiceDate(purHead.getInvoiceDate());
                item.setItemCode((String) itemData.get("itemCode"));
                item.setSizeCode((String) itemData.get("sizeCode"));
                item.setStoreCode(purHead.getStoreCode());
                item.setPrice(convertToDouble(itemData.get("price")));
                item.setQuantity(convertToInteger(itemData.get("quantity")));
                item.setAmount(convertToDouble(itemData.get("amount")));
                return item;
            }).toList();

            List<Map<String, Object>> ledgerData = (List<Map<String, Object>>) payload.get("ledgers");
            List<PurLedger> purLedgers = null;
            if (ledgerData != null) {
                purLedgers = ledgerData.stream().map(ld -> {
                    PurLedger ledger = new PurLedger();
                    ledger.setInvoiceNo(purHead.getInvoiceNo());
                    ledger.setInvoiceDate(purHead.getInvoiceDate());
                    ledger.setStoreCode(purHead.getStoreCode());
                    ledger.setLedgerCode((String) ld.get("ledgerCode"));
                    ledger.setAmount(convertToDouble(ld.get("amount")));
                    return ledger;
                }).toList();
            }

            PurHead savedHead = purchaseService.savePurchase(purHead, purItems, purLedgers);
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
}
