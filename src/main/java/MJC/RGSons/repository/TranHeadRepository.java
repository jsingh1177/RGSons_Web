package MJC.RGSons.repository;

import MJC.RGSons.model.TranHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TranHeadRepository extends JpaRepository<TranHead, Long> {
    TranHead findByInvoiceNo(String invoiceNo);
}
