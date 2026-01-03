package MJC.RGSons.repository;

import MJC.RGSons.model.TranItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranItemRepository extends MongoRepository<TranItem, String> {
    List<TranItem> findByInvoiceNo(String invoiceNo);
}
