package MJC.RGSons.repository;

import MJC.RGSons.model.TranLedger;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranLedgerRepository extends MongoRepository<TranLedger, String> {
    List<TranLedger> findByTranId(String tranId);
}
