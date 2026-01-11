package MJC.RGSons.repository;

import MJC.RGSons.model.DSRHead;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DSRHeadRepository extends MongoRepository<DSRHead, String> {
    Optional<DSRHead> findByStoreCodeAndDsrDate(String storeCode, String dsrDate);
}
