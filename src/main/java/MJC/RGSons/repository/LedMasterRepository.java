package MJC.RGSons.repository;

import MJC.RGSons.model.LedMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedMasterRepository extends JpaRepository<LedMaster, Integer> {
    LedMaster findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    List<LedMaster> findByGroupCodeIn(List<String> groupCodes);
}
