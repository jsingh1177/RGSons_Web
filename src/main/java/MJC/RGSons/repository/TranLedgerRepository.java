package MJC.RGSons.repository;

import MJC.RGSons.model.TranLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranLedgerRepository extends JpaRepository<TranLedger, Long> {
    List<TranLedger> findByTranId(Long tranId);
}
