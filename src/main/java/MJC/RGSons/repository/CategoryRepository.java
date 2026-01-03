package MJC.RGSons.repository;

import MJC.RGSons.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends MongoRepository<Category, String> {
    
    // Find category by code
    Optional<Category> findByCode(String code);
    
    // Find categories by status
    List<Category> findByStatus(Boolean status);
    
    // Find active categories
    @Query("{ 'status' : true }")
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
    @Query(value = "{ 'status' : true }", count = true)
    long countActiveCategories();
    
    // Find categories created after a certain date
    List<Category> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime date);
    
    // Find categories by multiple criteria
    @Query("{ $and: [ { 'name': { $regex: ?0, $options: 'i' } }, { 'status': ?1 } ] }")
    List<Category> findCategoriesByCriteria(String name, Boolean status);
}