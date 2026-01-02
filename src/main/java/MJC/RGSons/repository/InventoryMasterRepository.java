package MJC.RGSons.repository;

import MJC.RGSons.model.InventoryMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryMasterRepository extends JpaRepository<InventoryMaster, Long> {
    List<InventoryMaster> findByItemCode(String itemCode);
    Optional<InventoryMaster> findByItemCodeAndSizeCode(String itemCode, String sizeCode);
    Optional<InventoryMaster> findByStoreCodeAndItemCodeAndSizeCode(String storeCode, String itemCode, String sizeCode);
}
