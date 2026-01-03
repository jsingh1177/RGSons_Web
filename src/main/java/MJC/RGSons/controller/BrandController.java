package MJC.RGSons.controller;

import MJC.RGSons.model.Brand;
import MJC.RGSons.service.BrandService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/brands")
@CrossOrigin(origins = "*")
public class BrandController {
    
    @Autowired
    private BrandService brandService;
    
    // Create a new brand
    @PostMapping
    public ResponseEntity<Map<String, Object>> createBrand(@RequestBody Brand brand) {
        Map<String, Object> response = new HashMap<>();
        try {
            Brand createdBrand = brandService.createBrand(brand);
            response.put("success", true);
            response.put("message", "Brand created successfully");
            response.put("brand", createdBrand);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Get all brands
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllBrands() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Brand> brands = brandService.getAllBrands();
            response.put("success", true);
            response.put("message", "Brands retrieved successfully");
            response.put("brands", brands);
            response.put("count", brands.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving brands: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get brand by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBrandById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Brand> brand = brandService.getBrandById(id);
            if (brand.isPresent()) {
                response.put("success", true);
                response.put("message", "Brand found");
                response.put("brand", brand.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Brand not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving brand: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get brand by code
    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getBrandByCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Brand> brand = brandService.getBrandByCode(code);
            if (brand.isPresent()) {
                response.put("success", true);
                response.put("message", "Brand found");
                response.put("brand", brand.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Brand not found with code: " + code);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving brand: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get brands by status
    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getBrandsByStatus(@PathVariable Boolean status) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Brand> brands = brandService.getBrandsByStatus(status);
            response.put("success", true);
            response.put("message", "Brands retrieved successfully");
            response.put("brands", brands);
            response.put("count", brands.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving brands: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get active brands
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveBrands() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Brand> brands = brandService.getActiveBrands();
            response.put("success", true);
            response.put("message", "Active brands retrieved successfully");
            response.put("brands", brands);
            response.put("count", brands.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving active brands: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Search brands by name
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBrandsByName(@RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Brand> brands = brandService.searchBrandsByName(name);
            response.put("success", true);
            response.put("message", "Brands search completed");
            response.put("brands", brands);
            response.put("count", brands.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching brands: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update brand
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBrand(@PathVariable String id, @RequestBody Brand brandDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Brand updatedBrand = brandService.updateBrand(id, brandDetails);
            response.put("success", true);
            response.put("message", "Brand updated successfully");
            response.put("brand", updatedBrand);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Delete brand
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteBrand(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            brandService.deleteBrand(id);
            response.put("success", true);
            response.put("message", "Brand deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    // Check if brand code exists
    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkBrandCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = brandService.brandCodeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Brand code exists" : "Brand code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking brand code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get brand statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getBrandStats() {
        Map<String, Object> response = new HashMap<>();
        try {
            long totalBrands = brandService.getTotalBrandCount();
            long activeBrands = brandService.countActiveBrands();
            long inactiveBrands = brandService.countBrandsByStatus(false);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", totalBrands);
            stats.put("active", activeBrands);
            stats.put("inactive", inactiveBrands);
            
            response.put("success", true);
            response.put("message", "Brand statistics retrieved successfully");
            response.put("stats", stats);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving brand statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}