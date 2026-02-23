package MJC.RGSons.repository;

import MJC.RGSons.model.Ledger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerRepository extends JpaRepository<Ledger, Integer> {
    Optional<Ledger> findByCode(String code);
    List<Ledger> findByScreen(String screen);
    List<Ledger> findByType(String type);
    List<Ledger> findByTypeAndScreenAndStatus(String type, String screen, Integer status);
    boolean existsByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    @Query("SELECT DISTINCT l.type FROM Ledger l WHERE l.type IS NOT NULL AND l.type <> ''")
    List<String> findDistinctTypes();
    @Query("SELECT DISTINCT l.screen FROM Ledger l WHERE l.screen IS NOT NULL AND l.screen <> ''")
    List<String> findDistinctScreens();
}
