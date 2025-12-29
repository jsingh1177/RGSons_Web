package MJC.RGSons.repository;

import MJC.RGSons.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    
    // Find store by store code
    Optional<Store> findByStoreCode(String storeCode);
    
    // Find stores by status
    List<Store> findByStatus(Boolean status);
    
    // Find stores by list of store codes
    List<Store> findByStoreCodeIn(List<String> storeCodes);

    // Custom query to search stores
    @Query("SELECT s FROM Store s WHERE s.status = true")
    List<Store> findActiveStores();
    
    // Find stores by city
    List<Store> findByCity(String city);
    
    // Find stores by zone
    List<Store> findByZone(String zone);
    
    // Find stores by district
    List<Store> findByDistrict(String district);
    
    // Find stores by area
    List<Store> findByArea(String area);
    
    // Check if store code exists
    boolean existsByStoreCode(String storeCode);
    
    // Find stores by store name containing (case insensitive)
    @Query("SELECT s FROM Store s WHERE LOWER(s.storeName) LIKE LOWER(CONCAT('%', :storeName, '%'))")
    List<Store> findByStoreNameContainingIgnoreCase(@Param("storeName") String storeName);
    
    // Find stores by multiple criteria
    @Query("SELECT s FROM Store s WHERE " +
           "(:city IS NULL OR s.city = :city) AND " +
           "(:zone IS NULL OR s.zone = :zone) AND " +
           "(:district IS NULL OR s.district = :district) AND " +
           "(:status IS NULL OR s.status = :status)")
    List<Store> findStoresByCriteria(@Param("city") String city,
                                   @Param("zone") String zone,
                                   @Param("district") String district,
                                   @Param("status") Boolean status);
    
    // Count stores by status
    long countByStatus(Boolean status);
    
    // Count active stores
    @Query("SELECT COUNT(s) FROM Store s WHERE s.status = true")
    long countActiveStores();
}