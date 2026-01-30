package MJC.RGSons.repository;

import MJC.RGSons.model.InventoryMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface InventoryMasterRepository extends JpaRepository<InventoryMaster, Integer> {
    List<InventoryMaster> findByItemCode(String itemCode);
    Optional<InventoryMaster> findByItemCodeAndSizeCode(String itemCode, String sizeCode);
    Optional<InventoryMaster> findByStoreCodeAndItemCodeAndSizeCode(String storeCode, String itemCode, String sizeCode);
    List<InventoryMaster> findByStoreCodeAndItemCode(String storeCode, String itemCode);
    List<InventoryMaster> findByStoreCode(String storeCode);

    @Query("SELECT DISTINCT i.itemCode, i.itemName FROM InventoryMaster i WHERE (i.storeCode = :storeCode OR (:storeCode = 'HO' AND i.storeCode = 'Head Office')) AND i.closing > 0 AND (LOWER(i.itemName) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(i.itemCode) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Object[]> searchAvailableItems(@Param("storeCode") String storeCode, @Param("query") String query);
}
