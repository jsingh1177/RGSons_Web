package MJC.RGSons.repository;

import MJC.RGSons.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    
    // Find category by code
    Optional<Category> findByCode(String code);
    
    // Find categories by status
    List<Category> findByStatus(Boolean status);
    
    // Find active categories
    @Query("SELECT c FROM Category c WHERE c.status = true")
    List<Category> findActiveCategories();
    
    // Check if category code exists
    boolean existsByCode(String code);

    // Check if category name exists (case insensitive)
    boolean existsByNameIgnoreCase(String name);
    
    // Find categories by name containing (case insensitive)
    List<Category> findByNameContainingIgnoreCase(String name);
    
    // Count categories by status
    long countByStatus(Boolean status);
    
    // Count active categories
    @Query("SELECT COUNT(c) FROM Category c WHERE c.status = true")
    long countActiveCategories();
    
    // Find categories created after a certain date
    List<Category> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime date);
    
    // Find categories by multiple criteria
    @Query("SELECT c FROM Category c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', ?1, '%')) AND c.status = ?2")
    List<Category> findCategoriesByCriteria(String name, Boolean status);
}