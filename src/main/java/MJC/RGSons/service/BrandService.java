package MJC.RGSons.service;

import MJC.RGSons.model.Brand;
import MJC.RGSons.repository.BrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BrandService {
    
    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;
    
    // Create a new brand
    public Brand createBrand(Brand brand) {
        // Generate Brand Code from Sequence
        brand.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        // Trim name
        brand.setName(brand.getName().trim());

        // Check if brand name already exists
        if (brandRepository.existsByNameIgnoreCase(brand.getName())) {
            throw new RuntimeException("Brand name already exists: " + brand.getName());
        }

        // Check if brand code already exists
        if (brandRepository.existsByCode(brand.getCode())) {
            throw new RuntimeException("Brand code already exists: " + brand.getCode());
        }
        
        // Set default values if not provided
        if (brand.getStatus() == null) {
            brand.setStatus(true);
        }
        
        brand.setCreatedAt(LocalDateTime.now());
        brand.setUpdateAt(LocalDateTime.now());
        
        return brandRepository.save(brand);
    }
    
    // Get all brands
    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }
    
    // Get brand by ID
    public Optional<Brand> getBrandById(Integer id) {
        return brandRepository.findById(id);
    }
    
    // Get brand by code
    public Optional<Brand> getBrandByCode(String code) {
        return brandRepository.findByCode(code);
    }
    
    // Get brands by status
    public List<Brand> getBrandsByStatus(Boolean status) {
        return brandRepository.findByStatus(status);
    }
    
    // Get active brands
    public List<Brand> getActiveBrands() {
        return brandRepository.findActiveBrands();
    }
    
    // Search brands by name
    public List<Brand> searchBrandsByName(String name) {
        return brandRepository.findByNameContainingIgnoreCase(name);
    }
    
    // Search brands by criteria
    public List<Brand> searchBrandsByCriteria(String name, Boolean status) {
        return brandRepository.findBrandsByCriteria(name, status);
    }
    
    // Update brand
    public Brand updateBrand(Integer id, Brand brandDetails) {
        Optional<Brand> optionalBrand = brandRepository.findById(id);
        if (optionalBrand.isPresent()) {
            Brand existingBrand = optionalBrand.get();
            
            // Trim name
            brandDetails.setName(brandDetails.getName().trim());

            // Check if brand name is being changed and if it already exists
            if (!existingBrand.getName().equalsIgnoreCase(brandDetails.getName()) &&
                brandRepository.existsByNameIgnoreCase(brandDetails.getName())) {
                throw new RuntimeException("Brand name already exists: " + brandDetails.getName());
            }
            
            // Update fields
            // Code is non-editable
            // existingBrand.setCode(brandDetails.getCode());
            existingBrand.setName(brandDetails.getName());
            existingBrand.setStatus(brandDetails.getStatus());
            existingBrand.setUpdateAt(LocalDateTime.now());
            
            return brandRepository.save(existingBrand);
        } else {
            throw new RuntimeException("Brand not found with id: " + id);
        }
    }
    
    // Delete brand
    public void deleteBrand(Integer id) {
        Optional<Brand> optionalBrand = brandRepository.findById(id);
        if (optionalBrand.isPresent()) {
            brandRepository.deleteById(id);
        } else {
            throw new RuntimeException("Brand not found with id: " + id);
        }
    }
    
    // Check if brand code exists
    public boolean brandCodeExists(String code) {
        return brandRepository.existsByCode(code);
    }
    
    // Count brands by status
    public long countBrandsByStatus(Boolean status) {
        return brandRepository.countByStatus(status);
    }
    
    // Count active brands
    public long countActiveBrands() {
        return brandRepository.countActiveBrands();
    }
    
    // Get total brand count
    public long getTotalBrandCount() {
        return brandRepository.count();
    }
    
    // Get brands created after date
    public List<Brand> getBrandsCreatedAfter(LocalDateTime date) {
        return brandRepository.findByCreatedAtAfterOrderByCreatedAtDesc(date);
    }
}