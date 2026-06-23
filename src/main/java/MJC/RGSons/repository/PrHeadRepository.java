package MJC.RGSons.repository;

import MJC.RGSons.model.PrHead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrHeadRepository extends JpaRepository<PrHead, Integer> {
    List<PrHead> findByStatus(String status);
    List<PrHead> findByStatusAndTallySync(String status, Boolean tallySync);
    Optional<PrHead> findTopByInvoiceNoOrderByIdDesc(String invoiceNo);
    Optional<PrHead> findTopByInvoiceNoAndStatusOrderByIdDesc(String invoiceNo, String status);
    boolean existsByPartyCode(String partyCode);
    boolean existsByPurLed(String purLed);
}

