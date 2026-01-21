package MJC.RGSons.repository;

import MJC.RGSons.model.DSR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DSRRepository extends JpaRepository<DSR, String> {
    List<DSR> findByStoreAndBusinessDate(String store, String businessDate);
    
    java.util.Optional<DSR> findByStoreAndBusinessDateAndItemCodeAndSizeCode(String store, String businessDate, String itemCode, String sizeCode);
}
