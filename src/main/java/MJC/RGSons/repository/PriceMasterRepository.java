package MJC.RGSons.repository;

import MJC.RGSons.model.PriceMaster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceMasterRepository extends JpaRepository<PriceMaster, Integer> {
    List<PriceMaster> findByItemCode(String itemCode);
    Optional<PriceMaster> findByItemCodeAndSizeCode(String itemCode, String sizeCode);
    
    Page<PriceMaster> findByItemNameContainingIgnoreCaseOrItemCodeContainingIgnoreCase(String itemName, String itemCode, Pageable pageable);
    
    boolean existsBySizeCode(String sizeCode);
}
