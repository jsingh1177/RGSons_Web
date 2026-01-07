package MJC.RGSons.repository;

import MJC.RGSons.model.StateMaster;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StateMasterRepository extends MongoRepository<StateMaster, String> {
    Optional<StateMaster> findByCode(String code);
    boolean existsByCode(String code);
}
