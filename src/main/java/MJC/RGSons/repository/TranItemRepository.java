package MJC.RGSons.repository;

import MJC.RGSons.model.TranItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TranItemRepository extends JpaRepository<TranItem, Integer> {
    List<TranItem> findByInvoiceNo(String invoiceNo);
    List<TranItem> findByInvoiceNoIn(List<String> invoiceNos);
    List<TranItem> findByInvoiceDate(String invoiceDate);
    List<TranItem> findByStoreCodeAndInvoiceDate(String storeCode, String invoiceDate);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM TranItem t WHERE t.invoiceNo = ?1")
    void deleteByInvoiceNo(String invoiceNo);

    @Modifying
    @Transactional
    @Query(value = "UPDATE tran_item SET tran_date = TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))) WHERE invoice_no = ?1", nativeQuery = true)
    int syncTranDateFromInvoiceNo(String invoiceNo);
}
