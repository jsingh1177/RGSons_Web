package MJC.RGSons.repository;

import MJC.RGSons.model.PurHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurHeadRepository extends JpaRepository<PurHead, Integer> {
    List<PurHead> findByStoreCode(String storeCode);
    List<PurHead> findByInvoiceDateBetween(String startDate, String endDate);
    List<PurHead> findByStatus(String status);
    PurHead findByInvoiceNo(String invoiceNo);
    boolean existsByPartyCode(String partyCode);
    boolean existsByPurLed(String purLed);
}
