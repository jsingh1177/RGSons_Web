package MJC.RGSons.controller;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryMaster>> getAllInventory() {
        return ResponseEntity.ok(inventoryService.getAllInventory());
    }

    @GetMapping("/item/{itemCode}")
    public ResponseEntity<Map<String, Object>> getInventoryByItem(@PathVariable String itemCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<InventoryMaster> inventory = inventoryService.getInventoryByItemCode(itemCode);
            response.put("success", true);
            response.put("inventory", inventory);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching inventory: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/stock")
    public ResponseEntity<Map<String, Object>> getStock(
            @RequestParam String storeCode,
            @RequestParam String itemCode,
            @RequestParam String sizeCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            Integer closing = inventoryService.getClosingStock(storeCode, itemCode, sizeCode);
            response.put("success", true);
            response.put("storeCode", storeCode);
            response.put("itemCode", itemCode);
            response.put("sizeCode", sizeCode);
            response.put("closing", closing);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching stock: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/save-all")
    public ResponseEntity<Map<String, Object>> saveInventory(@RequestBody List<InventoryMaster> inventoryList) {
        Map<String, Object> response = new HashMap<>();
        try {
            inventoryService.saveInventory(inventoryList);
            response.put("success", true);
            response.put("message", "Inventory saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error saving inventory: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
