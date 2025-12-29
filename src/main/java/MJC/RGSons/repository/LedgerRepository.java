package MJC.RGSons.repository;

import MJC.RGSons.model.Ledger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerRepository extends JpaRepository<Ledger, Long> {
    Optional<Ledger> findByCode(String code);
    List<Ledger> findByScreen(String screen);
    List<Ledger> findByType(String type);
    List<Ledger> findByTypeAndScreenAndStatus(String type, String screen, Integer status);
}
