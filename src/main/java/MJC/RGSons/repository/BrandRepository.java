package MJC.RGSons.repository;

import MJC.RGSons.model.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Integer> {
    
    // Find brand by code
    Optional<Brand> findByCode(String code);
    
    // Find brands by status
    List<Brand> findByStatus(Boolean status);
    
    // Find active brands
    @Query("SELECT b FROM Brand b WHERE b.status = true")
    List<Brand> findActiveBrands();
    
    // Check if brand code exists
    boolean existsByCode(String code);

    // Check if brand name exists (case insensitive)
    boolean existsByNameIgnoreCase(String name);
    
    // Find brands by name containing (case insensitive)
    List<Brand> findByNameContainingIgnoreCase(String name);
    
    // Count brands by status
    long countByStatus(Boolean status);
    
    // Count active brands
    @Query("SELECT COUNT(b) FROM Brand b WHERE b.status = true")
    long countActiveBrands();
    
    // Find brands created after a certain date
    List<Brand> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime date);
    
    // Find brands by multiple criteria
    @Query("SELECT b FROM Brand b WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', ?1, '%')) AND b.status = ?2")
    List<Brand> findBrandsByCriteria(String name, Boolean status);
}