package MJC.RGSons.repository;

import MJC.RGSons.model.TranItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TranItemRepository extends JpaRepository<TranItem, String> {
    List<TranItem> findByInvoiceNo(String invoiceNo);
    List<TranItem> findByInvoiceNoIn(List<String> invoiceNos);
    List<TranItem> findByInvoiceDate(String invoiceDate);
    List<TranItem> findByStoreCodeAndInvoiceDate(String storeCode, String invoiceDate);
}
