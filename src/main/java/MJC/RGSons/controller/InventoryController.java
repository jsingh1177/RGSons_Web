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

    @GetMapping("/stock/item")
    public ResponseEntity<Map<String, Object>> getStockByItem(
            @RequestParam String storeCode,
            @RequestParam String itemCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Integer> stockMap = inventoryService.getClosingStockByItem(storeCode, itemCode);
            response.put("success", true);
            response.put("storeCode", storeCode);
            response.put("itemCode", itemCode);
            response.put("stock", stockMap);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching stock: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/search-available")
    public ResponseEntity<Map<String, Object>> searchAvailableItems(
            @RequestParam String storeCode,
            @RequestParam String query) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, String>> items = inventoryService.searchAvailableItems(storeCode, query);
            response.put("success", true);
            response.put("items", items);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }



    @GetMapping("/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportInventory() {
        try {
            java.io.ByteArrayInputStream in = inventoryService.exportInventoryToExcel();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=inventory.xlsx");
            
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importInventory(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            Map<String, Object> result = inventoryService.importInventoryFromExcel(file);
            result.put("success", true);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error importing inventory: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/save-all")
    public ResponseEntity<Map<String, Object>> saveInventory(@RequestBody List<InventoryMaster> inventoryList) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<InventoryMaster> saved = inventoryService.saveInventory(inventoryList);
            response.put("success", true);
            response.put("message", "Inventory saved successfully");
            response.put("inventory", saved);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error saving inventory: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
