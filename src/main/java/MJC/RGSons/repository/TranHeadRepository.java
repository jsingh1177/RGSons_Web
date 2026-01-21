package MJC.RGSons.repository;

import MJC.RGSons.model.TranHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TranHeadRepository extends JpaRepository<TranHead, String> {
    TranHead findByInvoiceNo(String invoiceNo);
    java.util.List<TranHead> findByInvoiceDateIn(java.util.List<String> invoiceDates);
}
