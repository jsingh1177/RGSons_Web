package MJC.RGSons.repository;

import MJC.RGSons.model.PurItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurItemRepository extends JpaRepository<PurItem, Integer> {
    List<PurItem> findByInvoiceNo(String invoiceNo);
    List<PurItem> findByStoreCode(String storeCode);
}
