package MJC.RGSons.repository;

import MJC.RGSons.model.LedgerMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LedgerMapRepository extends JpaRepository<LedgerMap, Integer> {
}

