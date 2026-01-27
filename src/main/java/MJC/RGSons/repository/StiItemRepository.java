package MJC.RGSons.repository;

import MJC.RGSons.model.StiItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StiItemRepository extends JpaRepository<StiItem, Integer> {
    List<StiItem> findByStiNumber(String stiNumber);
    List<StiItem> findByToStoreAndStiDate(String toStore, String stiDate);
}
