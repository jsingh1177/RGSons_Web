package MJC.RGSons.repository;

import MJC.RGSons.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    
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
    @Query("SELECT c FROM Category c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Category> findByNameContainingIgnoreCase(@Param("name") String name);
    
    // Count categories by status
    @Query("SELECT COUNT(c) FROM Category c WHERE c.status = :status")
    long countByStatus(@Param("status") Boolean status);
    
    // Count active categories
    @Query("SELECT COUNT(c) FROM Category c WHERE c.status = true")
    long countActiveCategories();
    
    // Find categories created after a certain date
    @Query("SELECT c FROM Category c WHERE c.createdAt >= :date ORDER BY c.createdAt DESC")
    List<Category> findCategoriesCreatedAfter(@Param("date") LocalDateTime date);
    
    // Find categories by multiple criteria
    @Query("SELECT c FROM Category c WHERE " +
           "(:name IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:status IS NULL OR c.status = :status)")
    List<Category> findCategoriesByCriteria(@Param("name") String name,
                                          @Param("status") Boolean status);

    @Query(value = "SELECT NEXT VALUE FOR dbo.Master_SEQ", nativeQuery = true)
    Long getNextSequenceValue();
}