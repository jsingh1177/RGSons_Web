package MJC.RGSons.repository;

import MJC.RGSons.model.PurLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PurLedgerRepository extends JpaRepository<PurLedger, Integer> {
    List<PurLedger> findByInvoiceNo(String invoiceNo);
    List<PurLedger> findByInvoiceNoAndInvoiceDateAndStoreCode(String invoiceNo, String invoiceDate, String storeCode);
    List<PurLedger> findByStoreCode(String storeCode);
    boolean existsByLedgerCode(String ledgerCode);
    void deleteByInvoiceNo(String invoiceNo);

    @Modifying
    @Transactional
    @Query(value = "UPDATE pur_ledgers SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))) WHERE invoice_no = ?1", nativeQuery = true)
    int syncTranDateFromInvoiceNo(String invoiceNo);
}
