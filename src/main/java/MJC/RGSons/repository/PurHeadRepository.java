package MJC.RGSons.repository;

import MJC.RGSons.model.PurHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurHeadRepository extends JpaRepository<PurHead, Integer> {
    List<PurHead> findByStoreCode(String storeCode);
    List<PurHead> findByStoreCodeAndInvoiceDate(String storeCode, String invoiceDate);
    List<PurHead> findByInvoiceDateBetween(String startDate, String endDate);
    List<PurHead> findByStatus(String status);
    List<PurHead> findByStatusAndTallySync(String status, String tallySync);
    PurHead findByInvoiceNo(String invoiceNo);
    Optional<PurHead> findTopByInvoiceNoOrderByIdDesc(String invoiceNo);
    Optional<PurHead> findTopByInvoiceNoAndStatusOrderByIdDesc(String invoiceNo, String status);
    boolean existsByPartyCode(String partyCode);
    boolean existsByPurLed(String purLed);

    @Modifying
    @Transactional
    @Query(value = "UPDATE pur_head SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))) WHERE invoice_no = ?1", nativeQuery = true)
    int syncTranDateFromInvoiceNo(String invoiceNo);
}
