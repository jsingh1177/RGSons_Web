package MJC.RGSons.repository;

import MJC.RGSons.model.TranItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranItemRepository extends JpaRepository<TranItem, Long> {
    List<TranItem> findByInvoiceNo(String invoiceNo);
}
