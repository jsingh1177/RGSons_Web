package MJC.RGSons.repository;

import MJC.RGSons.model.StoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoItemRepository extends JpaRepository<StoItem, Integer> {
    List<StoItem> findByStoNumber(String stoNumber);
    List<StoItem> findByFromStoreAndStoDate(String fromStore, String stoDate);
}
