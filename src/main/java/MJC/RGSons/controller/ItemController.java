package MJC.RGSons.controller;

import MJC.RGSons.model.Item;
import MJC.RGSons.service.ItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/items")
@CrossOrigin(origins = "*")
public class ItemController {
    @Autowired
    private ItemService itemService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createItem(@RequestBody Item item) {
        Map<String, Object> response = new HashMap<>();
        try {
            Item createdItem = itemService.createItem(item);
            response.put("success", true);
            response.put("message", "Item created successfully");
            response.put("item", createdItem);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllItems() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Item> items = itemService.getAllItems();
            response.put("success", true);
            response.put("message", "Items retrieved successfully");
            response.put("items", items);
            response.put("count", items.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getItemById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Item> item = itemService.getItemById(id);
            if (item.isPresent()) {
                response.put("success", true);
                response.put("message", "Item found");
                response.put("item", item.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Item not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving item: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getItemByCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Item> item = itemService.getItemByCode(code);
            if (item.isPresent()) {
                response.put("success", true);
                response.put("message", "Item found");
                response.put("item", item.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Item not found with code: " + code);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving item: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateItem(@PathVariable Long id, @RequestBody Item itemDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Item updatedItem = itemService.updateItem(id, itemDetails);
            response.put("success", true);
            response.put("message", "Item updated successfully");
            response.put("item", updatedItem);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteItem(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            itemService.deleteItem(id);
            response.put("success", true);
            response.put("message", "Item deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchItems(@RequestParam String query) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Item> items = itemService.searchItems(query);
            response.put("success", true);
            response.put("message", "Items search completed");
            response.put("items", items);
            response.put("count", items.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkItemCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = itemService.itemCodeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Item code exists" : "Item code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking item code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
