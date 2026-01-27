package MJC.RGSons.repository;

import MJC.RGSons.model.TranHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TranHeadRepository extends JpaRepository<TranHead, Integer> {
    TranHead findByInvoiceNo(String invoiceNo);
    java.util.List<TranHead> findByInvoiceDateIn(java.util.List<String> invoiceDates);
    java.util.List<TranHead> findByPartyCode(String partyCode);
    
    @org.springframework.data.jpa.repository.Query(value = "SELECT MAX(CAST(invoice_no AS BIGINT)) FROM tran_head WHERE invoice_no NOT LIKE '%[^0-9]%'", nativeQuery = true)
    Long findMaxInvoiceNo();
}
