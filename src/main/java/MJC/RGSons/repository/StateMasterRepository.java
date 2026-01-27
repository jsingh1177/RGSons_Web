package MJC.RGSons.repository;

import MJC.RGSons.model.StateMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StateMasterRepository extends JpaRepository<StateMaster, Integer> {
    Optional<StateMaster> findByCode(String code);
    boolean existsByCode(String code);
}
