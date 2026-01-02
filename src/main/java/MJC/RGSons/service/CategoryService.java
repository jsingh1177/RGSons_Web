package MJC.RGSons.service;

import MJC.RGSons.model.Category;
import MJC.RGSons.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    // Create a new category
    public Category createCategory(Category category) {
        // Generate Category Code from Master_SEQ
        Long seqValue = categoryRepository.getNextSequenceValue();
        category.setCode(String.valueOf(seqValue));

        // Trim name
        category.setName(category.getName().trim());

        // Check if category name already exists
        if (categoryRepository.existsByNameIgnoreCase(category.getName())) {
            throw new RuntimeException("Category name already exists: " + category.getName());
        }

        // Check if category code already exists
        if (categoryRepository.existsByCode(category.getCode())) {
            throw new RuntimeException("Category code already exists: " + category.getCode());
        }
        
        // Set default values if not provided
        if (category.getStatus() == null) {
            category.setStatus(true);
        }
        
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdateAt(LocalDateTime.now());
        
        return categoryRepository.save(category);
    }
    
    // Get all categories
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }
    
    // Get category by ID
    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }
    
    // Get category by code
    public Optional<Category> getCategoryByCode(String code) {
        return categoryRepository.findByCode(code);
    }
    
    // Get categories by status
    public List<Category> getCategoriesByStatus(Boolean status) {
        return categoryRepository.findByStatus(status);
    }
    
    // Get active categories
    public List<Category> getActiveCategories() {
        return categoryRepository.findActiveCategories();
    }
    
    // Search categories by name
    public List<Category> searchCategoriesByName(String name) {
        return categoryRepository.findByNameContainingIgnoreCase(name);
    }
    
    // Search categories by criteria
    public List<Category> searchCategoriesByCriteria(String name, Boolean status) {
        return categoryRepository.findCategoriesByCriteria(name, status);
    }
    
    // Update category
    public Category updateCategory(Long id, Category categoryDetails) {
        Optional<Category> optionalCategory = categoryRepository.findById(id);
        if (optionalCategory.isPresent()) {
            Category existingCategory = optionalCategory.get();

            // Trim name
            categoryDetails.setName(categoryDetails.getName().trim());
            
            // Check if category name is being changed and if it already exists
            if (!existingCategory.getName().equalsIgnoreCase(categoryDetails.getName()) &&
                categoryRepository.existsByNameIgnoreCase(categoryDetails.getName())) {
                throw new RuntimeException("Category name already exists: " + categoryDetails.getName());
            }
            
            // Update fields
            // Code is non-editable
            // existingCategory.setCode(categoryDetails.getCode());
            existingCategory.setName(categoryDetails.getName());
            existingCategory.setStatus(categoryDetails.getStatus());
            existingCategory.setUpdateAt(LocalDateTime.now());
            
            return categoryRepository.save(existingCategory);
        } else {
            throw new RuntimeException("Category not found with id: " + id);
        }
    }
    
    // Delete category
    public void deleteCategory(Long id) {
        Optional<Category> optionalCategory = categoryRepository.findById(id);
        if (optionalCategory.isPresent()) {
            categoryRepository.deleteById(id);
        } else {
            throw new RuntimeException("Category not found with id: " + id);
        }
    }
    
    // Check if category code exists
    public boolean categoryCodeExists(String code) {
        return categoryRepository.existsByCode(code);
    }
    
    // Count categories by status
    public long countCategoriesByStatus(Boolean status) {
        return categoryRepository.countByStatus(status);
    }
    
    // Count active categories
    public long countActiveCategories() {
        return categoryRepository.countActiveCategories();
    }
    
    // Get total category count
    public long getTotalCategoryCount() {
        return categoryRepository.count();
    }
    
    // Get categories created after date
    public List<Category> getCategoriesCreatedAfter(LocalDateTime date) {
        return categoryRepository.findCategoriesCreatedAfter(date);
    }
}