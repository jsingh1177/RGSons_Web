package MJC.RGSons.controller;

import MJC.RGSons.model.Store;
import MJC.RGSons.service.StoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/stores")
@CrossOrigin(origins = "*")
public class StoreController {
    
    @Autowired
    private StoreService storeService;
    
    // Create a new store
    @PostMapping
    public ResponseEntity<Map<String, Object>> createStore(@RequestBody Store store) {
        Map<String, Object> response = new HashMap<>();
        try {
            Store createdStore = storeService.createStore(store);
            response.put("success", true);
            response.put("message", "Store created successfully");
            response.put("store", createdStore);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Get all stores
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllStores() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getAllStores();
            response.put("success", true);
            response.put("message", "Stores retrieved successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get store by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getStoreById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Store> store = storeService.getStoreById(id);
            if (store.isPresent()) {
                response.put("success", true);
                response.put("message", "Store found");
                response.put("store", store.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Store not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving store: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get stores mapped to a user
    @GetMapping("/by-user/{userName}")
    public ResponseEntity<Map<String, Object>> getStoresByUser(@PathVariable String userName) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByUserName(userName);
            response.put("success", true);
            response.put("message", "Stores for user retrieved successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores for user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Alias path for stores mapped to a user (to avoid any path issues)
    @GetMapping("/user/{userName}")
    public ResponseEntity<Map<String, Object>> getStoresByUserAlias(@PathVariable String userName) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByUserName(userName);
            response.put("success", true);
            response.put("message", "Stores for user retrieved successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores for user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get store by store code
    @GetMapping("/code/{storeCode}")
    public ResponseEntity<Map<String, Object>> getStoreByCode(@PathVariable String storeCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Store> store = storeService.getStoreByCode(storeCode);
            if (store.isPresent()) {
                response.put("success", true);
                response.put("message", "Store found");
                response.put("store", store.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Store not found with code: " + storeCode);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving store: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get stores by status
    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getStoresByStatus(@PathVariable Boolean status) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByStatus(status);
            response.put("success", true);
            response.put("message", "Stores retrieved successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get active stores
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveStores() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getActiveStores();
            response.put("success", true);
            response.put("message", "Active stores retrieved successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving active stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get stores by city
    @GetMapping("/city/{city}")
    public ResponseEntity<Map<String, Object>> getStoresByCity(@PathVariable String city) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByCity(city);
            response.put("success", true);
            response.put("message", "Stores retrieved successfully for city: " + city);
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get stores by zone
    @GetMapping("/zone/{zone}")
    public ResponseEntity<Map<String, Object>> getStoresByZone(@PathVariable String zone) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByZone(zone);
            response.put("success", true);
            response.put("message", "Stores retrieved successfully for zone: " + zone);
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Search stores by name
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchStoresByName(@RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.searchStoresByName(name);
            response.put("success", true);
            response.put("message", "Stores search completed");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get stores by multiple criteria
    @GetMapping("/filter")
    public ResponseEntity<Map<String, Object>> getStoresByCriteria(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) Boolean status) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Store> stores = storeService.getStoresByCriteria(city, zone, district, status);
            response.put("success", true);
            response.put("message", "Stores filtered successfully");
            response.put("stores", stores);
            response.put("count", stores.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error filtering stores: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update store
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateStore(@PathVariable String id, @RequestBody Store storeDetails) {
        System.out.println("StoreController.updateStore called for ID: " + id);
        Map<String, Object> response = new HashMap<>();
        try {
            Store updatedStore = storeService.updateStore(id, storeDetails);
            response.put("success", true);
            response.put("message", "Store updated successfully");
            response.put("store", updatedStore);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Update store
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateStore(@PathVariable String id, @RequestBody Store storeDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Store updatedStore = storeService.updateStore(id, storeDetails);
            response.put("success", true);
            response.put("message", "Store updated successfully");
            response.put("store", updatedStore);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Delete store
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteStore(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            storeService.deleteStore(id);
            response.put("success", true);
            response.put("message", "Store deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    // Deactivate store
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateStore(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Store deactivatedStore = storeService.deactivateStore(id);
            response.put("success", true);
            response.put("message", "Store deactivated successfully");
            response.put("store", deactivatedStore);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    // Activate store
    @PutMapping("/{id}/activate")
    public ResponseEntity<Map<String, Object>> activateStore(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Store activatedStore = storeService.activateStore(id);
            response.put("success", true);
            response.put("message", "Store activated successfully");
            response.put("store", activatedStore);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    // Check if store code exists
    @GetMapping("/check-code/{storeCode}")
    public ResponseEntity<Map<String, Object>> checkStoreCode(@PathVariable String storeCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = storeService.storeCodeExists(storeCode);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Store code exists" : "Store code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking store code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get store statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStoreStats() {
        Map<String, Object> response = new HashMap<>();
        try {
            long totalStores = storeService.getTotalStoreCount();
            long activeStores = storeService.countActiveStores();
            long inactiveStores = storeService.countStoresByStatus(false);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalStores", totalStores);
            stats.put("activeStores", activeStores);
            stats.put("inactiveStores", inactiveStores);
            
            response.put("success", true);
            response.put("message", "Store statistics retrieved successfully");
            response.put("stats", stats);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving store statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}