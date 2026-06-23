package MJC.RGSons.repository;

import MJC.RGSons.model.PrLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PrLedgerRepository extends JpaRepository<PrLedger, Integer> {
    List<PrLedger> findByInvoiceNo(String invoiceNo);
    List<PrLedger> findByInvoiceNoAndTranDateAndStoreCode(String invoiceNo, LocalDate tranDate, String storeCode);
    void deleteByInvoiceNo(String invoiceNo);
}

