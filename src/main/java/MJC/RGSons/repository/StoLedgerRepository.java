package MJC.RGSons.repository;

import MJC.RGSons.model.StoLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoLedgerRepository extends JpaRepository<StoLedger, Integer> {
    List<StoLedger> findByStoNumberOrderByIdAsc(String stoNumber);
    void deleteByStoNumber(String stoNumber);
}

