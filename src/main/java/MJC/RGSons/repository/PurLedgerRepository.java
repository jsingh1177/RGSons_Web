package MJC.RGSons.repository;

import MJC.RGSons.model.PurLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurLedgerRepository extends JpaRepository<PurLedger, Integer> {
    List<PurLedger> findByInvoiceNo(String invoiceNo);
    List<PurLedger> findByStoreCode(String storeCode);
}

