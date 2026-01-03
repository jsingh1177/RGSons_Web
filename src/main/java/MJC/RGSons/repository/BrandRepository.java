package MJC.RGSons.repository;

import MJC.RGSons.model.Brand;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends MongoRepository<Brand, String> {
    
    // Find brand by code
    Optional<Brand> findByCode(String code);
    
    // Find brands by status
    List<Brand> findByStatus(Boolean status);
    
    // Find active brands
    @Query("{ 'status' : true }")
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
    @Query(value = "{ 'status' : true }", count = true)
    long countActiveBrands();
    
    // Find brands created after a certain date
    List<Brand> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime date);
    
    // Find brands by multiple criteria - implemented via custom or dynamic query if needed, 
    // but for simple cases we can use query methods or @Query
    @Query("{ $and: [ { 'name': { $regex: ?0, $options: 'i' } }, { 'status': ?1 } ] }")
    List<Brand> findBrandsByCriteria(String name, Boolean status);
}