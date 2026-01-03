package MJC.RGSons.repository;

import MJC.RGSons.model.PriceMaster;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceMasterRepository extends MongoRepository<PriceMaster, String> {
    List<PriceMaster> findByItemCode(String itemCode);
    Optional<PriceMaster> findByItemCodeAndSizeCode(String itemCode, String sizeCode);
}
