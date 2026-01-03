package MJC.RGSons.repository;

import MJC.RGSons.model.UserStoreMap;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserStoreMapRepository extends MongoRepository<UserStoreMap, String> {
    List<UserStoreMap> findByUserName(String userName);
    boolean existsByUserNameAndStoreCode(String userName, String storeCode);
}
