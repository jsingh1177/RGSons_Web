package MJC.RGSons.repository;

import MJC.RGSons.model.TranLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranLedgerRepository extends JpaRepository<TranLedger, Integer> {
    List<TranLedger> findByTranId(Integer tranId);
    List<TranLedger> findByStoreCodeAndInvoiceDate(String storeCode, String invoiceDate);
    List<TranLedger> findByInvoiceNo(String invoiceNo);
}
