package MJC.RGSons.repository;

import MJC.RGSons.model.PrItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PrItemRepository extends JpaRepository<PrItem, Integer> {
    List<PrItem> findByInvoiceNoOrderByIdAsc(String invoiceNo);
    List<PrItem> findByInvoiceNoAndTranDateAndStoreCodeOrderByIdAsc(String invoiceNo, LocalDate tranDate, String storeCode);
    List<PrItem> findByInvoiceNo(String invoiceNo);
    void deleteByInvoiceNo(String invoiceNo);
}

