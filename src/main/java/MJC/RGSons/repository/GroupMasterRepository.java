package MJC.RGSons.repository;

import MJC.RGSons.model.GroupMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupMasterRepository extends JpaRepository<GroupMaster, Integer> {
    GroupMaster findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
}
