package MJC.RGSons.repository;

import MJC.RGSons.model.UserStoreMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserStoreMapRepository extends JpaRepository<UserStoreMap, Integer> {
    List<UserStoreMap> findByUserName(String userName);
    boolean existsByUserNameAndStoreCode(String userName, String storeCode);
    boolean existsByUserName(String userName);

    @Modifying
    @Transactional
    @Query("delete from UserStoreMap u where u.userName = ?1")
    int deleteAllByUserName(String userName);
}
