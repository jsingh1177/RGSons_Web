package MJC.RGSons.controller;

import MJC.RGSons.model.Category;
import MJC.RGSons.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class CategoryController {
    
    @Autowired
    private CategoryService categoryService;
    
    // Create a new category
    @PostMapping
    public ResponseEntity<Map<String, Object>> createCategory(@RequestBody Category category) {
        Map<String, Object> response = new HashMap<>();
        try {
            Category createdCategory = categoryService.createCategory(category);
            response.put("success", true);
            response.put("message", "Category created successfully");
            response.put("category", createdCategory);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Get all categories
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllCategories() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Category> categories = categoryService.getAllCategories();
            response.put("success", true);
            response.put("message", "Categories retrieved successfully");
            response.put("categories", categories);
            response.put("count", categories.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving categories: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get category by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCategoryById(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Category> category = categoryService.getCategoryById(id);
            if (category.isPresent()) {
                response.put("success", true);
                response.put("message", "Category found");
                response.put("category", category.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Category not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving category: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get category by code
    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getCategoryByCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Category> category = categoryService.getCategoryByCode(code);
            if (category.isPresent()) {
                response.put("success", true);
                response.put("message", "Category found");
                response.put("category", category.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Category not found with code: " + code);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving category: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get categories by status
    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getCategoriesByStatus(@PathVariable Boolean status) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Category> categories = categoryService.getCategoriesByStatus(status);
            response.put("success", true);
            response.put("message", "Categories retrieved successfully");
            response.put("categories", categories);
            response.put("count", categories.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving categories: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get active categories
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveCategories() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Category> categories = categoryService.getActiveCategories();
            response.put("success", true);
            response.put("message", "Active categories retrieved successfully");
            response.put("categories", categories);
            response.put("count", categories.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving active categories: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Search categories by name
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchCategoriesByName(@RequestParam String name) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Category> categories = categoryService.searchCategoriesByName(name);
            response.put("success", true);
            response.put("message", "Categories search completed");
            response.put("categories", categories);
            response.put("count", categories.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching categories: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update category
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateCategory(@PathVariable Integer id, @RequestBody Category categoryDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Category updatedCategory = categoryService.updateCategory(id, categoryDetails);
            response.put("success", true);
            response.put("message", "Category updated successfully");
            response.put("category", updatedCategory);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    // Delete category
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            categoryService.deleteCategory(id);
            response.put("success", true);
            response.put("message", "Category deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    // Check if category code exists
    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkCategoryCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = categoryService.categoryCodeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Category code exists" : "Category code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking category code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get category statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getCategoryStats() {
        Map<String, Object> response = new HashMap<>();
        try {
            long totalCategories = categoryService.getTotalCategoryCount();
            long activeCategories = categoryService.countActiveCategories();
            long inactiveCategories = categoryService.countCategoriesByStatus(false);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", totalCategories);
            stats.put("active", activeCategories);
            stats.put("inactive", inactiveCategories);
            
            response.put("success", true);
            response.put("message", "Category statistics retrieved successfully");
            response.put("stats", stats);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving category statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}