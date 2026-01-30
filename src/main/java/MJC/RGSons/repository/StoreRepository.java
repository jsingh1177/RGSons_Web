package MJC.RGSons.repository;

import MJC.RGSons.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<Store, Integer> {
    
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

    // Find store by store name (case insensitive)
    Optional<Store> findByStoreNameIgnoreCase(String storeName);
    
    // Find stores by store name containing (case insensitive)
    List<Store> findByStoreNameContainingIgnoreCase(String storeName);
    
    // Count stores by status
    long countByStatus(Boolean status);
    
    // Count active stores
    @Query("SELECT COUNT(s) FROM Store s WHERE s.status = true")
    long countActiveStores();
}