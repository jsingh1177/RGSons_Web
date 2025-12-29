package MJC.RGSons.controller;

import MJC.RGSons.model.Size;
import MJC.RGSons.service.SizeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/sizes")
@CrossOrigin(origins = "*")
public class SizeController {
    
    @Autowired
    private SizeService sizeService;
    
    // Get all sizes
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllSizes() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Size> sizes = sizeService.getAllSizes();
            if (!sizes.isEmpty()) {
                System.out.println("First size fetched: " + sizes.get(0).getCode() + " - " + sizes.get(0).getName());
            } else {
                System.out.println("No sizes found in database.");
            }
            response.put("success", true);
            response.put("message", "Sizes retrieved successfully");
            response.put("sizes", sizes);
            response.put("count", sizes.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error retrieving sizes: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get size by ID
    @GetMapping("/{id}")
    public ResponseEntity<Size> getSizeById(@PathVariable Long id) {
        try {
            Optional<Size> size = sizeService.getSizeById(id);
            if (size.isPresent()) {
                return new ResponseEntity<>(size.get(), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get size by code
    @GetMapping("/code/{code}")
    public ResponseEntity<Size> getSizeByCode(@PathVariable String code) {
        try {
            Optional<Size> size = sizeService.getSizeByCode(code);
            if (size.isPresent()) {
                return new ResponseEntity<>(size.get(), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get active sizes only
    @GetMapping("/active")
    public ResponseEntity<List<Size>> getActiveSizes() {
        try {
            List<Size> sizes = sizeService.getActiveSizes();
            return new ResponseEntity<>(sizes, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get sizes by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Size>> getSizesByStatus(@PathVariable Boolean status) {
        try {
            List<Size> sizes = sizeService.getSizesByStatus(status);
            return new ResponseEntity<>(sizes, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Create new size
    @PostMapping
    public ResponseEntity<Map<String, Object>> createSize(@RequestBody Size size) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Validate size data
            sizeService.validateSize(size);
            
            Size createdSize = sizeService.createSize(size);
            response.put("success", true);
            response.put("message", "Size created successfully");
            response.put("size", createdSize);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error creating size: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update existing size
    @PutMapping("/{id}")
    public ResponseEntity<Size> updateSize(@PathVariable Long id, @RequestBody Size sizeDetails) {
        try {
            // Validate size data
            sizeService.validateSize(sizeDetails);
            
            Size updatedSize = sizeService.updateSize(id, sizeDetails);
            return new ResponseEntity<>(updatedSize, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Delete size (soft delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteSize(@PathVariable Long id) {
        try {
            sizeService.deleteSizeById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Hard delete size (permanent deletion)
    @DeleteMapping("/{id}/hard")
    public ResponseEntity<HttpStatus> hardDeleteSize(@PathVariable Long id) {
        try {
            sizeService.hardDeleteSizeById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Check if size code exists
    @GetMapping("/exists/{code}")
    public ResponseEntity<Boolean> checkSizeCodeExists(@PathVariable String code) {
        try {
            boolean exists = sizeService.existsByCode(code);
            return new ResponseEntity<>(exists, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Search sizes by name
    @GetMapping("/search")
    public ResponseEntity<List<Size>> searchSizesByName(@RequestParam String name) {
        try {
            List<Size> sizes = sizeService.searchSizesByName(name);
            return new ResponseEntity<>(sizes, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get sizes count by status
    @GetMapping("/count/status/{status}")
    public ResponseEntity<Long> getSizeCountByStatus(@PathVariable Boolean status) {
        try {
            long count = sizeService.getSizeCountByStatus(status);
            return new ResponseEntity<>(count, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get active sizes count
    @GetMapping("/count/active")
    public ResponseEntity<Long> getActiveSizeCount() {
        try {
            long count = sizeService.getActiveSizeCount();
            return new ResponseEntity<>(count, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Toggle size status
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Size> toggleSizeStatus(@PathVariable Long id) {
        try {
            Size updatedSize = sizeService.toggleSizeStatus(id);
            return new ResponseEntity<>(updatedSize, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Advanced search with multiple criteria
    @GetMapping("/search/advanced")
    public ResponseEntity<List<Size>> searchSizes(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean status) {
        try {
            List<Size> sizes = sizeService.searchSizes(name, status);
            return new ResponseEntity<>(sizes, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get sizes created after a specific date
    @GetMapping("/created-after")
    public ResponseEntity<List<Size>> getSizesCreatedAfter(@RequestParam String date) {
        try {
            LocalDateTime dateTime = LocalDateTime.parse(date);
            List<Size> sizes = sizeService.getSizesCreatedAfter(dateTime);
            return new ResponseEntity<>(sizes, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}