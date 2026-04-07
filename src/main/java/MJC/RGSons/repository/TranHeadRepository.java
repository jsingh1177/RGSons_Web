package MJC.RGSons.repository;

import MJC.RGSons.model.TranHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface TranHeadRepository extends JpaRepository<TranHead, Integer> {
    @Query("SELECT t FROM TranHead t WHERE t.invoiceNo = ?1")
    java.util.Optional<TranHead> findByInvoiceNo(String invoiceNo);
    java.util.List<TranHead> findByInvoiceDateIn(java.util.List<String> invoiceDates);
    java.util.List<TranHead> findByPartyCode(String partyCode);
    boolean existsByPartyCode(String partyCode);
    boolean existsByStoreCode(String storeCode);
    
    @Query(value = "SELECT MAX(CAST(invoice_no AS BIGINT)) FROM tran_head WHERE invoice_no NOT LIKE '%[^0-9]%'", nativeQuery = true)
    Long findMaxInvoiceNo();

    java.util.List<TranHead> findByStoreCodeAndStatus(String storeCode, String status);

    java.util.List<TranHead> findByStoreCodeAndInvoiceDate(String storeCode, String invoiceDate);

    @Modifying
    @Transactional
    @Query(value = "UPDATE tran_head SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))) WHERE id = ?1", nativeQuery = true)
    int syncTranDateFromInvoiceDate(Integer id);

    @Modifying
    @Transactional
    @Query(value = "UPDATE tran_head SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))) WHERE invoice_no = ?1", nativeQuery = true)
    int syncTranDateFromInvoiceNo(String invoiceNo);
}
