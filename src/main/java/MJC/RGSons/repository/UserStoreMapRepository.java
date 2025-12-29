package MJC.RGSons.repository;

import MJC.RGSons.model.UserStoreMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserStoreMapRepository extends JpaRepository<UserStoreMap, UserStoreMap.UserStoreMapId> {
    List<UserStoreMap> findByUserName(String userName);
}
