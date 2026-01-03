package MJC.RGSons.repository;

import MJC.RGSons.model.TenderType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TenderTypeRepository extends MongoRepository<TenderType, String> {
    Optional<TenderType> findByTenderCode(String tenderCode);
    List<TenderType> findByStatus(Boolean status);
}
