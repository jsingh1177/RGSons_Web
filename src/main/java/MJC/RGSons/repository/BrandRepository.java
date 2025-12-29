package MJC.RGSons.repository;

import MJC.RGSons.model.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    
    // Find brand by code
    Optional<Brand> findByCode(String code);
    
    // Find brands by status
    List<Brand> findByStatus(Boolean status);
    
    // Find active brands
    @Query("SELECT b FROM Brand b WHERE b.status = true")
    List<Brand> findActiveBrands();
    
    // Check if brand code exists
    boolean existsByCode(String code);
    
    // Find brands by name containing (case insensitive)
    @Query("SELECT b FROM Brand b WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Brand> findByNameContainingIgnoreCase(@Param("name") String name);
    
    // Count brands by status
    @Query("SELECT COUNT(b) FROM Brand b WHERE b.status = :status")
    long countByStatus(@Param("status") Boolean status);
    
    // Count active brands
    @Query("SELECT COUNT(b) FROM Brand b WHERE b.status = true")
    long countActiveBrands();
    
    // Find brands created after a certain date
    @Query("SELECT b FROM Brand b WHERE b.createdAt >= :date ORDER BY b.createdAt DESC")
    List<Brand> findBrandsCreatedAfter(@Param("date") LocalDateTime date);
    
    // Find brands by multiple criteria
    @Query("SELECT b FROM Brand b WHERE " +
           "(:name IS NULL OR LOWER(b.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:status IS NULL OR b.status = :status)")
    List<Brand> findBrandsByCriteria(@Param("name") String name,
                                   @Param("status") Boolean status);
}