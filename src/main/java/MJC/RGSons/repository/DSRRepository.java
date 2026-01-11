package MJC.RGSons.repository;

import MJC.RGSons.model.DSR;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DSRRepository extends MongoRepository<DSR, String> {
    List<DSR> findByStoreAndBusinessDate(String store, String businessDate);
    
    java.util.Optional<DSR> findByStoreAndBusinessDateAndItemCodeAndSizeCode(String store, String businessDate, String itemCode, String sizeCode);
}
